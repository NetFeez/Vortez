/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Contains routing rule logic for Vortez.
 * @license Apache-2.0
 */

import Request from '../Request.js';
import Response from '../Response.js';
import WebSocket from '../WebSocket/WebSocket.js';

export class Rule<T extends keyof Rule.Type = keyof Rule.Type> {
    /** The type of the routing rule */
    public type: T;
    /** The HTTP method accepted by the routing rule */
    public method: Request.Method;
    /** The UrlRule with which the routing rule was created */
    public urlRule: string;
    /** The authentication function */
    public authExec: Rule.AuthExec;
    /** The regular expression for the routing rule */
    public expression: RegExp;
    /** The executable content for the routing rule */
    public content: Rule.Type[T];
    /**
     * Creates a routing rule for Vortez.
     * @param type - The rule type.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param content - The executable content of the rule.
     * @param authExec - The authentication function.
     */
    public constructor(type: T, method: Request.Method, urlRule: string, content: Rule.Type[T], authExec?: Rule.AuthExec) {
        if (!urlRule.startsWith('/')) urlRule = '/' + urlRule;
        if (urlRule.endsWith('/')) urlRule = urlRule.slice(0, -1);
        this.urlRule = urlRule;
        this.type = type;
        this.method = method;
        this.expression = this.createExpression(urlRule);
        this.content = content;
        this.authExec = authExec ?? (() => true);
    }
    /**
     * Executes the rule's content.
     * @param request - The Request that matched the rule.
     * @param client - The client that made the request.
     */
    public async exec(request: Request, client: Rule.ClientType<T>): Promise<void> {
        request.ruleParams = this.getParams(request.url);
        if (await this.testAuth(request)) switch (this.type) {
            case 'Action':    (this as Rule<'Action'>).content(request, (client as Rule.ClientType<'Action'>)); break;
            case 'File':      (client as Rule.ClientType<'File'>).sendFile((this as Rule<'File'>).content); break;
            case 'Folder':    (client as Rule.ClientType<'Folder'>).sendFolder((this as Rule<'Folder'>).content, this.getSurplus(request.url)); break;
            case 'WebSocket': (this as Rule<'WebSocket'>).content(request, (client as Rule.ClientType<'WebSocket'>)); break;
        }
    }
    /**
     * Checks whether a URL matches this route.
     * Also sets the Request.ruleParams.
     * @param request - The incoming request.
     * @param isWebSocket - Whether to check for a WebSocket route.
     */
    public test(request: Request, isWebSocket: boolean = false): boolean {
        let result = false;
        if (isWebSocket) {
            result = this.type == 'WebSocket'
            ? this.expression.test(request.url)
            : false;
        } else {
            result = this.method == request.method || this.method == 'ALL'
            ? this.expression.test(request.url)
            : false;
        }
        return result;
    }
    /**
     * Validates whether the request passes authentication.
     * @param request - The incoming request.
     */
    public async testAuth(request: Request): Promise<boolean> {
        return !this.authExec || this.authExec(request);
    }
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
        if (this.type == 'Folder') urlRule += !urlRule.endsWith('/*') ? urlRule.endsWith('/') ? '*' : '/*' : '';
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

            generated += `/${zone.replace(validators.escape, '')}`;
        }
        return new RegExp(`${generated}/?$`);
    }
}

export namespace Rule {
    export type AuthExec = (Request: Request) => boolean | Promise<boolean>;
    export type ActionExec = (Request: Request, Response: Response) => void;
    export type WebSocketExec = (Request: Request, WebSocket: WebSocket) => void;
    export type ClientType<T extends keyof Type> = T extends 'WebSocket' ? WebSocket : Response;
    export interface ruleParams {
        [name: string]: string | undefined;
    }
    export type Type = {
        File: string,
        Folder: string,
        Action: ActionExec,
        WebSocket: WebSocketExec
    }
}

export default Rule;