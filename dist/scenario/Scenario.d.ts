/**
 * Scenario environment
 * Defines simulation grid, platforms, and environmental conditions
 */
import { SAMSystem } from './SAMSystem.js';
import { Fighter } from './Fighter.js';
import { IScenario, IPosition2D, IEngagementResult } from '../types/index.js';
type TMissile = {
    position: IPosition2D;
    velocity: number;
    heading: number;
    status: 'active' | 'kill' | 'missed';
    launchedBy: 'sam' | 'fighter';
    timeOfLaunch: number;
    timeOfImpact: number;
    maxRange?: number;
    target: SAMSystem | Fighter;
};
export declare class Scenario {
    readonly id: string;
    readonly timeStep: number;
    timeElapsed: number;
    readonly scenario: IScenario;
    readonly samSystem: SAMSystem;
    readonly fighter: Fighter;
    private missiles;
    private isEngagementComplete;
    /**
     * Private constructor - use static create() method instead
     * This enforces async initialization through the factory pattern
     */
    constructor(scenario: IScenario, samSystem: SAMSystem, fighter: Fighter, timeStep: number);
    /**
     * Static factory method for async initialization
     * Use this instead of constructor: const scenario = await Scenario.create(...)
     */
    static create(scenario: IScenario, timeStep?: number): Promise<Scenario>;
    engagementComplete(): boolean;
    advanceSimulationTimeStep(): boolean;
    resetScenario(): void;
    getTimeElapsed(): number;
    getMissiles(): Array<TMissile>;
    engagementResult(): IEngagementResult;
    /**
     * Apply RCS and Pulse Integration to array and return array
     * @param azimuthDeg
     * @param rcs
     * @returns
     */
    getDetectionRanges(ranges: Array<number>, rcs: number, numPulses: number, pulse_mode: string): Array<number>;
    getNominalRanges(): Array<number>;
    getPrecipitationRanges(): Array<number>;
    /**
     * Calculate distance between SAM and fighter
     */
    getDistanceSAMToFighter(): number;
    /**
     * Calculate azimuth from SAM to fighter
     */
    getAzimuthSAMToFighter(): number;
    /**
     * Get fighter RCS as seen from SAM position
     */
    getFighterRCSFromSAM(): number;
    getRangeAtAzimuth(azimuthDeg: number): number;
    isWithinMEMR(distance: number): boolean;
    /**
     * Need to check between time steps if either missile intercepted its target
     * by raycast method
     */
    checkMissileIntercept(missile: TMissile, targetPos: IPosition2D, previousMissilePos: IPosition2D): boolean;
    /**
     * Calculate SAM detection range for current fighter position/aspect
     *
     * @param accountForPrecipitation - Include path attenuation if field exists
     * @returns Detection range (km)
     */
    fighterDetect(accountForPrecipitation?: boolean): number;
    /**
     * Check if fighter is currently detected by SAM
     */
    isFighterDetected(accountForPrecipitation?: boolean): boolean;
    /**
     * Check if fighter is within SAM MEMR
     */
    isFighterWithinMEMR(): boolean;
    /**
     * Check if fighter should launch HARM
     */
    shouldFighterLaunchHARM(): boolean;
    /**
     * Update fighter position based on velocity and time step
     */
    updateFighterPosition(): void;
    /**
     * Get current scenario state snapshot
     */
    getState(): Promise<{
        samPosition: {
            x: number;
            y: number;
        };
        fighterPosition: {
            x: number;
            y: number;
        };
        distance: number;
        azimuth: number;
        fighterRCS: number;
        isDetected: boolean;
        isWithinMEMR: boolean;
        shouldLaunchHARM: boolean;
    }>;
}
export {};
//# sourceMappingURL=Scenario.d.ts.map