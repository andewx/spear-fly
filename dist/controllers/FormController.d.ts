/**
 * Form Controller
 * Handles dynamic form rendering for overlays
 */
import type { Request, Response } from 'express';
export declare class FormController {
    /**
     * GET /forms/platform/create
     * Render platform creation form
     */
    platformCreate(_req: Request, res: Response): Promise<void>;
    /**
     * GET /forms/scenario/create
     * Render scenario creation form
     */
    scenarioCreate(_req: Request, res: Response): Promise<void>;
    /**
     * GET /forms/scenario/edit/:id
     * Render scenario edit form
     */
    scenarioEdit(req: Request, res: Response): Promise<void>;
    /**
     * GET /forms/platform/edit/:type/:id
     * Render platform edit form
     */
    platformEdit(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=FormController.d.ts.map