import { CLIENT } from '../../../support/symbols.js';

import type Request from '../../Request.js';
import type Response from '../../Response.js';
import type Websocket from '../../websocket/ws.js';
import type HttpRule from '../rule/HttpRule.js';
import type WsRule from '../rule/WsRule.js';

import Algorithm from './Algorithm.js';
import FIFO from './FIFO.js';

class RouteNode {
    public statics: RouteNode.statics;
    public params?: RouteNode.Param;
    public wildcard?: RouteNode;
    public fifo: FIFO;

    public constructor() {
        this.statics = new Map();
        this.fifo = new FIFO();
    }
    public get rules(): Algorithm.ruleType[] {
        const rules = [...this.fifo.rules];
        if (this.wildcard) rules.push(...this.wildcard.rules);
        if (this.params) rules.push(...this.params.node.rules);
        for (const node of this.statics.values()) rules.push(...node.rules);
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
    public override get rules(): Algorithm.ruleType[] { return this.root.rules; }
    public override add(...rules: Algorithm.ruleType[]): void {
        for (const rule of rules) {
            const segments = this.splitPath(rule.template);
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
						currentNode.fifo.add(rule);
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
            currentNode.fifo.add(rule);
        }
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
            } else if (currentNode.fifo.rules.some((rule) => rule.test(request))) {
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
    
    public override find(request: Request): Algorithm.ruleType | null {
        request.ruleParams = {};
        const node = this.navigate(request);
        if (!node) return null;
        return node.fifo.find(request);
    }
}
export namespace Tree {};
export default Tree;