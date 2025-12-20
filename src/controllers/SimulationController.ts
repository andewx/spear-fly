/**
 * Simulation Controller
 * Handles engagement simulation execution
 */

import type { Request, Response } from 'express';
import * as storage from '../services/fileStorage.js';
import { Radar } from '../scenario/Radar.js';
import { SAMSystem } from '../scenario/SAMSystem.js';
import { Fighter } from '../scenario/Fighter.js';
import { getAspectRCS, calculateEngagement } from '../services/radarCalculations.js';
import { calculatePathAttenuation } from '../scenario/PathAttenuation.js';
import * as itu from '../services/ituData.js';
import type { TAPIResponse, IEngagementResult, IScenario, IPosition2D } from '../types/index.js';
import { Scenario } from '../scenario/index.js';
import { randomUUID } from 'crypto';


export class SimulationController {
  /**
   * Constructor for SimulationController
   * Scenario-specific objects (Radar, SAMSystem, Fighter) in this instance
   * are permitted to hold state during a single simulation run. We therefore
   * lock operation to a single user with a simulationKey for the session.
   */

  private simulationKey: string;
  private keyLocked: boolean = false;
  private scenarioMeta: IScenario;
  private scenario: Scenario;
  private timeStep: number = 0.5; // default time step in seconds
  private timeElapsed: number = 0;
  
  constructor() {

    //generate random UUID for simulation session
    this.simulationKey = randomUUID();

  }

  /*
    * Initialize simulation with scenario ID passes simulationKey ID if not locked
    * simulation SAM site is initialized with precipitation attenuated ranges if precip enabled
    * POST /api/simulation/initialize
    * Body: { simulationKey : string }
    * 
  */
  async initialize(req: Request, res: Response): Promise<void> {

    //parse scenarioId from request body
    const { scenarioId, timeStep } = req.body as {
      scenarioId: string;
      timeStep?: number;  
    };

    this.scenarioMeta = await storage.loadScenario(scenarioId);
    if (!this.scenarioMeta) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    this.scenario = await Scenario.create(this.scenarioMeta, 0.5); // default timeStep 0.5s

    //return JSON response
    const response: TAPIResponse<{ simulationKey: string }> = {
      success: true,
      data: { simulationKey: this.simulationKey },
    };
    res.json(response);
  }
  /**
   * POST /api/simulation/run -- applies full engagement simulation without discrete time step requests
   * Execute engagement simulation
   */
  async run(req: Request, res: Response): Promise<void> {
    try{


      //Get simulation key for validation
      const { simulationKey } = req.body as { simulationKey: string };

      if (simulationKey !== this.simulationKey) {
        const response: TAPIResponse<never> = {
          success: false,
          error: 'Invalid simulation key',
        };
        res.status(403).json(response);
        return;
      }
    
      while(!this.scenario.engagementComplete()){
        this.scenario.advanceSimulationTimeStep();
      }

      const result = this.scenario.engagementResult();
      const response: TAPIResponse<{result: IEngagementResult}> = {
        success: true,
        data: {result: result},
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error running simulation',
      };
      res.status(500).json(response);
    }
  }

  async step(req: Request, res: Response): Promise<void> {
    try {
      const simulationComplete = this.scenario.advanceSimulationTimeStep();
      const response: TAPIResponse<{ timeElapsed: number; simulationComplete: boolean }> = {
        success: true,
        data: {
          timeElapsed: this.scenario.getTimeElapsed(),
          simulationComplete,
        },
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error advancing simulation step',
      };
      res.status(500).json(response);
    }
  }

  async reset(req: Request, res: Response): Promise<void> {
    try {
      this.scenario = await Scenario.create(this.scenarioMeta, 0.5); // default timeStep 0.5s
      const response: TAPIResponse<{ message: string }> = {
        success: true,
        data: { message: 'Simulation reset successfully' },
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error resetting simulation',
      };
      res.status(500).json(response);
    }
  }

  /**
   * GET /api/simulation/sam/nominal-ranges
   * Get SAM system nominal ranges profile
   */
  async getRangesProfile(req: Request, res: Response): Promise<void> {
    try {
      
      const ranges = this.scenario.getDetectionRanges(this.scenario.getNominalRanges(), 1.0,1.0,"incoherent");

      console.log(`SAM Ranges Profile Request Received${ranges}\n`);

      const response: TAPIResponse<Array<number>> = {
        success: true,
        data: ranges,
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      console.error('Error getting SAM nominal ranges profile:', error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error retrieving SAM nominal ranges profile',
      };
      res.status(500).json(response);
    }
  }

  async getPrecipRangesProfile(req: Request, res: Response): Promise<void> {
    try {
      const ranges = this.scenario.getDetectionRanges(this.scenario.getPrecipitationRanges(), 1.0,1.0,"incoherent");
      const response: TAPIResponse<{ranges:Array<number>}> = {
        success: true,
        data: {ranges: ranges},
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      console.error('Error getting SAM scenario ranges profile:', error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error retrieving SAM scenario ranges profile',
      };
      res.status(500).json(response);
    }
  }


  /**
   * Error handler
   */
  private handleError(res: Response, error: unknown): void {
    const response: TAPIResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(response);
  }
}
