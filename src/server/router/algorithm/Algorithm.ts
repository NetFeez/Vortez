import type Request from '../../Request.js';
import Response from '../../Response.js';
import Websocket from '../../websocket/Websocket.js';
import HttpRule from '../HttpRule.js';
import WsRule from '../WsRule.js';

export abstract class Algorithm {
    /** Get all rules in the routing algorithm. */
    public abstract get allRules(): Algorithm.ruleType[];
    /**
     * Add a rule to the routing algorithm.
     * @param rule - The rule to add.
     */
    public abstract add(...rules: Algorithm.ruleType[]): Promise<void> | void;
    /**
     * Route a request to a rule.
     * @param request - The request to route.
     * @param client - The client to route the request to.
     * @returns True if the request was routed, false otherwise.
     */
    protected abstract routeHttp(request: Request, client: Response): boolean;
    /**
     * Route a request to a rule.
     * @param request - The request to route.
     * @param client - The client to route the request to.
     * @returns True if the request was routed, false otherwise.
     */
    protected abstract routeWebsocket(request: Request, client: Websocket): boolean;
    /**
     * Route a request to a rule.
     * @param request - The request to route.
     * @param client - The client to route the request to.
     * @returns True if the request was routed, false otherwise.
     */
    public route(request: Request, client: Response | Websocket.WebsocketSSInit): boolean {
        if (client instanceof Response) return this.routeHttp(request, client);
        else if (client instanceof Websocket.WebsocketSSInit) return this.routeWebsocket(request, client);
        else throw new Error(`Invalid client type`);
    }
}
export namespace Algorithm {
    export type ruleType = HttpRule | WsRule;
}
export default Algorithm;