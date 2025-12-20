/**
 * Radar system abstraction
 * Handles detection range calculations with path attenuation and pulse integration
 */
import * as itu from '../services/ituData.js';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
/**
 * Radar system for detection range calculations
 * Operates using relative range scaling from nominal 1m² RCS baseline
 */
export class Radar {
    nominalRange;
    frequency;
    pulseIntegrationGain;
    radarConfig;
    ituData;
    //Canvas objects for precipitation image processing
    ctx = null;
    imageData = null;
    constructor(config) {
        this.nominalRange = config.nominalRange;
        this.frequency = config.frequency;
        this.radarConfig = config;
        this.pulseIntegrationGain = this.calculatePulseIntegrationGain(this.radarConfig.pulseIntegration.numPulses);
        //Ensure numeric properties are numbers
        this.nominalRange = Number(this.nominalRange);
        this.frequency = Number(this.frequency);
    }
    /** Canvas context and image data for precipitation image processing */
    async loadImageDataFromScenario(scenario) {
        // Construct file system path to precipitation image
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const imagePath = path.join(__dirname, '..', 'data', 'precipitation', scenario.precipitationFieldImage);
        console.log('\nLoading precipitation image from:', imagePath);
        //Replace load image with
        try {
            const image = await loadImage(imagePath);
            //Create canvas matchin image dimensions
            // Create canvas matching image dimensions
            const canvas = createCanvas(image.width, image.height);
            const ctx = canvas.getContext('2d');
            // Draw image to canvas
            ctx.drawImage(image, 0, 0);
            // Extract pixel data
            this.imageData = ctx.getImageData(0, 0, image.width, image.height);
        }
        catch (error) {
            console.error('Failed to load precipitation image:', error);
        }
    }
    /**
     * Calculate pulse integration gain
     * Coherent: sqrt(N)
     * Non-coherent: N^0.7
     */
    calculatePulseIntegrationGain(pulses) {
        const N = pulses;
        if (this.radarConfig.pulseIntegration.mode === 'coherent') {
            return this.wattsToDecibels(Math.sqrt(pulses));
        }
        else {
            return this.wattsToDecibels(Math.pow(pulses, 0.7));
        }
    }
    /**
     * Load the ITU data for path attenuation calculations
     */
    async loadITUData() {
        if (!this.ituData) {
            this.ituData = await itu.loadITUData();
        }
        return this.ituData;
    }
    /**
     * Calculate detection range for a given RCS
     * Uses R₁/R₂ = (RCS₂/RCS₁)^0.25 from radar range equation
     *
     * @param rcs - Target radar cross section (m²)
     * @returns Detection range (km)
     */
    calculateDetectionRange(rcs, pulses, range) {
        const pulseGain = this.calculatePulseIntegrationGain(pulses);
        range = range * this.rangeDeltaFromDecibels(pulseGain);
        const rcsRatio = rcs / 1.0; // Nominal is 1m²
        const rangeRatio = Math.pow(rcsRatio, 0.25);
        return range * rangeRatio;
    }
    decibelsToWatts(db) {
        return Math.pow(10, db / 10);
    }
    /**Given a decibel gain convert the resulting range increase/decrease */
    rangeDeltaFromDecibels(dbGain) {
        // Convert dB gain to linear scale
        const linearGain = this.decibelsToWatts(dbGain);
        // Range scales with the fourth root of power gain
        return Math.pow(linearGain, 0.25);
    }
    wattsToDecibels(watts) {
        return 10 * Math.log10(watts);
    }
    /**
     * Calculate detection range with precipitation field attenuation sampling
     * @param rcs fighter RCS (m²)
     * @param azimuth
     * @returns
     */
    calculateDetectionRangeWithPrecipitationFieldSampling(rcs, position, azimuth, scenario) {
        // If no precipitation field image, return unattenuated range
        if (!scenario.precipitationFieldImage) {
            console.log("No precipitation field image defined, returning unattenuated range.");
            return this.calculateDetectionRange(rcs, 1.0, this.nominalRange);
        }
        try {
            // World Position at (0,0) is considered center of image apply position transformation to image coordinates
            const samImagePos = this.worldToImageCoordinates(position, scenario);
            const pixelsPerKm = scenario.grid.resolution; // pixels per km
            const kmPerPixel = 1 / pixelsPerKm;
            const maxRangeKm = this.nominalRange; // Sample out to nominal range
            const rangeStepKm = kmPerPixel * 1.5; // Sample at approx 1.5 pixel intervals
            const NRay = Math.ceil(maxRangeKm / rangeStepKm);
            let resultRange = this.nominalRange;
            //Scenario max precipitation rate
            const maxPrecipitationRate = scenario.environment.precipitation.maxRainRateCap || 35; // mm/hr
            // Total gains losses
            let totalSystemGainDb = 0;
            const azRad = this.degToRad(azimuth);
            let adjustedRange = this.nominalRange;
            for (let iray = 0; iray < NRay; iray++) {
                //Break condition if our sampling range and greater than the adjusted range
                const currentRangeKm = (iray + 1) * rangeStepKm;
                if (currentRangeKm >= adjustedRange) {
                    resultRange = currentRangeKm; // Last valid range before exceeding adjusted range
                    break;
                }
                const offsetX = currentRangeKm * Math.cos(azRad);
                const offsetY = currentRangeKm * Math.sin(azRad);
                const worldPos = { x: offsetX, y: offsetY };
                const imgPos = this.worldToImageCoordinates(worldPos, scenario);
                // Sample pixel color to determine rain rate
                if (imgPos.ix >= 0 && imgPos.ix < scenario.grid.width && imgPos.iy >= 0 && imgPos.iy < scenario.grid.height) {
                    const pixelIndex = (imgPos.iy * scenario.grid.width + imgPos.ix) * 4;
                    const r = this.imageData.data[pixelIndex];
                    const g = this.imageData.data[pixelIndex + 1];
                    const b = this.imageData.data[pixelIndex + 2];
                    // Assuming grayscale image where intensity maps to rain rate
                    //Calculate intensity as magnitude of RGB vector
                    const intensity = (r + g + b) / 3; // 0-255
                    const rainRate = (intensity / 255) * maxPrecipitationRate; // Map to 0-35 mm/hr
                    let attenuationDb = 0;
                    if (rainRate > 0) {
                        const specificAttenuation = this.getSpecificAttenuation(rainRate); // dB/km
                        attenuationDb = 2 * (specificAttenuation * rangeStepKm);
                        totalSystemGainDb -= attenuationDb;
                    }
                    adjustedRange = this.nominalRange * this.rangeDeltaFromDecibels(totalSystemGainDb);
                }
            }
            return resultRange;
        }
        catch (error) {
            console.error('Failed to load precipitation image:', error);
            // Fall back to unattenuated range if image load fails
            return this.nominalRange;
        }
    }
    /**
     * Position to image coordinates
     */
    worldToImageCoordinates(position, scenario) {
        // Assuming scenario.grid defines the mapping from world to image coordinates
        let originX = 0;
        let originY = 0;
        if (scenario.grid.origin !== undefined) {
            originX = scenario.grid.origin.x;
            originY = scenario.grid.origin.y;
            console.log(`World to Image Origin: (${originX}, ${originY})\n`);
        }
        const resolution = scenario.grid.resolution; // pixels per km
        const width = scenario.grid.width * resolution;
        const height = scenario.grid.height * resolution;
        //Image coordinates are top-left origin - transform accordingly
        const centerPixelCoordinate = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
        const centerWorldCoordinate = { x: originX, y: originY };
        let ix = centerPixelCoordinate.x + Math.floor((position.x - originX) * resolution);
        let iy = centerPixelCoordinate.y - Math.floor((position.y - originY) * resolution);
        if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
            console.warn(`Position (${position.x}, ${position.y}) maps outside image bounds to (${ix}, ${iy})`);
            if (ix < 0 || ix >= width) {
                ix = 0;
            }
            if (iy < 0 || iy >= height) {
                iy = 0;
            }
        }
        return { ix, iy };
    }
    imageToWorldCoordinates(ix, iy, scenario) {
        let originX = 0;
        let originY = 0;
        if (scenario.grid.origin !== undefined) {
            originX = scenario.grid.origin.x;
            originY = scenario.grid.origin.y;
        }
        const resolution = scenario.grid.resolution; // pixels per km
        const width = scenario.grid.width * scenario.grid.resolution;
        const height = scenario.grid.height * scenario.grid.resolution;
        const topLeftWorldCoordinate = { x: originX - ((scenario.grid.width / 2)), y: originY + (scenario.grid.height / 2) };
        const x = (ix / resolution) + topLeftWorldCoordinate.x;
        const y = topLeftWorldCoordinate.y - (iy / resolution);
        return { x, y };
    }
    degToRad(deg) {
        return (deg * Math.PI) / 180;
    }
    radToDeg(rad) {
        return (rad * 180) / Math.PI;
    }
    polarToCartesian(radius, angleDeg) {
        const angleRad = this.degToRad(angleDeg);
        return {
            x: radius * Math.cos(angleRad),
            y: radius * Math.sin(angleRad),
        };
    }
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
    applyPathAttenuation(baseRange, attenuationDb) {
        // Range reduction factor from attenuation
        // dB = 10*log10(P1/P2), so P2/P1 = 10^(-dB/10)
        // Range scales with power^0.25, so R2/R1 = (P2/P1)^0.25 = 10^(-dB/40)
        const rangeReductionFactor = Math.pow(10, -attenuationDb / 40);
        return baseRange * rangeReductionFactor;
    }
    /**
     * Given rain rate (mm/hr), get specific attenuation (dB/km) from ITU data
     */
    getSpecificAttenuation(rainRate) {
        if (!this.ituData) {
            throw new Error('ITU data not loaded');
        }
        return itu.getAttenuation(this.frequency, rainRate);
    }
    /**
     * Get radar operating frequency
     */
    getFrequency() {
        return this.frequency;
    }
    /**
     * Get nominal range
     */
    getNominalRange() {
        return this.nominalRange;
    }
}
//# sourceMappingURL=Radar.js.map