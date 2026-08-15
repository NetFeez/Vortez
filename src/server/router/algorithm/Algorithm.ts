import type Request from '../../Request.js';
import type Response from '../../Response.js';
import type HttpRule from '../rule/HttpRule.js';
import type WsRule from '../rule/WsRule.js';
import type ws from '../../websocket/ws.js';
import RouterRule from '../rule/RouterRule.js';

export abstract class Algorithm {
    /** Get all rules in the routing algorithm. */
    public abstract get rules(): Algorithm.ruleType[];
    /**
     * Add a rule to the routing algorithm.
     * @param rule - The rule to add.
     */
    public abstract add(...rules: Algorithm.ruleType[]): Promise<void> | void;
    /**
     * Remove all rules from the routing algorithm.
     * @remarks This method is used by the router to clear all rules from the routing algorithm.
     * It is called when the router is reset or when a new routing algorithm is set.
     */
    public abstract clear(): Promise<void> | void;
    /**
     * Find a rule that matches the request and client.
     * @param request - The request to match.
     * @param client - The client to match.
     * @returns The matching rule, or null if no rule matches.
     * @remarks This method is used by the router to find a rule that matches the incoming request and client.
     */
    public abstract find(url: string, method?: string, isWs?: boolean): Algorithm.ruleType | null;
    /**
     * Test whether a URL and optional method/type match any rule in the routing algorithm.
     * @param url - The URL to test.
     * @param method - Optional HTTP method to match.
     * @param isWs - Optional flag indicating if request is WebSocket.
     * @returns True if a rule matches, false otherwise.
     */
    public test(url: string, method: Request.Method = 'GET', isWs: boolean = false): boolean {
        return this.find(url, method, isWs) !== null;
    }
}
export namespace Algorithm {
    export type ruleType = HttpRule | WsRule | RouterRule;
}
export default Algorithm;