/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the middleware pipeline for WsRules.
 * @license Apache-2.0
 */

import Request from '../../Request.js';
import ServerError from '../../ServerError.js';
import LoggerManager from '../../LoggerManager.js';
import WsRule from '../WsRule.js';
import Middleware from './Middleware.js';
import WebSocket from '../../WebSocket/WebSocket.js';

const logger = LoggerManager.getInstance();

export class WsMiddleware extends Middleware<WsRule> {
    public clone(): WsMiddleware { return new WsMiddleware(this.pipeline); }
    /**
     * Runs the middleware pipeline.
     * @param request The request received by the server.
     * @param client The WebSocket connection.
     * @param action The action to execute after the middleware pipeline.
     * @param state The state to pass to the middleware and action.
     */
    public async run(request: Request, client: WebSocket, action: WsRule.action, state: Middleware.State = {}): Promise<void> {
        try {
            let index = 0;
            const next: Middleware.next = async (error?: unknown) => {
                if (error) throw error;
                if (client.isClosed) return void logger.warn('websocket was closed when calling next()');
                if (client.status === 'rejected') return void logger.warn('websocket was rejected when calling next()');
                if (index >= this.pipeline.length) {
                    if (client.status === 'pending') client.accept();
                    return await action(request, client, state);
                }
                const current = this.pipeline[index++];
                return await current(request, client, next, state);
            };
            await next();
        } catch(error) {
            if (this.errorPipeline.length === 0) return this.errorHandler(error, request, client);
            else return this.runError(error, request, client, state);
        }
    }
    public async runError(error: unknown, request: Request, client: WebSocket, state: Middleware.State = {}): Promise<void> {
        try {
            let index = 0;
            const next: Middleware.next = async (caughtError?: unknown) => {
                if (caughtError) throw caughtError;
                if (index >= this.errorPipeline.length) return await this.errorHandler(error, request, client);
                const current = this.errorPipeline[index++];
                return await current(error, request, client, next, state);
            };
            await next();
        } catch(error) { return this.errorHandler(error, request, client); }
    }
    protected async errorHandler(error: unknown, request: Request, client: WebSocket): Promise<void> {
        if (error instanceof ServerError) {
            if (error.isSended) return;
            if (client.isClosed) return void logger.error(error);
            if (client.status !== 'pending') return;
            client.reject(error.status, error.message);
        } else if (error instanceof Error) {
            logger.error(error);
            if (client.isClosed || client.status !== 'pending') return;
            client.reject(500, error.message);
        } else {
            logger.error(error);
            if (client.isClosed || client.status !== 'pending') return;
            if (client.isClosed) return;
            client.reject(500, 'Internal Server Error');
        }
    }
}
export namespace WsMiddleware {}
export default WsMiddleware;