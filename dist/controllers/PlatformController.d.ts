/**
 * Platform Controller
 * Handles SAM and Fighter platform operations
 */
import type { Request, Response } from 'express';
export declare class PlatformController {
    /**
     * GET /api/platforms or /platforms
     * List all platforms (SAMs and Fighters)
     */
    listAll(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/platforms/:type/:id
     * Get specific platform by type and ID
     */
    getById(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/platforms
     * Create new platform
     */
    create(req: Request, res: Response): Promise<void>;
    /**
     * PUT /api/platforms/:type/:id
     * Update existing platform
     */
    update(req: Request, res: Response): Promise<void>;
    /**
     * DELETE /api/platforms/:type/:id
     * Delete platform
     */
    delete(req: Request, res: Response): Promise<void>;
    /**
     * Error handler
     */
    private handleError;
}
//# sourceMappingURL=PlatformController.d.ts.map