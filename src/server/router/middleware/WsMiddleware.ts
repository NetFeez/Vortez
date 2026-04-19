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
import Websocket from '../../websocket/Websocket.js';

const logger = LoggerManager.getInstance();

export class WsMiddleware extends Middleware<WsRule> {
    public clone(): WsMiddleware { return new WsMiddleware([...this.pipeline], [...this.errorPipeline]); }
    /**
     * Runs the middleware pipeline.
     * @param request The request received by the server.
     * @param websocket The WebSocket connection.
     * @param action The action to execute after the middleware pipeline.
     * @param state The state to pass to the middleware and action.
     */
    public async run(request: Request, websocket: Websocket.WebsocketSSInit, action: WsRule.action, state: Middleware.State = {}): Promise<void> {
        try {
            let index = 0;
            const next: Middleware.next = async (error?: unknown) => {
                if (error) throw error;
                if (websocket.isClosed) return void logger.warn('websocket was closed when calling next()');
                if (websocket.status === 'closed') return void logger.warn('websocket was rejected when calling next()');
                if (index >= this.pipeline.length) {
                    if (websocket.status === 'handshake') websocket.accept();
                    await action(request, websocket, state);
                    return websocket.flush();
                }
                const current = this.pipeline[index++];
                return await current(request, websocket, next, state);
            };
            await next();
        } catch(error) {
            if (this.errorPipeline.length === 0) return this.errorHandler(error, request, websocket);
            else return this.runError(error, request, websocket, state);
        }
    }
    public async runError(error: unknown, request: Request, websocket: Websocket.WebsocketSSInit, state: Middleware.State = {}): Promise<void> {
        try {
            let index = 0;
            const next: Middleware.next = async (caughtError?: unknown) => {
                if (caughtError) throw caughtError;
                if (index >= this.errorPipeline.length) return await this.errorHandler(error, request, websocket);
                const current = this.errorPipeline[index++];
                return await current(error, request, websocket, next, state);
            };
            await next();
        } catch(error) { return this.errorHandler(error, request, websocket); }
    }
    protected async errorHandler(error: unknown, request: Request, websocket: Websocket.WebsocketSSInit): Promise<void> {
        if (error instanceof ServerError) {
            if (error.isSended) return;
            if (websocket.isClosed) return void logger.error(error);
            if (websocket.status !== 'handshake') return;
            websocket.reject(error.status, error.message);
        } else if (error instanceof Error) {
            logger.error(error);
            if (websocket.isClosed || websocket.status !== 'handshake') return;
            websocket.reject(500, error.message);
        } else {
            logger.error(error);
            if (websocket.isClosed || websocket.status !== 'handshake') return;
            if (websocket.isClosed) return;
            websocket.reject(500, 'Internal Server Error');
        }
    }
}
export namespace WsMiddleware {}
export default WsMiddleware;