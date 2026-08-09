import { MIDDLEWARE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type Response from "../../Response.js";
import type ws from "../../websocket/ws.js";

export abstract class Middleware<Action extends (...args: any[]) => void | Promise<void>> {
    public [MIDDLEWARE.BASE] = true;
    public abstract readonly identifier: string;
    public readonly action: Action;
    public constructor(action: Action) { this.action = action; }
    /**
     * Executes the middleware's action.
     * @param args - The arguments to pass to the middleware's action.
     */
    public run(...args: Parameters<Action>): void | Promise<void> {
        return this.action(...args);
    };
}

export namespace Middleware {
    export interface State {
        [key: string]: any;
    }

    export type Next = (error?: unknown) => void | Promise<void>;

    export class Http extends Middleware<Http.Action> {
        public [MIDDLEWARE.HTTP] = true;
        public readonly identifier = 'http';
    }

    export namespace Http {
        export type Action = (request: Request, response: Response, next: Next, state: State) => void | Promise<void>;
    }

    export class Ws extends Middleware<Ws.Action> {
        public [MIDDLEWARE.WEBSOCKET] = true;
        public readonly identifier = 'websocket';
    }

    export namespace Ws {
        export type Action = (request: Request, websocket: ws.Server, next: Next, state: State) => void | Promise<void>;
    }

    export class HttpError extends Middleware<HttpError.Action> {
        public [MIDDLEWARE.HTTP_ERROR] = true;
        public readonly identifier = 'http-error';
    }

    export namespace HttpError {
        export type Action = (error: unknown, request: Request, response: Response, next: Next, state: State) => void | Promise<void>;
    }

    export class WsError extends Middleware<WsError.Action> {
        public [MIDDLEWARE.WEBSOCKET_ERROR] = true;
        public readonly identifier = 'websocket-error';
    }

    export namespace WsError {
        export type Action = (error: unknown, request: Request, websocket: ws.Server, next: Next, state: State) => void | Promise<void>;
    }

    export type Type = Http | Ws | HttpError | WsError;
}

export import HttpMiddleware = Middleware.Http;
export import WebsocketMiddleware = Middleware.Ws;
export import HttpErrorMiddleware = Middleware.HttpError;
export import WebsocketErrorMiddleware = Middleware.WsError;

export type State = Middleware.State;
export type Next = Middleware.Next;
export type MiddlewareType = Middleware.Type;

export default Middleware;