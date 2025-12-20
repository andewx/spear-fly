/**
 * Scenario environment
 * Defines simulation grid, platforms, and environmental conditions
 */
import { SAMSystem } from './SAMSystem.js';
import { Fighter } from './Fighter.js';
import * as storage from '../services/fileStorage.js';
// Factory Method for TMissile Creation
function createMissile(position, velocity, heading, launchedBy, timeOfLaunch, target, maxRange) {
    return {
        position,
        velocity,
        heading,
        status: 'active',
        launchedBy,
        timeOfLaunch,
        timeOfImpact: 0,
        target,
        maxRange
    };
}
const MAX_SIMULATION_TIME = 600; // seconds
export class Scenario {
    id;
    timeStep;
    timeElapsed = 0;
    scenario;
    samSystem;
    fighter;
    missiles = [];
    isEngagementComplete = false;
    /**
     * Private constructor - use static create() method instead
     * This enforces async initialization through the factory pattern
     */
    constructor(scenario, samSystem, fighter, timeStep) {
        this.id = scenario.id;
        this.scenario = scenario;
        this.timeStep = timeStep ?? scenario.timeStep;
        this.samSystem = samSystem;
        this.fighter = fighter;
    }
    /**
     * Static factory method for async initialization
     * Use this instead of constructor: const scenario = await Scenario.create(...)
     */
    static async create(scenario, timeStep) {
        // Load platform configurations asynchronously
        const fighterPlatform = await storage.loadFighterPlatform(scenario.platforms.fighter.configId);
        const samPlatform = await storage.loadSAMPlatform(scenario.platforms.sam.configId);
        if (!fighterPlatform) {
            throw new Error(`Fighter platform config not found: ${scenario.platforms.fighter.configId}`);
        }
        if (!samPlatform) {
            throw new Error(`SAM system config not found: ${scenario.platforms.sam.configId}`);
        }
        // Create platform instances with scenario-specific position and heading
        const fighter = new Fighter(fighterPlatform, scenario.platforms.fighter.position, scenario.platforms.fighter.heading);
        const samSystem = new SAMSystem(samPlatform, scenario);
        await samSystem.radar.loadITUData();
        await samSystem.initPrecipitationField(scenario);
        // Set SAM position from scenario
        samSystem.position = scenario.platforms.sam.position;
        // Return fully initialized Scenario
        return new Scenario(scenario, samSystem, fighter, timeStep);
    }
    engagementComplete() {
        return this.isEngagementComplete;
    }
    /*
     * timeStep - advance scenario by time step and update platform states
    */
    advanceSimulationTimeStep() {
        this.timeElapsed += this.timeStep;
        // Calculate current engagement parameters - we will need to refactor this later
        const distance = this.getDistanceSAMToFighter();
        const isDetected = this.isFighterDetected(true);
        const azimuth = this.getAzimuthSAMToFighter();
        if (isDetected) {
            this.samSystem.trackingStatus.status = 'tracking';
            this.samSystem.trackingStatus.timeElapsedTracking += this.timeStep;
        }
        else {
            this.samSystem.trackingStatus.status = 'not_tracking';
            this.samSystem.trackingStatus.timeElapsedTracking = 0;
        }
        // ============================================================================
        // SAM Detection and Missile Launch Logic
        // ============================================================================
        if (isDetected && this.samSystem.state === 'active') {
            if (this.isFighterWithinMEMR() && this.samSystem.status.missilesRemaining > 0) {
                if (this.timeElapsed - this.samSystem.status.lastLaunchTime >= this.samSystem.launchIntervalSec) {
                    const speedOfSound = 343; // m/s
                    const missileVelocityKmS = (this.samSystem.missileVelocity * speedOfSound) / 1000;
                    this.missiles.push(createMissile(this.samSystem.position, missileVelocityKmS, azimuth, 'sam', this.timeElapsed, this.fighter, this.samSystem.properties.memr));
                    this.samSystem.status.missilesRemaining--;
                    this.samSystem.status.lastLaunchTime = this.timeElapsed;
                }
            }
        }
        // ============================================================================
        // HARM Launch Logic
        // ============================================================================
        if (this.shouldFighterLaunchHARM() && this.fighter.missilesRemaining > 0) {
            // Fighter launches HARM (only one HARM for now)
            const speedOfSound = 343; // m/s
            const harmVelocityKmS = (this.fighter.harmVelocity * speedOfSound) / 1000;
            const angleToSAM = Math.atan2(this.scenario.platforms.sam.position.y - this.fighter.position.y, this.scenario.platforms.sam.position.x - this.fighter.position.x) * 180 / Math.PI;
            this.missiles.push(createMissile(this.fighter.position, harmVelocityKmS, angleToSAM, 'fighter', this.timeElapsed, this.samSystem, this.fighter.harmRange));
            this.fighter.missilesRemaining--;
        }
        // ============================================================================
        // Update Missile Tracking Statuses
        // ============================================================================
        const anglePerturbationRad = (Math.PI / 180) * 5; // 2 degree max perturbation
        for (const missile of this.missiles) {
            if (missile.status === 'active') {
                if (this.samSystem.trackingStatus.status !== 'tracking') {
                    missile.heading += (Math.random() * 2 - 1) * anglePerturbationRad * (180 / Math.PI);
                }
                else {
                    // Adjust heading toward target but with a maximum 30G turn rate maneuver
                    const dx = missile.target.position.x - missile.position.x;
                    const dy = missile.target.position.y - missile.position.y;
                    const desiredHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
                    let headingDiff = desiredHeading - missile.heading;
                    // Derive basic kinematics for turn rate limit all velocities in objects are in mach
                    let headingDiffRad = (headingDiff * Math.PI) / 180;
                    let velMetersPerSec = missile.velocity * 343; // km/s to m/s
                    const maxGForce = 9.8 * 30; // 30G
                    const maxTurnRate = maxGForce / velMetersPerSec; // radians per second
                    if (Math.abs(headingDiffRad) > maxTurnRate * this.timeStep) {
                        missile.heading += (maxTurnRate * this.timeStep) * (headingDiffRad > 0 ? 1 : -1) * (180 / Math.PI);
                    }
                    else {
                        missile.heading = desiredHeading;
                    }
                }
            }
        }
        // ============================================================================
        // Update Missile Positions
        // ============================================================================
        for (const missile of this.missiles) {
            if (missile.status === 'active') {
                const headingRad = (missile.heading * Math.PI) / 180;
                missile.position.x += missile.velocity * Math.cos(headingRad) * this.timeStep;
                missile.position.y += missile.velocity * Math.sin(headingRad) * this.timeStep;
            }
        }
        // ===========================================================================
        // Evasive Maneuevers - Update Fighter Heading Max G 6.0
        // ===========================================================================
        if (this.fighter.maneuvers === 'evasive') {
            const maxGForce = 9.8 * 6; // 6G
            const velMetersPerSec = this.fighter.velocity * 343; // km/s to m/s
            const maxTurnRate = maxGForce / velMetersPerSec; // radians per second
            const angleToSAMRad = Math.atan2(this.scenario.platforms.sam.position.y - this.fighter.position.y, this.scenario.platforms.sam.position.x - this.fighter.position.x);
            const desiredHeadingRad = angleToSAMRad + Math.PI / 2; // Perpendicular to SAM
            let headingDiffRad = desiredHeadingRad - (this.fighter.heading * Math.PI / 180);
            // Normalize angle difference to [-PI, PI]
            headingDiffRad = Math.atan2(Math.sin(headingDiffRad), Math.cos(headingDiffRad));
            if (Math.abs(headingDiffRad) > maxTurnRate * this.timeStep) {
                this.fighter.heading += (maxTurnRate * this.timeStep) * (headingDiffRad > 0 ? 1 : -1) * (180 / Math.PI);
            }
            else {
                this.fighter.heading += headingDiffRad * (180 / Math.PI);
            }
        }
        else {
            // Maintain current heading
        }
        // Update fighter position
        if (this.fighter.state === 'active') {
            this.updateFighterPosition();
        }
        // ============================================================================
        // Evaluate Kill Criteria
        // ============================================================================
        let simulationComplete = false;
        for (const missile of this.missiles) {
            if (missile.status === 'active') {
                const previousPosition = { ...missile.position };
                const targetPosition = missile.target.position;
                const intercepted = this.checkMissileIntercept(missile, targetPosition, previousPosition);
                if (intercepted) {
                    missile.status = 'kill';
                    missile.timeOfImpact = this.timeElapsed;
                    if (missile.launchedBy === 'sam') {
                        //coerce target to Fighter type
                        missile.target.state = 'destroyed';
                        simulationComplete = true;
                    }
                    else if (missile.launchedBy === 'fighter') {
                        missile.target.state = 'destroyed';
                        simulationComplete = true;
                    }
                }
                else {
                    // Check if missile has exceeded max range
                    const distanceTraveled = missile.velocity * (this.timeElapsed - missile.timeOfLaunch);
                    if (missile.maxRange && distanceTraveled >= missile.maxRange) {
                        missile.status = 'missed';
                    }
                }
            }
        }
        // ============================================================================
        // Check that all missiles expended and either kills or missies
        //=============================================================================
        for (const missile of this.missiles) {
            if (missile.status === 'active') {
                simulationComplete = false;
                break;
            }
            else {
                simulationComplete = true;
            }
        }
        // Cap simulation time
        if (this.timeElapsed >= MAX_SIMULATION_TIME) {
            this.timeElapsed = MAX_SIMULATION_TIME;
            simulationComplete = true;
        }
        this.isEngagementComplete = simulationComplete;
        return simulationComplete;
    }
    resetScenario() {
        this.timeElapsed = 0;
        this.isEngagementComplete = false;
        this.missiles = [];
    }
    getTimeElapsed() {
        return this.timeElapsed;
    }
    /* EngagementResult method returns IEngagementResult with details of the engagement
    including kill times, missile paths, and detection events
    */
    engagementResult() {
        let missileResultsArray = [];
        for (const missile of this.missiles) {
            missileResultsArray.push({
                id: missile.launchedBy === 'sam' ? `SAM-Missile-${missile.timeOfLaunch}` : `HARM-Missile-${missile.timeOfLaunch}`,
                launchedBy: missile.launchedBy,
                launchTime: missile.timeOfLaunch,
                timeOfImpact: missile.status === 'kill' ? missile.timeOfImpact : null,
                impactPosition: missile.status === 'kill' ? missile.target.position : null,
                status: missile.status,
            });
        }
        const missileResults = {
            missiles: missileResultsArray
        };
        const success = this.samSystem.state === 'destroyed' ? false : true;
        const result = {
            scenarioId: this.scenario.id,
            missileResults: missileResults,
            success,
            timestamp: new Date(),
        };
        return result;
    }
    /**
     * Apply RCS and Pulse Integration to array and return array
     * @param azimuthDeg
     * @param rcs
     * @returns
     */
    getDetectionRanges(ranges, rcs, numPulses, pulse_mode) {
        const adjustedRanges = ranges.map((nominalRange) => {
            const detectionRange = this.samSystem.radar.calculateDetectionRange(rcs, numPulses, nominalRange);
            return detectionRange;
        });
        return adjustedRanges;
    }
    getNominalRanges() {
        return this.samSystem.getRangesAzimuth();
    }
    getPrecipitationRanges() {
        return this.samSystem.precipRangesAzimuth;
    }
    /**
     * Calculate distance between SAM and fighter
     */
    getDistanceSAMToFighter() {
        const fighterPosition = this.scenario.platforms.fighter.position;
        const samPosition = this.scenario.platforms.sam.position;
        const dx = fighterPosition.x - samPosition.x;
        const dy = fighterPosition.y - samPosition.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    /**
     * Calculate azimuth from SAM to fighter
     */
    getAzimuthSAMToFighter() {
        const fighterPosition = this.scenario.platforms.fighter.position;
        const samPosition = this.scenario.platforms.sam.position;
        const dx = fighterPosition.x - samPosition.x;
        const dy = fighterPosition.y - samPosition.y;
        return (Math.atan2(dy, dx) * 180) / Math.PI;
    }
    /**
     * Get fighter RCS as seen from SAM position
     */
    getFighterRCSFromSAM() {
        return this.fighter.getRCSFromPosition(this.scenario.platforms.fighter.position, this.scenario.platforms.sam.position, this.scenario.platforms.fighter.heading);
    }
    /**
     * Need to check between time steps if either missile intercepted its target
     * by raycast method
     */
    checkMissileIntercept(missile, targetPos, previousMissilePos) {
        // Vector from previous to current missile position
        const mx = missile.position.x - previousMissilePos.x;
        const my = missile.position.y - previousMissilePos.y;
        // Vector from previous missile position to target
        const tx = targetPos.x - previousMissilePos.x;
        const ty = targetPos.y - previousMissilePos.y;
        // Project target vector onto missile path vector
        const magM = Math.sqrt(mx * mx + my * my);
        const dot = (tx * mx + ty * my) / magM;
        // Closest point on missile path to target
        const closestX = previousMissilePos.x + (dot / magM) * mx;
        const closestY = previousMissilePos.y + (dot / magM) * my;
        // Distance from closest point to target
        const distX = targetPos.x - closestX;
        const distY = targetPos.y - closestY;
        const distanceToTarget = Math.sqrt(distX * distX + distY * distY);
        // Define kill radius
        const killRadius = missile.launchedBy === 'sam' ? 0.02 : 0.05; // km
        return distanceToTarget <= killRadius;
    }
    /**
     * Calculate SAM detection range for current fighter position/aspect
     *
     * @param accountForPrecipitation - Include path attenuation if field exists
     * @returns Detection range (km)
     */
    fighterDetect(accountForPrecipitation = true) {
        const fighterRCS = this.getFighterRCSFromSAM();
        let pathAttenuation = 0;
        if (accountForPrecipitation) {
            const azimuthDeg = this.fighter.getAzimuthFromSAM(this.scenario.platforms.sam.position);
            const azimuths = this.samSystem.getRangesAzimuth();
            const numAzimuths = azimuths.length;
            const azimuthIndex = Math.round(((azimuthDeg % 360) / 360) * numAzimuths) % numAzimuths;
            //Get Aspect RCS
            const rcs = this.fighter.getRCSAtAspect(azimuthDeg);
            // Recalculate detection range for given RCS at this azimuth
            const nominalRange = azimuths[azimuthIndex];
            const pathAttenuationDb = 0; // Placeholder, implement path attenuation if needed
            const detectionRange = this.samSystem.radar.calculateDetectionRange(rcs, this.samSystem.pulseMode.numPulses, nominalRange);
            return detectionRange;
        }
        return this.samSystem.calculateDetectionRange(fighterRCS, this.samSystem.pulseMode.numPulses, this.samSystem.nominalRange);
    }
    /**
     * Check if fighter is currently detected by SAM
     */
    isFighterDetected(accountForPrecipitation = true) {
        const distance = this.getDistanceSAMToFighter();
        const detectionRange = this.fighterDetect(accountForPrecipitation);
        return distance <= detectionRange;
    }
    /**
     * Check if fighter is within SAM MEMR
     */
    isFighterWithinMEMR() {
        const distance = this.getDistanceSAMToFighter();
        return this.samSystem.isWithinMEMR(distance);
    }
    /**
     * Check if fighter should launch HARM
     */
    shouldFighterLaunchHARM() {
        const distance = this.getDistanceSAMToFighter();
        return this.fighter.shouldLaunchHARM(distance, this.samSystem.properties.memr, this.samSystem.trackingStatus.status === 'tracking');
    }
    /**
     * Update fighter position based on velocity and time step
     */
    updateFighterPosition() {
        // Simple straight-line movement for now
        const speedOfSound = 343; // m/s
        const velocityMs = this.fighter.velocity * speedOfSound;
        const velocityKmS = velocityMs / 1000;
        const distanceKm = velocityKmS * this.timeStep;
        const headingRad = (this.fighter.heading * Math.PI) / 180;
        this.fighter.position.x += distanceKm * Math.cos(headingRad);
        this.fighter.position.y = distanceKm * Math.sin(headingRad);
    }
    /**
     * Get current scenario state snapshot
     */
    async getState() {
        return {
            samPosition: { ...this.scenario.platforms.sam.position },
            fighterPosition: { ...this.fighter.position },
            distance: this.getDistanceSAMToFighter(),
            azimuth: this.getAzimuthSAMToFighter(),
            fighterRCS: this.getFighterRCSFromSAM(),
            isDetected: await this.isFighterDetected(),
            isWithinMEMR: this.isFighterWithinMEMR(),
            shouldLaunchHARM: this.shouldFighterLaunchHARM(),
        };
    }
}
//# sourceMappingURL=Scenario.js.map