/**
 * Precipitation cell representation
 */
export class PrecipitationCell {
    center;
    size;
    rate;
    alpha; // Standard deviation for Gaussian falloff
    constructor(config) {
        this.center = config.center;
        this.size = config.size;
        this.rate = config.rate;
        this.alpha = config.alpha;
    }
    /**
     * Calculate rain rate at a given position using Gaussian falloff
     *
     * @param x - Position x coordinate (km)
     * @param y - Position y coordinate (km)
     * @returns Rain rate at position (mm/hr)
     */
    getRainRateAt(x, y) {
        const dx = x - this.center.x;
        const dy = y - this.center.y;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
        const sigma = this.alpha * this.size; // Standard deviation
        // Gaussian falloff: rate = nominalSize * exp(-0.5 * (distance/sigma)^2)
        //const rainRate = Math.exp(-0.5 * Math.pow(distanceFromCenter / sigma, 2));
        const rainRate = this.rate * Math.exp(-0.5 * Math.pow(distanceFromCenter / sigma, 2));
        return rainRate;
    }
    /**
     * Check if a position is within the cell's effective range (3-sigma)
     *
     * @param x - Position x coordinate (km)
     * @param y - Position y coordinate (km)
     * @returns True if position is within cell's range
     */
    isInRange(x, y) {
        const dx = x - this.center.x;
        const dy = y - this.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.size;
    }
    /**
     * Get cell's bounding box for spatial queries
     */
    getBounds() {
        return {
            minX: this.center.x - this.size,
            maxX: this.center.x + this.size,
            minY: this.center.y - this.size,
            maxY: this.center.y + this.size,
        };
    }
}
//# sourceMappingURL=PrecipitationCell.js.map