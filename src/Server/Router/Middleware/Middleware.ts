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
        protected readonly pipeline: Middleware.action<Rule>[] = []
    ) {}
    /**
     * Adds a new action to the middleware pipeline.
     * @param action - The action to add.
     */
    public use(action: Middleware.action<Rule>) { this.pipeline.push(action); return this; }
    /**
     * Merges another middleware pipeline.
     * @param middleware - The middleware to merge.
     */
    public merge(middleware: Middleware<Rule>) { this.pipeline.push(...middleware.pipeline); return this; }
    /**
     * Merges another middleware pipeline at the start.
     * @param middleware - The middleware to merge.
     */
    public mergeAtStart(middleware: Middleware<Rule>) { this.pipeline.unshift(...middleware.pipeline); return this; }
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

}
export namespace Middleware {
    export type next = (error?: unknown) => void;
    export type httpAction = (request: Request, response: Response, next: next, state: State) => void | Promise<void>;
    export type wsAction = (request: Request, client: WebSocket, next: next, state: State) => void | Promise<void>;
    export type action<Rule extends HttpRule | WsRule> =
    Rule extends WsRule
? wsAction
: httpAction;
    export interface State {
        [key: string]: any;
    }
}

export default Middleware;