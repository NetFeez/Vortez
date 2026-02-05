/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Contains routing rule logic for Vortez.
 * @license Apache-2.0
 */

import Request from '../Request.js';
import Response from '../Response.js';
import Websocket from '../websocket/Websocket.js';

export abstract class Rule<T extends any> {
    /** The UrlRule with which the routing rule was created */
    public urlRule: string;
    /** The regular expression for the routing rule */
    public expression: RegExp;
    /** The executable content for the routing rule */
    public action: T;
    /**
     * Creates a routing rule for Vortez.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     */
    public constructor(urlRule: string, action: T) {
        if (!urlRule.startsWith('/')) urlRule = '/' + urlRule;
        if (urlRule.endsWith('/')) urlRule = urlRule.slice(0, -1);
        this.urlRule = urlRule;
        this.expression = this.createExpression(urlRule);
        this.action = action;
    }
    /**
     * Executes the rule's content.
     * @param request - The Request that matched the rule.
     * @param client - The client that made the request.
     */
    public abstract exec(request: Request, client: Rule.ClientType): void | Promise<void>
    /**
     * Checks whether a URL matches this route.
     * Also sets the Request.ruleParams.
     * @param request - The incoming request.
     */
    public test(request: Request): boolean { return this.expression.test(request.url); }
    /**
     * Retrieves the ruleParams from the routing rule if available.
     * @param path - The URL to resolve.
     */
    public getParams(path: string): Rule.ruleParams {
        const math = this.expression.exec(path);
        if (!math) return {};
        return { ...math.groups };
    }
    /**
     * Extracts the surplus URL using the rule's expression.
     * @param url - The full URL to extract from.
     */
    public getSurplus(url: string): string {
        const { $surplus = '' } = this.getParams(url);
        return $surplus;
    }
    /**
     * Creates a regular expression for route matching.
     * @param urlRule - The UrlRule used to form the RegExp.
     * @throws Invalid URL rule format
     */
    public createExpression(urlRule: string): RegExp {
        return Rule.createExpression(urlRule);
    }
    /**
     * Creates a regular expression for route matching.
     * @param urlRule - The UrlRule used to form the RegExp.
     * @throws Invalid URL rule format
     */
    private static createExpression(urlRule: string): RegExp {
        const validators = {
            paramRequired: /^\$(?<param>(?!\$).+)$/,
            paramOptional: /^\$\?(?<param>(?!\$).+)$/,
            escape: /\\(?![\$\[\]\*\+\?\.\(\)\{\}\^\|\-])|(?<!\\)[\$\[\]\*\+\?\.\(\)\{\}\^\|\-]/gi,
        };
        const zones = urlRule.split('/').slice(1);
        let generated = '^';

        for (let index = 0; index < zones.length; index ++) {
            const zone = zones[index];

            if (zone == '*') {
                const isLast = index == (zones.length - 1);
                generated += isLast ? '(?<$surplus>/.+)?' : '(?:/[^/]+)';
                continue;
            }

            const optional = zone.match(validators.paramOptional);
            if (optional && optional.groups) {
                const param = optional.groups['param'].replace(validators.escape, '');
                generated += `(?:/(?<${param}>[^/]+))?`;
                continue;
            }

            const required = zone.match(validators.paramRequired);
            if (required && required.groups) {
                const param = required.groups['param'].replace(validators.escape, '');
                generated += `/(?<${param}>[^/]+)`;
                continue;
            }

            generated += `/${zone}`;
        }
        return new RegExp(`${generated}/?$`);
    }
}

export namespace Rule {
    export type ClientType =Websocket | Response;
    export interface ruleParams {
        [name: string]: string | undefined;
    }
}

export default Rule;