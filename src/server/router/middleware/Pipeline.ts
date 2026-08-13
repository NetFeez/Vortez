import { CLIENT, MIDDLEWARE } from '../../../support/symbols.js';

import type Request from '../../Request.js';
import type Response from '../../Response.js';
import type ws from '../../websocket/ws.js';
import type Middleware from './Middleware.js';
import Tracker from '../Tracker.js';

import ServerError from '../../ServerError.js';
import LoggerManager from '../../LoggerManager.js';

const logger = LoggerManager.getInstance();

export class Pipeline {
    private readonly pipeline: Middleware.Type[] = [];

    public constructor(pipeline: Middleware.Type[] = []) {
        this.pipeline = [...pipeline];
    }

    /**
     * Add middleware or another pipeline to the current pipeline.
     * @param items The middleware or pipelines to add.
     * @returns The current pipeline instance for chaining.
     */
    public use(...items: (Middleware.Type | Pipeline)[]): this {
        for (const item of items) {
            if (item instanceof Pipeline) this.pipeline.push(...item.pipeline);
            else this.pipeline.push(item);
        }
        return this;
    }

    /**
     * Run the middleware pipeline for the given request and client type (HTTP or WebSocket).
     * @param request The request to process.
     * @param client The client (HTTP response or WebSocket) to process the request for.
     * @param destination An optional function to call after the middleware pipeline is complete.
     * @param state The current state of the middleware pipeline.
     * @param tracker Optional execution tracker instance.
     * @throws Any error that occurs during the execution of the middleware pipeline.
     * @returns A promise that resolves when the middleware pipeline is complete.
     */
    public async run(request: Request, client: Response | ws.Server, destination?: Pipeline.Destination, state: Middleware.State = {}, tracker?: Tracker): Promise<void> {
        tracker ??= new Tracker(request, client);
        try {
            if (CLIENT.HTTP in client) return await this.runHttp(request, client, destination, state, tracker);
            else return await this.runWs(request, client, destination, state, tracker);
        } catch (error) {
            tracker.fail(error);
            return await this.runError(error, request, client, state, tracker);
        }
    }

    /**
     * Run the error handling pipeline for the given client type (HTTP or WebSocket).
     * @param error The error that occurred.
     * @param request The request that triggered the error.
     * @param client The client (HTTP response or WebSocket) to handle the error for.
     * @param state The current state of the middleware pipeline.
     * @param tracker Execution tracker instance.
     * @throws Unhandled errors that are not caught by any middleware in the error handling pipeline.
     * @returns A promise that resolves when the error handling pipeline is complete.
     */
    public async runError(error: unknown, request: Request, client: Response | ws.Server, state: Middleware.State = {}, tracker?: Tracker): Promise<void> {
        if (CLIENT.HTTP in client) return await this.runHttpError(error, request, client, state, tracker);
        else return await this.runWsError(error, request, client, state, tracker);
    }

    /**
     * Run the HTTP middleware pipeline.
     * @param request The HTTP request.
     * @param response The HTTP response.
     * @param destination An optional function to call after the middleware pipeline is complete.
     * @param state The current state of the middleware pipeline.
     * @param tracker Execution tracker instance.
     * @throws Any error that occurs during the execution of the middleware pipeline.
     * @returns A promise that resolves when the middleware pipeline is complete.
     */
    protected async runHttp(request: Request, response: Response, destination?: Pipeline.Destination, state: Middleware.State = {}, tracker?: Tracker): Promise<void> {
        tracker ||= new Tracker(request, response);
        tracker.markExecuting();
        const pipe = this.pipeline.filter(middleware => MIDDLEWARE.HTTP in middleware);

        let index = 0;
        const next: Middleware.Next = async (error) => {
            if (error) throw error;
            if (response.isSent) {
                tracker.markSent();
                return void logger.warn('response was already sent when calling next()');
            }
            if (index >= pipe.length) { if (destination) await destination(state); return; }

            const depth = index;
            const current = pipe[index++];
            const name = current.action.name || current.identifier;

            let called = false;
            let resolved = false;
            const wrappedNext: Middleware.Next = async (error) => {
                called = true;
                tracker.beginNext(depth, name);
                try { await next(error); }
                finally { resolved = true; tracker.endNext(depth); }
            };

            const result = current.run(request, response, wrappedNext, state);
            if (result instanceof Promise) await result;
            if (!called && !response.isSent) throw new ServerError(500, `[Pipeline Error] Middleware "${name}" (depth ${depth}) ended request execution without calling next() or sending a response.`);
            if (called) tracker.verifyAwait(depth, name, resolved);
        };

        await next();
    }

