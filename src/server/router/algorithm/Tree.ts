import type Request from '../../Request.js';
import Algorithm from './Algorithm.js';
import Response from '../../Response.js';
import Websocket from '../../websocket/Websocket.js';
import FIFO from './FIFO.js';

class RouteNode {
    public statics: RouteNode.statics;
    public params?: RouteNode.Param;
    public wildcard?: RouteNode;
    public rules: FIFO;

    public constructor() {
        this.statics = new Map();
        this.rules = new FIFO();
    }
    public get allRules(): Algorithm.ruleType[] {
        const rules = [...this.rules.allRules];
        if (this.wildcard) rules.push(...this.wildcard.allRules);
        if (this.params) rules.push(...this.params.node.allRules);
        for (const node of this.statics.values()) rules.push(...node.allRules);
        return rules;
    }
}
namespace RouteNode {
    export type statics = Map<string, RouteNode>;
    export interface Param {
        name: string;
        isOptional: boolean;
        node: RouteNode;
    }
}

export class Tree extends Algorithm {
    private root: RouteNode;
    public constructor() { super();
        this.root = new RouteNode();
    }
    public get allRules(): Algorithm.ruleType[] { return this.root.allRules; }
    public override add(...rules: Algorithm.ruleType[]): void {
        for (const rule of rules) {
            const segments = this.splitPath(rule.urlRule);
            let currentNode = this.root;
            for (let index = 0; index < segments.length; index++) {
                const segment = segments[index];
                if (segment === '*') {
                    currentNode.wildcard ??= new RouteNode();
                    currentNode = currentNode.wildcard;
                } else if (segment.startsWith('$')) {
                    const isOptional = segment.startsWith('$?');
                    const paramName = segment.replace(/^\$\??/, '');
					if (isOptional && index === segments.length - 1) {
						currentNode.rules.add(rule);
						break;
					}
                    currentNode.params ??= { name: paramName, isOptional, node: new RouteNode() };
                    currentNode = currentNode.params.node;
                } else {
                    if (!currentNode.statics.has(segment)) {
                        currentNode.statics.set(segment, new RouteNode());
                    }
                    currentNode = currentNode.statics.get(segment)!;
                }
            }
            currentNode.rules.add(rule);
        }
    }
    /**
     * Route a request to a rule.
     * @param request - The request to route.
     * @param client - The client to route the request to.
     * @returns True if the request was routed, false otherwise.
     */
    protected override routeHttp(request: Request, client: Response): boolean {
        request.ruleParams = {}; 
        const node = this.navigate(request);
        if (!node) return false;
        return node.rules.route(request, client);
    }
    /**
     * Route a websocket to a rule.
     * @param request - The request to route.
     * @param client - The client to route the request to.
     * @returns True if the request was routed, false otherwise.
     */
    protected override routeWebsocket(request: Request, client: Websocket.WebsocketSSInit): boolean {
        request.ruleParams = {};
        const node = this.navigate(request);
        if (!node) return false;
        return node.rules.route(request, client);
    }
    /**
     * Navigate to a route node.
     * @param request - The request to navigate to.
     * @returns The route node or null if not found.
     */
    private navigate(request: Request): RouteNode | null {
        const segments = this.splitPath(request.url);
        let currentNode = this.root;

        for (const segment of segments) {
            if (currentNode.statics.has(segment)) {
                currentNode = currentNode.statics.get(segment)!;
            } else if (currentNode.params) {
                const { name, node } = currentNode.params;
                request.ruleParams[name] = segment; 
                currentNode = node;
            } else if (currentNode.wildcard) {
                currentNode = currentNode.wildcard;
                break;
            } else if (currentNode.rules.allRules.some((rule) => rule.test(request))) {
                return currentNode;
            } else return null;
        }
        return currentNode;
    }
    /**
     * Split a path into segments.
     * @param path - The path to split.
     * @returns An array of segments.
     */
    private splitPath(path: string): string[] {
        return path.split('/').filter(p => p.length > 0);
    }
}
export namespace Tree {};
export default Tree;