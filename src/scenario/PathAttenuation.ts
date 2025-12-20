/**
 * Path attenuation calculator
 * Ray traces through precipitation field to calculate signal attenuation
 */

import type { SyntheticPrecipitationField } from '../synthetic/index.js';
import { getAttenuation } from '../services/ituData.js';

export interface IPathTrace {
  start: { x: number; y: number };
  end: { x: number; y: number };
  frequency: number; // GHz
  samplesPerKm: number; // Sampling resolution
}

/**
 * Calculate path attenuation through precipitation field
 * 
 * @param trace - Path trace configuration
 * @param precipField - Synthetic precipitation field
 * @returns Total path attenuation (dB)
 */
export function calculatePathAttenuation(
  trace: IPathTrace,
  precipField: SyntheticPrecipitationField
): number {
  const { start, end, frequency, samplesPerKm } = trace;

  // Calculate path vector
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const totalDistance = Math.sqrt(dx * dx + dy * dy);

  if (totalDistance === 0) {
    return 0;
  }

  // Number of samples along path
  const numSamples = Math.max(2, Math.ceil(totalDistance * samplesPerKm));
  const stepSize = totalDistance / numSamples;

  let totalAttenuation = 0;

  // Sample along path
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1); // 0 to 1
    const x = start.x + t * dx;
    const y = start.y + t * dy;

    // Sample rain rate at this position
    const rainRate = precipField.sampleRainRate(x, y);

    if (rainRate > 0) {
      // Get specific attenuation (dB/km) from ITU data
      const attenPerKm = getAttenuation(frequency, rainRate);
      
      // Accumulate attenuation for this segment
      totalAttenuation += attenPerKm * stepSize;
    }
  }

  return totalAttenuation;
}

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
export function calculateDetectionRangeAlongAzimuth(
  radarFrequency: number,
  baseDetectionRange: number,
  radarPos: { x: number; y: number },
  azimuthDeg: number,
  precipField: SyntheticPrecipitationField,
  samplesPerKm: number = 10
): number {
  // Convert azimuth to radians
  const azimuthRad = (azimuthDeg * Math.PI) / 180;

  // Calculate end point at base detection range
  const endX = radarPos.x + baseDetectionRange * Math.cos(azimuthRad);
  const endY = radarPos.y + baseDetectionRange * Math.sin(azimuthRad);

  // Calculate path attenuation
  const pathAttenuation = calculatePathAttenuation(
    {
      start: radarPos,
      end: { x: endX, y: endY },
      frequency: radarFrequency,
      samplesPerKm,
    },
    precipField
  );

  // Apply attenuation to reduce detection range
  // Range reduction: R2/R1 = 10^(-attenuation/40)
  const rangeReductionFactor = Math.pow(10, -pathAttenuation / 40);
  return baseDetectionRange * rangeReductionFactor;
}
