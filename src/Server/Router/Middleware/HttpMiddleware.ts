/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the middleware pipeline for HttpRules.
 * @license Apache-2.0
 */

import Request from '../../Request.js';
import Response from '../../Response.js';
import ServerError from '../../ServerError.js';
import LoggerManager from '../../LoggerManager.js';

import HttpRule from '../HttpRule.js';
import Middleware from './Middleware.js';

const logger = LoggerManager.getInstance();

export class HttpMiddleware extends Middleware<HttpRule> {
    public clone(): HttpMiddleware { return new HttpMiddleware(this.pipeline); }
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
                if (error.isSended) return;
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
}

export default HttpMiddleware;