/**
 * Radar calculation utilities
 * Standard radar equation with RCS scaling and attenuation
 */
import type { ISAMSystem, IFighterPlatform, IPosition2D } from '../types/index.js';
/**
 * Convert dB to linear power ratio
 */
export declare function dbToLinear(db: number): number;
/**
 * Convert linear power ratio to dB
 */
export declare function linearToDb(linear: number): number;
/**
 * Calculate adjusted detection range based on RCS
 * Uses radar range equation: R1/R2 = (RCS2/RCS1)^0.25
 *
 * @param nominalRange - Detection range for 1m² RCS target (km)
 * @param targetRCS - Target radar cross section (m²)
 * @returns Adjusted detection range (km)
 */
export declare function calculateDetectionRange(nominalRange: number, targetRCS: number): number;
/**
 * Apply attenuation loss to detection range
 * Attenuation reduces received power, which affects range by R ∝ P^0.25
 *
 * @param range - Original detection range (km)
 * @param attenuationDb - Path attenuation in dB
 * @returns Attenuated detection range (km)
 */
export declare function applyAttenuation(range: number, attenuationDb: number): number;
/**
 * Calculate distance between two 2D points
 */
export declare function calculateDistance(p1: IPosition2D, p2: IPosition2D): number;
/**
 * Calculate time for missile to reach target
 *
 * @param distance - Distance to target (km)
 * @param velocityMach - Missile velocity in Mach
 * @returns Time to target (seconds)
 */
export declare function calculateMissileFlightTime(distance: number, velocityMach: number): number;
/**
 * Determine if fighter is within SAM's vulnerability window
 * Fighter engages when approaching MEMR
 *
 * @param samToFighterDistance - Current distance from SAM to fighter (km)
 * @param memr - Maximum Effective Missile Range (km)
 * @param memrRatio - Engagement threshold as ratio of MEMR (0-1)
 * @returns True if within vulnerability window
 */
export declare function isInVulnerabilityWindow(samToFighterDistance: number, memr: number, memrRatio?: number): boolean;
/**
 * Calculate engagement result for SAM vs Fighter scenario
 *
 * @param sam - SAM system configuration
 * @param fighter - Fighter platform configuration
 * @param samPosition - SAM position
 * @param fighterPosition - Fighter position
 * @param pathAttenuationDb - Attenuation along radar path (dB)
 * @returns Object with kill times and success flag
 */
export declare function calculateEngagement(sam: ISAMSystem, fighter: IFighterPlatform, samPosition: IPosition2D, fighterPosition: IPosition2D, pathAttenuationDb: number, fighterRCS: number): {
    detectionRange: number;
    currentDistance: number;
    samKillTime: number;
    harmKillTime: number;
    success: boolean;
    detected: boolean;
};
/**
 * Get aspect-dependent RCS from fighter platform
 * Simplified aspect calculation based on position vector
 *
 * @param fighter - Fighter platform
 * @param samToFighterVector - Normalized vector from SAM to fighter
 * @returns RCS value (m²) for current aspect
 */
export declare function getAspectRCS(fighter: IFighterPlatform, samToFighterVector: {
    x: number;
    y: number;
}): number;
//# sourceMappingURL=radarCalculations.d.ts.map