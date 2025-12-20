/**
 * ITU attenuation data loader and interpolation service
 * Loads CSV data from src/data/itu/ and provides bilinear interpolation
 *
 * CSV Data Structure:
 * - Each ROW represents a frequency (5.0 GHz + rowIndex * 0.2 GHz)
 * - Each COLUMN represents a rain rate from ITU_RAIN_RATES array
 * - Each cell contains only the attenuation value in dB/km
 * - No header row, pure data matrix
 *
 * Example:
 * atten_5.0GHz_0.01mm, atten_5.0GHz_0.1mm, ..., atten_5.0GHz_60mm
 * atten_5.2GHz_0.01mm, atten_5.2GHz_0.1mm, ..., atten_5.2GHz_60mm
 * ...
 */
import type { IITUData } from '../types/index.js';
/**
 * Load ITU attenuation CSV data (5.0-15.0 GHz, dB/km format)
 * Expected format: Tabular data where each row = frequency, each column = rain rate
 */
export declare function loadITUData(): Promise<IITUData>;
/**
 * Get attenuation (dB/km) for given frequency and rain rate using bilinear interpolation
 *
 * @param frequency - Frequency in GHz
 * @param rainRate - Rain rate in mm/hr
 * @returns Attenuation in dB/km
 */
export declare function getAttenuation(frequency: number, rainRate: number): number;
//# sourceMappingURL=ituData.d.ts.map