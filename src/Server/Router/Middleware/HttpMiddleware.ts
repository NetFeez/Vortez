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
    public clone(): HttpMiddleware { return new HttpMiddleware(this.pipeline, this.errorPipeline); }
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
                    if (response.isSended) return void logger.warn('response was already sent when calling next()');
                    if (index >= this.pipeline.length) return await action(request, response, state);
                    const current = this.pipeline[index++];
                    return await current(request, response, next, state);
                };
                await next();
            } catch(error) {
                if (this.errorPipeline.length === 0) return this.errorHandler(error, request, response);
                else return this.runError(error, request, response, state);
            }
        }
        /**
         * Runs the error pipeline.
         * @param error - The error to handle.
         * @param request - The request received by the server.
         * @param response - The response to be sent by the server.
         * @param state - The state to pass to the action.
         */
        public async runError(error: unknown, request: Request, response: Response, state: Middleware.State = {}): Promise<void> {
            try {
                let index = 0;
                const next: Middleware.next = async (error?: unknown) => {
                    if (error) throw error;
                    if (index >= this.errorPipeline.length) return await this.errorHandler(error, request, response);
                    const current = this.errorPipeline[index++];
                    return await current(error, request, response, next, state);
                };
                await next();
            } catch(error) { return this.errorHandler(error, request, response); }
        }
        /**
         * Handles errors.
         * @param error - The error to handle.
         */
        protected async errorHandler(error: unknown, request: Request, response: Response): Promise<void> {
            if (error instanceof ServerError) {
                if (response.isSended) return void logger.warn('throw ApiError used when response was already sent');
                return response.sendError(error.status, error.message);
            } else if (error instanceof Error) {
                logger.error(error);
                if (response.isSended) return;
                return response.sendError(500, error.message);
            } else {
                logger.error(error);
                if (response.isSended) return;
                return response.sendError(500, 'Internal Server Error');
            }
        }
}

export default HttpMiddleware;