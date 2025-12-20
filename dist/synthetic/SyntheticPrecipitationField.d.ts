/**
 * Synthetic precipitation field generator
 * Creates and manages precipitation cells with Gaussian distributions
 */
import { PrecipitationCell } from './PrecipitationCell.js';
import type { IGridBounds } from '../types/index.js';
export interface ISyntheticFieldConfig {
    gridBounds: IGridBounds;
    numCells: number;
    nominalRainRate: number;
    nominalCellSize: number;
    alpha: number;
    maxRainRateCap: number;
}
export declare class SyntheticPrecipitationField {
    private cells;
    private quadTree;
    private config;
    constructor(config: ISyntheticFieldConfig);
    /**
     * Generate random precipitation cells within grid bounds
     */
    generateCells(): void;
    /**
     * Sample rain rate at a specific position
     * Queries nearby cells and combines their contributions with Gaussian weighting
     *
     * @param x - Position x coordinate (km)
     * @param y - Position y coordinate (km)
     * @returns Rain rate at position (mm/hr)
     */
    sampleRainRate(x: number, y: number): number;
    /**
     * Get all precipitation cells (for visualization)
     */
    getCells(): PrecipitationCell[];
    /**
     * Get cells as plain objects for serialization
     */
    getCellsAsObjects(): Array<{
        center: {
            x: number;
            y: number;
        };
        size: number;
        rate: number;
        alpha: number;
    }>;
    /**
     * Generate rain rate grid for visualization
     *
     * @param resolution - Grid resolution (samples per km)
     * @returns 2D array of rain rates
     */
    generateRainRateGrid(resolution?: number): number[][];
    /**
     * Get field statistics
     */
    getStatistics(): {
        numCells: number;
        avgCellSize: number;
        totalCoverage: number;
        nominalRate: number;
    };
}
//# sourceMappingURL=SyntheticPrecipitationField.d.ts.map