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

    public constructor() { super(); this.root = new RouteNode(); }

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
                } else if (segment.startsWith('$') || segment.startsWith(':')) {
                    const isOptional = segment.startsWith('$?') || segment.startsWith(':?');
                    const paramName = segment.replace(/^[\$:]\??/, '');
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
    private navigate(url: string, method?: string, isWs?: boolean): RouteNode | null {
        const segments = this.splitPath(url);
        let currentNode = this.root;

        for (const segment of segments) {
            if (currentNode.statics.has(segment)) {
                currentNode = currentNode.statics.get(segment)!;
            } else if (currentNode.params) {
                const { node } = currentNode.params;
                currentNode = node;
            } else if (currentNode.wildcard) {
                currentNode = currentNode.wildcard;
                break;
            } else if (currentNode.fifo.rules.some((rule) => rule.test(url, method, isWs))) {
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
    public override clear(): Promise<void> | void {
        this.root = new RouteNode();
    }
    public override find(url: string, method?: string, isWs?: boolean): Algorithm.ruleType | null {
        const node = this.navigate(url, method, isWs);
        return node ? node.fifo.find(url, method, isWs) : null;
    }
}
export namespace Tree { };
export default Tree;