/**
 * Synthetic precipitation field generator
 * Creates and manages precipitation cells with Gaussian distributions
 */

import { QuadTree } from './QuadTree.js';
import { PrecipitationCell, type IPrecipitationCellConfig } from './PrecipitationCell.js';
import type { IGridBounds } from '../types/index.js';

export interface ISyntheticFieldConfig {
  gridBounds: IGridBounds; // Scenario grid bounds
  numCells: number; // Number of precipitation cells to generate
  nominalRainRate: number; // Base rain rate (mm/hr)
  nominalCellSize: number; // Nominal cell radius (km)
  alpha: number; // Distribution parameter (std dev factor)
  maxRainRateCap: number; // Cap for overlapping cells (e.g., 1.5 = 150% of nominal)
}

export class SyntheticPrecipitationField {
  private cells: PrecipitationCell[];
  private quadTree: QuadTree<PrecipitationCell>;
  private config: ISyntheticFieldConfig;

  constructor(config: ISyntheticFieldConfig) {
    this.config = config;
    this.cells = [];
    
    // Initialize quadtree with scenario bounds
    const centerX = config.gridBounds.width / 2;
    const centerY = config.gridBounds.height / 2;
    this.quadTree = new QuadTree(
      {
        x: centerX,
        y: centerY,
        width: centerX,
        height: centerY,
      },
      4 // Capacity per node
    );

    this.generateCells();
  }

  /**
   * Generate random precipitation cells within grid bounds
   */
  public generateCells(): void {
    const {gridBounds, numCells, nominalRainRate, nominalCellSize, alpha } = this.config;

    // Ensure numeric types (in case they come as strings from form data)
    const nominalSizeNum = Number(nominalCellSize);
    const nominalRateNum = Number(nominalRainRate);
    const alphaNum = Number(alpha);

    console.log(`DEBUG - Types: nominalSize=${typeof nominalCellSize} (${nominalSizeNum}), alpha=${typeof alpha} (${alphaNum})`);

    const sigmaSize = alphaNum * nominalSizeNum;
    const sigmaRate = alphaNum * nominalRateNum;
    const debugCellGenerationString = '';

    console.log(`Generating ${numCells} precipitation cells with nominal size ${nominalSizeNum} km and nominal rate ${nominalRateNum} mm/hr, alpha: ${alphaNum}`);

    //Check grid bounds:
    if (gridBounds.width <= 0 || gridBounds.height <= 0) {
      throw new Error('Invalid grid bounds for precipitation field generation');
    }

    for (let i = 0; i < numCells; i++) {
      // Random position within bounds
      const x = Math.random() * gridBounds.width;
      const y = Math.random() * gridBounds.height;

      // Get the Box-Muller transform for Gaussian distribution (mean=0, stddev=1)
      const gaussianRandomSize = boxMullerRandom();
      const gaussianRandomRate = boxMullerRandom();

      // Cell size based on nominal size and Gaussian variation
      // Box-Muller already generates mean=0, so just scale by sigma and add to nominal
      const size = nominalSizeNum + gaussianRandomSize * sigmaSize;
      const rate = nominalRateNum + gaussianRandomRate * sigmaRate;

      const cellConfig: IPrecipitationCellConfig = {
        center: { x, y },
        size: size,
        rate: rate,
        alpha: alpha
      };

      const cell = new PrecipitationCell(cellConfig);
      this.cells.push(cell);
      this.quadTree.insert(cell.center, cell);
    }
    console.log(debugCellGenerationString);
    console.log(`Generated ${this.cells.length} precipitation cells`);
  }

  /**
   * Sample rain rate at a specific position
   * Queries nearby cells and combines their contributions with Gaussian weighting
   * 
   * @param x - Position x coordinate (km)
   * @param y - Position y coordinate (km)
   * @returns Rain rate at position (mm/hr)
   */
  sampleRainRate(x: number, y: number): number {
    // Query nearby cells (search radius = max cell size * 3 for safety)
    const searchRadius = this.config.nominalCellSize * 10;
    const nearbyCells = this.quadTree.queryRange({ x, y }, searchRadius);

    if (nearbyCells.length === 0) {
      return 0; // No cells nearby
    }

    // Collect rain rate contributions from all nearby cells
  
    let rainRate = 0.0
    let count = 0;
    
    for (const item of nearbyCells) {
      const cell = item.data;
      if (cell.isInRange(x, y)) {
        const sigma = cell.alpha * cell.size;
        const rate = cell.getRainRateAt(x, y);
        const dist = Math.sqrt(Math.pow(x - cell.center.x, 2) + Math.pow(y - cell.center.y, 2));
        const weight = Math.exp(-dist/(2*sigma*sigma)); // Gaussian weight based on distance
        rainRate += rate*weight;
      }
    }

    // Handle overlapping cells: take maximum contribution, but cap at maxRainRateCap
    const cappedRate = Math.min( rainRate,50);

    return cappedRate;
  }

  /**
   * Get all precipitation cells (for visualization)
   */
  getCells(): PrecipitationCell[] {
    return this.cells;
  }

  /**
   * Get cells as plain objects for serialization
   */
  getCellsAsObjects(): Array<{
    center: { x: number; y: number };
    size: number;
    rate: number;
    alpha: number;
  }> {
    return this.cells.map(cell => ({
      center: cell.center,
      size: cell.size,
      rate: cell.rate,
      alpha: cell.alpha,
    }));
  }

  /**
   * Generate rain rate grid for visualization
   * 
   * @param resolution - Grid resolution (samples per km)
   * @returns 2D array of rain rates
   */
  generateRainRateGrid(resolution: number = 10): number[][] {
    const { width, height } = this.config.gridBounds;
    const gridWidth = Math.floor(width * resolution);
    const gridHeight = Math.floor(height * resolution);
    const grid: number[][] = [];

    for (let row = 0; row < gridHeight; row++) {
      const rowData: number[] = [];
      for (let col = 0; col < gridWidth; col++) {
        const x = col / resolution;
        const y = row / resolution;
        const rainRate = this.sampleRainRate(x, y);
        rowData.push(rainRate);
      }
      grid.push(rowData);
    }

    return grid;
  }

  /**
   * Get field statistics
   */
  getStatistics(): {
    numCells: number;
    avgCellSize: number;
    totalCoverage: number;
    nominalRate: number;
  } {
    const avgSize = this.cells.reduce((sum, cell) => sum + cell.size, 0) / this.cells.length;
    const totalArea = this.cells.reduce((sum, cell) => sum + Math.PI * cell.size * cell.size, 0);
    const gridArea = this.config.gridBounds.width * this.config.gridBounds.height;

    return {
      numCells: this.cells.length,
      avgCellSize: avgSize,
      totalCoverage: (totalArea / gridArea) * 100, // Percentage
      nominalRate: this.config.nominalRainRate,
    };
  }
}

/**
 * Box Mueller Transform to generate Gaussian random numbers
 * 
 * @returns Gaussian random number (mean=0, stddev=1)
 */
function boxMullerRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Avoid zero
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
