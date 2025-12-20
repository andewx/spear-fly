/**
 * Path attenuation calculator
 * Ray traces through precipitation field to calculate signal attenuation
 */
import type { SyntheticPrecipitationField } from '../synthetic/index.js';
export interface IPathTrace {
    start: {
        x: number;
        y: number;
    };
    end: {
        x: number;
        y: number;
    };
    frequency: number;
    samplesPerKm: number;
}
/**
 * Calculate path attenuation through precipitation field
 *
 * @param trace - Path trace configuration
 * @param precipField - Synthetic precipitation field
 * @returns Total path attenuation (dB)
 */
export declare function calculatePathAttenuation(trace: IPathTrace, precipField: SyntheticPrecipitationField): number;
/**
 * Calculate detection range along a specific azimuth
 * Accounts for path attenuation through precipitation
 *
 * @param radarFrequency - Radar frequency (GHz)
 * @param baseDetectionRange - Base detection range without attenuation (km)
 * @param radarPos - Radar position
 * @param azimuthDeg - Azimuth direction (degrees from +X axis)
 * @param precipField - Precipitation field
 * @param samplesPerKm - Path sampling resolution
 * @returns Detection range along azimuth (km)
 */
export declare function calculateDetectionRangeAlongAzimuth(radarFrequency: number, baseDetectionRange: number, radarPos: {
    x: number;
    y: number;
}, azimuthDeg: number, precipField: SyntheticPrecipitationField, samplesPerKm?: number): number;
//# sourceMappingURL=PathAttenuation.d.ts.map