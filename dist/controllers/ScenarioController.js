/**
 * Scenario Controller
 * Handles scenario CRUD operations
 */
import { randomUUID } from 'crypto';
import * as storage from '../services/fileStorage.js';
import { sendView } from '../services/templateRenderer.js';
export class ScenarioController {
    /**
     * GET /api/scenarios or /scenarios
     * List all scenarios
     */
    async listAll(req, res) {
        try {
            const scenarios = await storage.listAllScenarios();
            // Check if this is a web request (not an API request)
            const isAPIRequest = req.originalUrl.startsWith('/api/');
            if (!isAPIRequest) {
                await sendView(res, 'scenarios', {
                    scenarios,
                }, {
                    title: 'Scenarios',
                    page: 'scenarios',
                });
                return;
            }
            const response = {
                success: true,
                data: scenarios,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    /**
     * GET /api/scenarios/:id
     * Get specific scenario by ID
     */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const scenario = await storage.loadScenario(id);
            if (!scenario) {
                const response = {
                    success: false,
                    error: 'Scenario not found',
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: scenario,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    /**
     * POST /api/scenarios
     * Create new scenario
     */
    async create(req, res) {
        try {
            let data = req.body;
            const scenario = req.body;
            if (data.environment.precipitation?.enabled === 'on' || data.environment.precipitation?.enabled === true) {
                scenario.environment.precipitation.enabled = true;
            }
            //log data and scenario data for debugging:
            console.log('Create scenario request data:', data);
            console.log('Create scenario request scenario:', scenario);
            // Generate ID and timestamps if not provided
            if (!scenario.id) {
                scenario.id = randomUUID();
            }
            scenario.createdAt = new Date();
            scenario.updatedAt = new Date();
            await storage.saveScenario(scenario);
            const response = {
                success: true,
                data: scenario,
            };
            res.status(201).json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    /**
     * PUT /api/scenarios/:id
     * Update existing scenario
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const scenario = req.body;
            let data = req.body;
            // Ensure ID matches and update timestamp
            scenario.id = id;
            scenario.updatedAt = new Date();
            if (data.environment.precipitation?.enabled === 'on' || data.environment.precipitation?.enabled === true) {
                scenario.environment.precipitation.enabled = true;
            }
            await storage.saveScenario(scenario);
            const response = {
                success: true,
                data: scenario,
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    /**
     * DELETE /api/scenarios/:id
     * Delete scenario
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const deleted = await storage.deleteScenario(id);
            if (!deleted) {
                const response = {
                    success: false,
                    error: 'Scenario not found',
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: { deleted: true },
            };
            res.json(response);
        }
        catch (error) {
            this.handleError(res, error);
        }
    }
    /**
     * Error handler
     */
    handleError(res, error) {
        const response = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
        res.status(500).json(response);
    }
}
//# sourceMappingURL=ScenarioController.js.map