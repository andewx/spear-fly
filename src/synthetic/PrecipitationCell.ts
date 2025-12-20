/**
 * Precipitation cell representation
 */

export interface IPrecipitationCellConfig {
  center: { x: number; y: number }; // Position in km
  size: number; // Radius in km (represents 3-sigma Gaussian extent)
  rate: number; // Nominal rain rate at center in mm/hr
  alpha: number; // Standard deviation factor for Gaussian falloff
}

export class PrecipitationCell {
  public readonly center: { x: number; y: number };
  public readonly size: number;
  public readonly rate: number;
  public readonly alpha: number; // Standard deviation for Gaussian falloff

  constructor(config: IPrecipitationCellConfig) {
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
  getRainRateAt(x: number, y: number): number {
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
  isInRange(x: number, y: number): boolean {
    const dx = x - this.center.x;
    const dy = y - this.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.size;
  }

  /**
   * Get cell's bounding box for spatial queries
   */
  getBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    return {
      minX: this.center.x - this.size,
      maxX: this.center.x + this.size,
      minY: this.center.y - this.size,
      maxY: this.center.y + this.size,
    };
  }
}
