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
    public abstract find(request: Request): Algorithm.ruleType | null;
    /**
     * Test whether a request and client match any rule in the routing algorithm.
     * @param request - The request to test.
     * @param client - The client to test.
     * @returns True if a rule matches, false otherwise.
     * @remarks This method is used by the router to determine whether a request and client match any rule in the routing algorithm.
     */
    public test(request: Request): boolean {
        return this.find(request) !== null;
    }
}
export namespace Algorithm {
    export type ruleType = HttpRule | WsRule | RouterRule;
}
export default Algorithm;