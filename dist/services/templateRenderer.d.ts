/**
 * Template rendering utilities
 * Provides helper functions for controllers to render views
 */
import type { Response } from 'express';
export interface IRenderOptions {
    layout?: string | false;
    page?: string;
    title?: string;
    [key: string]: unknown;
}
/**
 * Render a view with or without layout
 *
 * @param viewName - Name of the view file (without .ejs extension)
 * @param data - Data to pass to the template
 * @param options - Rendering options (layout, page, title, etc.)
 * @returns Rendered HTML string
 */
export declare function renderView(viewName: string, data?: Record<string, unknown>, options?: IRenderOptions): Promise<string>;
/**
 * Send rendered view as HTTP response
 *
 * @param res - Express response object
 * @param viewName - Name of the view file
 * @param data - Data to pass to the template
 * @param options - Rendering options
 */
export declare function sendView(res: Response, viewName: string, data?: Record<string, unknown>, options?: IRenderOptions): Promise<void>;
/**
 * Send JSON or HTML response based on Accept header
 * Useful for controllers that support both API and web views
 *
 * @param res - Express response object
 * @param data - Data to send/render
 * @param viewName - View name for HTML rendering
 * @param options - Rendering options for HTML
 */
export declare function sendViewOrJSON(res: Response, data: Record<string, unknown>, viewName: string, options?: IRenderOptions): Promise<void>;
//# sourceMappingURL=templateRenderer.d.ts.map