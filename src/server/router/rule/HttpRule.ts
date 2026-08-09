import { RULE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type Response from "../../Response.js";
import type Middleware from "../middleware/Middleware.js";
import Pipeline from "../middleware/Pipeline.js";

import Rule from "./Rule.js";

export class HttpRule extends Rule<HttpRule.Content> {
    protected static readonly ACCEPTED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

    public [RULE.HTTP] = true;
    public readonly identifier = 'http';

    public constructor(
        public method: Request.Method | 'ALL',
        template: string,
        content: HttpRule.Content,
        pipeline: Pipeline = new Pipeline()
    ) { super(template, content, pipeline); }

    /**
     * Tests whether a request matches the routing rule.
     * @param request - The request to test.
     * @returns True if the request matches the routing rule, false otherwise.
     * @Remarks This method overrides the base Rule.test() method to add additional checks for HTTP requests.
     */
    public override test(request: Request): boolean {
        if (this.method !== 'ALL' && this.method !== request.method) return false;
        if (!HttpRule.isHttpRequest(request)) return false;
        return super.test(request);
    }
    public override async exec(request: Request, client: Response, state: Middleware.State = {}): Promise<void> {
        request.ruleParams = this.params(request.url);
        await this.pipeline.run(request, client, async middlewareState => {
            await this.vContent(request, client, middlewareState);
        }, state);
    }
    /**
     * Tests whether a request is an HTTP request.
     * @param request - The request to test.
     * @returns True if the request is an HTTP request, false otherwise.
     * @Remarks This method is used by the router to determine whether a request is an HTTP request or a WebSocket request.
     */
    public static isHttpRequest(request: Request): boolean {
        if ('upgrade' in request.headers) return false;
        if ('sec-websocket-key' in request.headers) return false;
        if (!HttpRule.ACCEPTED_METHODS.includes(request.method)) return false;
        return true;
    }
    /**
     * Creates a routing rule to send a folder to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the folder to send.
     * @param middleware - The middleware to clone.
     */
    public static folder(urlRule: string, path: string, pipeline?: Pipeline): HttpRule {
        if (urlRule.endsWith('/')) urlRule += '*';
        if (!urlRule.endsWith('/*')) urlRule += '/*';
        const action = this.sendFolder.bind(this, path);
        return new HttpRule('GET', urlRule, action, pipeline);
    }
    /**
     * Creates a routing rule to send a file to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the file to send.
     * @param middleware - The middleware to clone.
     */
    public static file(urlRule: string, path: string, pipeline?: Pipeline): HttpRule {
        const action = this.sendFile.bind(this, path);
        return new HttpRule('GET', urlRule, action, pipeline);
    }
    /**
     * Creates a routing rule.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     * @param middleware - The middleware to clone.
     */
    public static action(method: Request.Method, urlRule: string, action: HttpRule.Content, pipeline?: Pipeline): HttpRule {
        return new HttpRule(method, urlRule, action, pipeline);
    }
    /**
     * Sends a folder to the client.
     * @param path - The path of the folder to send.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static async sendFolder(path: string, request: Request, client: Response): Promise<void> {
        const { $surplus = '' } = request.ruleParams;
        await client.sendFolder(path, $surplus);
    }
    /**
     * Sends a file to the client.
     * @param path - The path of the file to send.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static async sendFile(path: string, request: Request, client: Response): Promise<void> {
        await client.sendFile(path);
    }
}

export namespace HttpRule {
    export type Content = (request: Request, response: Response, state: Middleware.State) => void | Promise<void>;
}

export default HttpRule;