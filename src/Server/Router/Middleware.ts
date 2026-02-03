/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the middleware pipeline.
 * @license Apache-2.0
 */

import Request from '../Request.js';
import Response from '../Response.js';
import LoggerManager from '../LoggerManager.js';
import ServerError from '../ServerError.js';
import HttpRule from './HttpRule.js';

const logger = LoggerManager.getInstance();

export class Middleware {
    public constructor(
        private readonly pipeline: Middleware.action[] = []
    ) {}
    /**
     * Adds a new action to the middleware pipeline.
     * @param action - The action to add.
     */
    public use(action: Middleware.action) { this.pipeline.push(action); return this; }
    /**
     * Merges another middleware pipeline.
     * @param middleware - The middleware to merge.
     */
    public merge(middleware: Middleware) { this.pipeline.push(...middleware.pipeline); return this; }
    /**
     * Merges another middleware pipeline at the start.
     * @param middleware - The middleware to merge.
     */
    public mergeAtStart(middleware: Middleware) { this.pipeline.unshift(...middleware.pipeline); return this; }
    /**
     * Runs the middleware pipeline.
     * @param request - The request received by the server.
     * @param response - The response to be sent by the server.
     * @param action - The action to run.
     * @param state - The state to pass to the action.
     */
    public async run(request: Request, response: Response, action: HttpRule.action, state: Middleware.State = {}): Promise<void> {
        try {
            let index = 0;
            const next: Middleware.next = async (error?: unknown) => {
                if (error) throw error;
                if (index >= this.pipeline.length) return await action(request, response, state);
                const current = this.pipeline[index++];
                return await current(request, response, next, state);
            };
            await next();
        } catch(error) {
            if (error instanceof ServerError) {
                if (response.isSended) return void logger.warn('throw ApiError used when response was already sent');
                response.sendError(error.status, error.message);
            } else if (error instanceof Error) {
                logger.error(error);
                if (response.isSended) return;
                response.sendError(500, error.message);
            } else {
                logger.error(error);
                if (response.isSended) return;
                response.sendError(500, 'Internal Server Error');
            }
        }
    }
    /**
     * Clones the middleware pipeline.
     * @returns The cloned middleware pipeline.
     */
    public clone(): Middleware { return new Middleware(this.pipeline); }
}
export namespace Middleware {
    export type next = (error?: unknown) => void;
    export type action = (request: Request, response: Response, next: next, state: State) => void | Promise<void>;
    export type errorAction = (error: unknown, request: Request, response: Response, next: next, state: State) => void | Promise<void>;
    export interface State {
        [key: string]: any;
    }
}

export default Middleware;