    /**
     * Run the WebSocket middleware pipeline.
     * @param request The request that initiated the WebSocket connection.
     * @param ws The WebSocket connection.
     * @param destination An optional function to call after the middleware pipeline is complete.
     * @param state The current state of the middleware pipeline.
     * @param tracker Execution tracker instance.
     * @throws Any error that occurs during the execution of the middleware pipeline.
     * @returns A promise that resolves when the middleware pipeline is complete.
     */
    protected async runWs(request: Request, ws: ws.Server, destination?: Pipeline.Destination, state: Middleware.State = {}, tracker?: Tracker): Promise<void> {
        tracker ||= new Tracker(request, ws);
        tracker.markExecuting();
        const pipe = this.pipeline.filter((middleware) => MIDDLEWARE.WEBSOCKET in middleware);

        let index = 0;
        const next: Middleware.Next = async (error) => {
            if (error) throw error;
            if (ws.isClosed) return void logger.warn('websocket was closed when calling next()');
            if (ws.status === 'closed') return void logger.warn('websocket was rejected when calling next()');

            if (index >= pipe.length) {
                if (ws.status === 'handshake') await ws.accept();
                if (destination) await destination(state);
                ws.flush();
                return;
            }

            const depth = index;
            const current = pipe[index++];
            const name = current.action.name || current.identifier;

            let called = false;
            let resolved = false;
            const wrappedNext: Middleware.Next = async (error): Promise<void> => {
                called = true;
                tracker.beginNext(depth, name);
                try { await next(error); }
                finally { resolved = true; tracker.endNext(depth); }
            };

            const result = current.run(request, ws, wrappedNext, state);
            if (result instanceof Promise) await result;
            if (!called && !ws.isClosed && ws.status === 'handshake') throw new ServerError(500, `[Pipeline Error] Middleware "${name}" (depth ${depth}) ended request execution without calling next() or handling websocket connection.`);
            if (called) tracker.verifyAwait(depth, name, resolved);
        };

        await next();
    }

    /**
     * Run the error handling pipeline for HTTP errors.
     * @param initialError The error that occurred.
     * @param request The request that triggered the error.
     * @param response The response object to send the error to.
     * @param state The current state.
     * @param tracker Execution tracker instance.
     * @throws The error if it is not handled by any middleware.
     * @returns A promise that resolves when the error handling is complete.
     */
    protected async runHttpError(initialError: unknown, request: Request, response: Response, state: Middleware.State, tracker?: Tracker): Promise<void> {
        const pipe = this.pipeline.filter(middleware => MIDDLEWARE.HTTP_ERROR in middleware);
        let index = 0;
        const next: Middleware.Next = async (nextError?: unknown) => {
            const error = nextError ?? initialError;
            if (index >= pipe.length) throw error;
            const current = pipe[index++];
            return await current.run(error, request, response, next, state);
        };
        await next(initialError);
    }

    /**
     * Run the error handling pipeline for WebSocket errors.
     * @param initialError The error that occurred.
     * @param request The request that triggered the error.
     * @param ws The WebSocket connection.
     * @param state The current state.
     * @param tracker Execution tracker instance.
     * @throws The error if it is not handled by any middleware.
     * @returns A promise that resolves when the error handling is complete.
     */
    protected async runWsError(initialError: unknown, request: Request, ws: ws.Server, state: Middleware.State, tracker?: Tracker): Promise<void> {
        const pipe = this.pipeline.filter(middleware => MIDDLEWARE.WEBSOCKET_ERROR in middleware);
        let index = 0;
        const next: Middleware.Next = async (nextError?: unknown) => {
            const error = nextError ?? initialError;
            if (index >= pipe.length) throw error;
            const current = pipe[index++];
            return await current.run(error, request, ws, next, state);
        };
        await next(initialError);
    }
    public get middlewareNames(): string[] { return this.pipeline.map(middleware => middleware.action.name || middleware.identifier); }
}

export namespace Pipeline {
    export type Destination = (state: Middleware.State) => Promise<void>;
}

export default Pipeline;