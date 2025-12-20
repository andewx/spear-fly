import { IITUData, IPosition2D, IScenario } from '../types/index.js';
export type TPulseIntegrationMode = 'coherent' | 'noncoherent';
export interface IRadarConfig {
    nominalRange: number;
    frequency: number;
    pulseIntegration: {
        numPulses: number;
        mode: TPulseIntegrationMode;
    };
}
/**
 * Radar system for detection range calculations
 * Operates using relative range scaling from nominal 1m² RCS baseline
 */
export declare class Radar {
    private nominalRange;
    private frequency;
    private pulseIntegrationGain;
    private radarConfig;
    ituData: IITUData;
    private ctx;
    private imageData;
    constructor(config: IRadarConfig);
    /** Canvas context and image data for precipitation image processing */
    loadImageDataFromScenario(scenario: IScenario): Promise<void>;
    /**
     * Calculate pulse integration gain
     * Coherent: sqrt(N)
     * Non-coherent: N^0.7
     */
    private calculatePulseIntegrationGain;
    /**
     * Load the ITU data for path attenuation calculations
     */
    loadITUData(): Promise<IITUData>;
    /**
     * Calculate detection range for a given RCS
     * Uses R₁/R₂ = (RCS₂/RCS₁)^0.25 from radar range equation
     *
     * @param rcs - Target radar cross section (m²)
     * @returns Detection range (km)
     */
    calculateDetectionRange(rcs: number, pulses: number, range: number): number;
    private decibelsToWatts;
    /**Given a decibel gain convert the resulting range increase/decrease */
    private rangeDeltaFromDecibels;
    private wattsToDecibels;
    /**
     * Calculate detection range with precipitation field attenuation sampling
     * @param rcs fighter RCS (m²)
     * @param azimuth
     * @returns
     */
    calculateDetectionRangeWithPrecipitationFieldSampling(rcs: number, position: IPosition2D, azimuth: number, scenario: IScenario): number;
    /**
     * Position to image coordinates
     */
    private worldToImageCoordinates;
    private imageToWorldCoordinates;
    private degToRad;
    private radToDeg;
    private polarToCartesian;
    /**
     * Apply path attenuation to detection range
     * Attenuation reduces received power, affects range by R ∝ P^0.25
     * Since R^4 ∝ P, and attenuation is in dB: 10*log10(P1/P2) = attenuation
     * Therefore: R2/R1 = (P2/P1)^0.25 = 10^(-attenuation/40)
     *
     * @param baseRange - Original detection range (km)
     * @param attenuationDb - Total path attenuation (dB)
     * @returns Attenuated detection range (km)
     */
    applyPathAttenuation(baseRange: number, attenuationDb: number): number;
    /**
     * Given rain rate (mm/hr), get specific attenuation (dB/km) from ITU data
     */
    getSpecificAttenuation(rainRate: number): number;
    /**
     * Get radar operating frequency
     */
    getFrequency(): number;
    /**
     * Get nominal range
     */
    getNominalRange(): number;
}
//# sourceMappingURL=Radar.d.ts.map