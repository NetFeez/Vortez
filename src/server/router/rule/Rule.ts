/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Implements the base Rule class for Vortez routing system.
 * @license Apache-2.0
 */

import { RULE } from '../../../support/symbols.js';

import Request from '../../Request.js';
import Response from '../../Response.js';
import ws from '../../websocket/ws.js';
import Middleware from '../middleware/Middleware.js';
import Pipeline from '../middleware/Pipeline.js';
import Tracker from '../Tracker.js';

export abstract class Rule<Content extends any> {
    public [RULE.BASE] = true;

    protected vTemplate: string;
    protected vExpression: RegExp;
    protected vContent: Content;
    public readonly pipeline: Pipeline;

    public readonly abstract identifier: 'router' | 'http' | 'ws' | 'custom-${string}';

    public constructor(template: string, content: Content, pipeline: Pipeline = new Pipeline()) {
        this.vTemplate = template = Rule.normalize(template);
        this.vExpression = Rule.create(template);
        this.vContent = content;
        this.pipeline = pipeline;
    }
    public get content(): Content { return this.vContent; }
    public get expression(): RegExp { return this.vExpression; }
    public get template(): string { return this.vTemplate; }
    public set template(template: string) {
        this.vTemplate = template = Rule.normalize(template);
        this.vExpression = Rule.create(template);
    }
    /**
     * Adds middleware to the routing rule's pipeline.
     * @param items - The middleware to add to the pipeline.
     * @returns The current Rule instance.
     * @Remarks This method allows you to add middleware to the routing rule's pipeline, which will be executed before the rule's content is executed.
     */
    public use(...items: (Middleware.Type | Pipeline)[]): this {
        this.pipeline.use(...items);
        return this;
    }
    /**
     * Executes the rule pipeline plus the rule content.
     * @param request - The request received by the router.
     * @param client - The client associated with the request.
     * @param state - Shared middleware state.
     * @param tracker - Optional execution tracker instance.
     */
    public abstract exec(request: Request, client: Response | ws.Server, state?: Middleware.State, tracker?: Tracker): Promise<void>;
    /**
     * Tests whether a request matches the routing rule.
     * @param request - The request to test.
     * @param args - Additional arguments to pass to the test method.
     * @returns True if the request matches the routing rule, false otherwise.
     * @Remarks This method is abstract and must be implemented by subclasses.
     * 
     * @virtual
     */
    public test(url: string, method: Request.Method = 'GET', isWs: boolean = false): boolean { return this.vExpression.test(url); };
    /**
     * Gets the parameters from the URL based on the routing rule.
     * @param path - The URL to resolve.
     * @returns An object containing the parameters from the URL.
     * @Remarks ``$surplus`` is a special parameter that contains the remaining part of the URL after the matched route.
     */
    public params(path: string): Rule.ruleParams {
        const math = this.vExpression.exec(path);
        return { ...math?.groups };
    }
    /**
     * Gets the surplus from the URL based on the routing rule.
     * @param url - The URL to resolve.
     * @returns The surplus from the URL.
     * @Remarks obtains the remaining part of the url using ``params()`` and returns the value of the ``$surplus`` parameter.
     */
    public surplus(url: string): string {
        const { $surplus = '' } = this.params(url);
        return $surplus;
    }
    protected static normalize(template: string): string {
        if (!template.startsWith('/')) template = '/' + template;
        if (template.endsWith('/')) template = template.slice(0, -1);
        template = template.replace(/\/+/g, '/');
        return template;
    }
    protected static create(template: string): RegExp {
        const validators = {
            paramRequired: /^(?:\:|\$)(?<param>(?!\$).+)$/,
            paramOptional: /^(?:\:|\$)\?(?<param>(?!\$).+)$/,
            escape: /\\(?![\$\[\]\*\+\?\.\(\)\{\}\^\|\-])|(?<!\\)[\$\[\]\*\+\?\.\(\)\{\}\^\|\-]/gi,
        };
        const zones = template.split('/').slice(1);
        let generated = '^';

        for (let index = 0; index < zones.length; index++) {
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
    export type ClientType = ws | Response;
    export interface ruleParams {
        [name: string]: string | undefined;
    }
}

export default Rule;