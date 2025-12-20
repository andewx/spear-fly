/**
 * Precipitation cell representation
 */
export interface IPrecipitationCellConfig {
    center: {
        x: number;
        y: number;
    };
    size: number;
    rate: number;
    alpha: number;
}
export declare class PrecipitationCell {
    readonly center: {
        x: number;
        y: number;
    };
    readonly size: number;
    readonly rate: number;
    readonly alpha: number;
    constructor(config: IPrecipitationCellConfig);
    /**
     * Calculate rain rate at a given position using Gaussian falloff
     *
     * @param x - Position x coordinate (km)
     * @param y - Position y coordinate (km)
     * @returns Rain rate at position (mm/hr)
     */
    getRainRateAt(x: number, y: number): number;
    /**
     * Check if a position is within the cell's effective range (3-sigma)
     *
     * @param x - Position x coordinate (km)
     * @param y - Position y coordinate (km)
     * @returns True if position is within cell's range
     */
    isInRange(x: number, y: number): boolean;
    /**
     * Get cell's bounding box for spatial queries
     */
    getBounds(): {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
    };
}
//# sourceMappingURL=PrecipitationCell.d.ts.map