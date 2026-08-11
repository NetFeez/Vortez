import { promises as fs } from 'fs';

import { Path, File } from '@netfeez/common-node';
import Logger from '@netfeez/vterm';

import { RULE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type Response from "../../Response.js";
import type Middleware from "../middleware/Middleware.js";

import Pipeline from "../middleware/Pipeline.js";

import Rule from "./Rule.js";
import PathSecurity from '../../security/PathSecurity.js';
import ServerError from '../../ServerError.js';

const logger = new Logger({ name: 'vortez' });

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
     * Creates a routing rule to send a folder to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the folder to send.
     * @param template - The template to use for rendering the folder contents.
     */
    public static folder(urlRule: string, path: string, template?: string): HttpRule {
        template = template || Path.relativeToMe(import.meta, '../../global/template/folder.vhtml');
        if (urlRule.endsWith('/')) urlRule += '*';
        if (!urlRule.endsWith('/*')) urlRule += '/*';
        const action = this.sendFolder.bind(this, path, template);
        return new HttpRule('GET', urlRule, action);
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
     * Sends a file to the client.
     * @param path - The path of the file to send.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static async sendFile(path: string, request: Request, client: Response): Promise<void> {
        await client.sendFile(path);
    }

    /**
     * Sends a folder to the client.
     * @param path - The path of the folder to send.
     * @param template - The template to use for rendering the folder contents.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static async sendFolder(base: string, template: string, request: Request, client: Response): Promise<void> {
        const { $surplus: plus = '' } = request.ruleParams;

        // await client.sendFolder(path, $surplus);

        const basePath = Path.resolve(base);
        const path = await PathSecurity.resolveInsideBase(basePath, plus);
        if (!path) {
            logger.warn(`&C2[Vortez Security] Vortez has detected a potential Path Traversal attack:`);
            logger.warn(` &C3- IP: &C6${request.ip}`);
            logger.warn(` &C3- URL: &C6${request.url}`);
            logger.warn(` &C3- Base: &C6${basePath}`);
            logger.warn(` &C3- Intento: &C6${plus}`);
            throw new ServerError(403, 'Forbidden: Outside of sandbox');
        }
        if (!await File.exists(path)) throw new ServerError(404, 'The requested URL was not found');
        const details = await fs.stat(path);
        if (details.isFile()) return await client.sendFile(path);
        if (!details.isDirectory()) throw new ServerError(404, 'The requested URL was not found');
        const folder = await fs.readdir(path);
        await client.sendTemplate(template, { Url: request.url, folder });
    }
}

export namespace HttpRule {
    export type Content = (request: Request, response: Response, state: Middleware.State) => void | Promise<void>;
}

export default HttpRule;