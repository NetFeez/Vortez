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

    export class HttpMiddleware extends Middleware<HttpMiddleware.Action> {
        public [MIDDLEWARE.HTTP] = true;
        public readonly identifier = 'http';
    }

    export namespace HttpMiddleware {
        export type Action = (request: Request, response: Response, next: Next, state: State) => void | Promise<void>;
    }

    export class WebsocketMiddleware extends Middleware<WebsocketMiddleware.Action> {
        public [MIDDLEWARE.WEBSOCKET] = true;
        public readonly identifier = 'websocket';
    }

    export namespace WebsocketMiddleware {
        export type Action = (request: Request, websocket: ws.Server, next: Next, state: State) => void | Promise<void>;
    }

    export class HttpErrorMiddleware extends Middleware<HttpErrorMiddleware.Action> {
        public [MIDDLEWARE.HTTP_ERROR] = true;
        public readonly identifier = 'http-error';
    }

    export namespace HttpErrorMiddleware {
        export type Action = (error: unknown, request: Request, response: Response, next: Next, state: State) => void | Promise<void>;
    }

    export class WebsocketErrorMiddleware extends Middleware<WebsocketErrorMiddleware.Action> {
        public [MIDDLEWARE.WEBSOCKET_ERROR] = true;
        public readonly identifier = 'websocket-error';
    }

    export namespace WebsocketErrorMiddleware {
        export type Action = (error: unknown, request: Request, websocket: ws.Server, next: Next, state: State) => void | Promise<void>;
    }

    export type Type = HttpMiddleware | WebsocketMiddleware | HttpErrorMiddleware | WebsocketErrorMiddleware;
}

export default Middleware;