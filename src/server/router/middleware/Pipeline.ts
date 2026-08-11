import Request from '../../Request.js';
import Response from '../../Response.js';
import ws from '../../websocket/ws.js';
import ServerError from '../../ServerError.js';
import LoggerManager from '../../LoggerManager.js';
import Middleware from './Middleware.js';
import { CLIENT, MIDDLEWARE } from '../../../support/symbols.js';

const logger = LoggerManager.getInstance();

export class Pipeline {
    private readonly pipeline: Middleware.Type[] = [];

    public constructor(pipeline: Middleware.Type[] = []) {
        this.pipeline = [...pipeline];
    }
    public use(...items: (Middleware.Type | Pipeline)[]): this {
        for (const item of items) {
            if (item instanceof Pipeline) this.pipeline.push(...item.pipeline);
            else this.pipeline.push(item);
        }
        return this;
    }

    public async run(request: Request, client: Response | ws.Server, destination?: Pipeline.Destination, state: Middleware.State = {}): Promise<void> {
        try {
            if (client instanceof Response) return this.runHttp(request, client, destination, state);
            else return this.runWs(request, client, destination, state);
        } catch (error) { return this.runError(error, request, client, state); }
    }
    public runError(error: unknown, request: Request, client: Response | ws.Server, state: Middleware.State = {}): Promise<void> {
        try {
            if (client instanceof Response) return this.runHttpError(error, request, client, state);
            else return this.runWsError(error, request, client, state);
        } catch (error) { this.fallbackErrorHandler(error, request, client); return Promise.resolve(); }
    }
    protected async runHttp(request: Request, response: Response, destination?: Pipeline.Destination, state: Middleware.State = {}): Promise<void> {
        const pipe = this.pipeline.filter(middleware => MIDDLEWARE.HTTP in middleware);

        let index = 0;
        const next = async (error?: unknown): Promise<void> => {
            if (error) throw error;
            if (response.isSent) return void logger.warn('response was already sent when calling next()');
            if (index >= pipe.length) { if (destination) await destination(state); return; }
            const current = pipe[index++];
            return await current.run(request, response, next, state);
        };

        await next();
    }
    protected async runWs(request: Request, ws: ws.Server, destination?: Pipeline.Destination, state: Middleware.State = {}): Promise<void> {        
        const pipe = this.pipeline.filter((middleware) => MIDDLEWARE.WEBSOCKET in middleware);

        let index = 0;
        const next = async (error?: unknown): Promise<void> => {
            if (error) throw error;
            if (ws.isClosed) return void logger.warn('websocket was closed when calling next()');
            if (ws.status === 'closed') return void logger.warn('websocket was rejected when calling next()');

            if (index >= pipe.length) {
                if (ws.status === 'handshake') await ws.accept();
                if (destination) await destination(state);
                ws.flush();
                return;
            }

            const current = pipe[index++];
            return await current.run(request, ws, next, state);
        };

        await next();
    }
    protected async runHttpError(error: unknown, request: Request, response: Response, state: Middleware.State): Promise<void> {
        const errorPipe = this.pipeline.filter(middleware => MIDDLEWARE.HTTP_ERROR in middleware);
        let index = 0;
        const nextError = async (caughtError?: unknown): Promise<void> => {
            if (caughtError) throw caughtError;
            if (index >= errorPipe.length) return await this.fallbackErrorHandler(error, request, response);
            const current = errorPipe[index++];
            return await current.run(error, request, response, nextError, state);
        };

        await nextError();
    }
    protected async runWsError(error: unknown, request: Request, ws: ws.Server, state: Middleware.State): Promise<void> {
        const errorPipe = this.pipeline.filter(middleware => MIDDLEWARE.WEBSOCKET_ERROR in middleware);
        let index = 0;
        const nextError = async (caughtError?: unknown): Promise<void> => {
            if (caughtError) throw caughtError;
            if (index >= errorPipe.length) return await this.fallbackErrorHandler(error, request, ws);
            const current = errorPipe[index++];
            return await current.run(error, request, ws, nextError, state);
        };

        await nextError();
    }
    protected async fallbackErrorHandler(error: unknown, request: Request, client: Response | ws.Server): Promise<void> {
        if (client instanceof Response) {
            if (error instanceof ServerError) {
                if (client.isSent) return void logger.warn('throw ApiError used when response was already sent');
                return client.status(error.status).send(error.message);
            } else if (error instanceof Error) {
                logger.error(error);
                if (client.isSent) return;
                return client.status(500).send(`Internal Server Error ${error.message}`);
            } else {
                logger.error(error);
                if (client.isSent) return;
                return client.status(500).send('Internal Server Error');
            }
        } else {
            if (error instanceof ServerError) {
                if (error.isSended) return;
                if (client.isClosed) return void logger.error(error);
                if (client.status !== 'handshake') return;
                await client.reject(error.status, error.message);
            } else if (error instanceof Error) {
                logger.error(error);
                if (client.isClosed || client.status !== 'handshake') return;
                await client.reject(500, error.message);
            } else {
                logger.error(error);
                if (client.isClosed || client.status !== 'handshake') return;
                await client.reject(500, 'Internal Server Error');
            }
        }
    }
    public get middlewareNames(): string[] { return this.pipeline.map(middleware => middleware.action.name || middleware.identifier); }
}

export namespace Pipeline {
    export type Destination = (state: Middleware.State) => Promise<void>;
}

export default Pipeline;