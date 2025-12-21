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

  /**
   * POST /api/simulation/step
   * Advance simulation by one time step and return current state
   */
  async step(req: Request, res: Response): Promise<void> {
    try {
      const { simulationKey } = req.body as { simulationKey: string };

      if (simulationKey !== this.simulationKey) {
        const response: TAPIResponse<never> = {
          success: false,
          error: 'Invalid simulation key',
        };
        res.status(403).json(response);
        return;
      }

      // Advance simulation by one time step
      const simulationComplete = this.scenario.advanceSimulationTimeStep();

      // Get current state for visualization
      const state = this.getSimulationState();

      const response: TAPIResponse<{
        timeElapsed: number;
        simulationComplete: boolean;
        state: any;
      }> = {
        success: true,
        data: {
          timeElapsed: this.scenario.getTimeElapsed(),
          simulationComplete,
          state,
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

  /**
   * GET /api/simulation/state
   * Get current simulation state without advancing time step
   */
  async getState(req: Request, res: Response): Promise<void> {
    try {
      const state = this.getSimulationState();
      
      const response: TAPIResponse<any> = {
        success: true,
        data: state,
      };
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
      const response: TAPIResponse<never> = {
        success: false,
        error: 'Error retrieving simulation state',
      };
      res.status(500).json(response);
    }
  }

  /**
   * Extract current simulation state for visualization
   */
  private getSimulationState() {
    const samPos = this.scenario.samSystem.position;
    const fighterPos = this.scenario.fighter.position;
    const distance = this.scenario.getDistanceSAMToFighter();
    
    // Get detection range at fighter's current position/azimuth
    const azimuth = this.calculateAzimuth(samPos, fighterPos);
    const fighterRCS = this.scenario.fighter.getRCSFromPosition(fighterPos, samPos,  azimuth);
    const samRangeAtAzimuth = this.scenario.getRangeAtAzimuth(azimuth); 
    const detectionRange = this.scenario.samSystem.calculateDetectionRange(
      fighterRCS,
      this.scenario.samSystem.pulseMode.numPulses,
      samRangeAtAzimuth
    );

    // Get missile states
    const missiles = this.scenario.getMissiles().map((missile, index) => ({
      id: missile.launchedBy === 'sam' ? `SAM-${missile.timeOfLaunch}` : `HARM-${missile.timeOfLaunch}`,
      launchedBy: missile.launchedBy,
      launchTime: missile.timeOfLaunch,
      position: missile.position,
      heading: missile.heading,
      velocity: missile.velocity,
      status: missile.status,
      targetPosition: missile.target.position,
    }));

    return {
      timeElapsed: this.scenario.getTimeElapsed(),
      scenario: {
        id: this.scenario.id,
        name: this.scenarioMeta.name,
        bounds: {
          minX: -this.scenarioMeta.grid.width / 2,
          maxX: this.scenarioMeta.grid.width / 2,
          minY: -this.scenarioMeta.grid.height / 2,
          maxY: this.scenarioMeta.grid.height / 2,
        },
      },
      sam: {
        position: samPos,
        state: this.scenario.samSystem.state,
        properties: {
          nominalRange: this.scenario.samSystem.nominalRange,
          memr: this.scenario.samSystem.properties.memr,
        },
      },
      fighter: {
        position: fighterPos,
        heading: this.scenario.fighter.heading,
        velocity: this.scenario.fighter.velocity,
        state: this.scenario.fighter.state,
      },
      missiles,
      distance,
      detectionRange,
      isComplete: this.scenario.engagementComplete(),
    };
  }

  /**
   * Calculate azimuth from SAM to Fighter
   */
  private calculateAzimuth(from: IPosition2D, to: IPosition2D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const azimuth = Math.atan2(dy, dx) * (180 / Math.PI);
    return azimuth < 0 ? azimuth + 360 : azimuth;
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
