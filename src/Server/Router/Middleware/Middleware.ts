/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the middleware pipeline.
 * @license Apache-2.0
 */

import Request from '../../Request.js';
import Response from '../../Response.js';
import WebSocket from '../../WebSocket/WebSocket.js';
import HttpRule from '../HttpRule.js';
import WsRule from '../WsRule.js';

export abstract class Middleware<Rule extends HttpRule | WsRule> {
    public constructor(
        protected readonly pipeline: Middleware.action<Rule>[] = [],
        protected readonly errorPipeline: Middleware.errorAction<Rule>[] = []
    ) {}
    /**
     * Adds a new action to the middleware pipeline.
     * @param action - The action to add.
     */
    public use(action: Middleware.action<Rule> | Middleware<Rule>) {
        if (action instanceof Middleware) this.pipeline.push(...action.pipeline);
        else this.pipeline.push(action);
        return this;
    }
    /**
     * Adds a action to the middleware error pipeline.
     * @param action - The action to add.
     */
    public useError(action: Middleware.errorAction<Rule> | Middleware<Rule>) {
        if (action instanceof Middleware) this.errorPipeline.push(...action.errorPipeline);
        else this.errorPipeline.push(action);
        return this;
    }
    /**
     * Merges another middleware pipeline.
     * @param middleware - The middleware to merge.
     */

    public merge(middleware: Middleware<Rule>) {
        this.pipeline.push(...middleware.pipeline);
        this.errorPipeline.push(...middleware.errorPipeline);
        return this;
    }
    /**
     * Merges another middleware pipeline at the start.
     * @param middleware - The middleware to merge.
     */
    public mergeAtStart(middleware: Middleware<Rule>) {
        this.pipeline.unshift(...middleware.pipeline);
        this.errorPipeline.unshift(...middleware.errorPipeline);
        return this;
    }    
    /**
     * Clones the middleware pipeline.
     * @returns The cloned middleware pipeline.
     */
    public abstract clone(): Middleware<Rule>;
    /**
     * Runs the middleware pipeline.
     * @param args - The arguments to pass to the action.
     */
    public abstract run(...args: any[]): Promise<void>;
    /**
     * Runs the middleware error pipeline.
     * @param args - The arguments to pass to the action.
     */
    public abstract runError(...args: any[]): Promise<void>;
}
export namespace Middleware {
    export interface State {
        [key: string]: any;
    }
    export type next = (error?: unknown) => void;
    export namespace action {
        export type http = (request: Request, response: Response, next: next, state: State) => void | Promise<void>;
        export type ws = (request: Request, client: WebSocket, next: next, state: State) => void | Promise<void>;
    }
    export namespace errorAction {
        export type http = (error: unknown, request: Request, response: Response, next: next, state: State) => void | Promise<void>;
        export type ws = (error: unknown, request: Request, client: WebSocket, next: next, state: State) => void | Promise<void>;
    }
    export type action<Rule extends HttpRule | WsRule> = Rule extends WsRule ? action.ws : action.http;
    export type errorAction<Rule extends HttpRule | WsRule> = Rule extends WsRule ? errorAction.ws : errorAction.http;
}

export default Middleware;