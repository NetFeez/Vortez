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
     * Determines if the given request is an HTTP request.
     * @param request - The request to check.
     * @returns True if the request is an HTTP request; otherwise, false.
     */
    public static isHttpRequest(request: Request): boolean {
        if ('upgrade' in request.headers) return false;
        if ('sec-websocket-key' in request.headers) return false;
        if (!HttpRule.ACCEPTED_METHODS.includes(request.method)) return false;
        return true;
    }

    /**
     * Creates a new HttpRule for handling a specific HTTP method and URL pattern.
     * @param method - The HTTP method (e.g., 'GET', 'POST') to match for this rule.
     * @param template - The URL pattern to match for this rule.
     * @param action - The action function to execute when the rule is matched.
     * @returns A new instance of HttpRule configured with the specified method, URL pattern, action, and middleware pipeline.
     * 
     * @example
     * // Create a rule to handle GET requests to '/api/data'
     * router.action('GET', '/api/data', async (request, response) => {
     *     const data = await fetchDataFromDatabase();
     *     response.sendJson(data);
     * }
     */
    public static action(method: Request.Method, template: string, action: HttpRule.Content): HttpRule {
        return new HttpRule(method, template, action);
    }

    /**
     * Creates a new HttpRule for serving a folder.
     * @param template - The URL pattern to match for this rule.
     * @param path - The base path of the folder to serve.
     * @param renderer - The folder renderer function to customize the response for folder contents. If null, a default template will be used.
     * @returns A new instance of HttpRule configured to serve the specified folder.
     * 
     * @example
     * // Create a rule to serve files from the 'public' folder when the URL starts with '/static'
     * router.folder('/static', './public');
     * router.folder('/static', './public', (_, response) => response.status(403).send('Forbidden'));
     * router.folder('/static', './public', (request, response, state) => {
     *     response.sendJson({ message: 'Folder contents', folder: state.folder, url: request.url });
     * });
     */
    public static folder(template: string, path: string, renderer: HttpRule.FolderRenderer | null = null): HttpRule {
        if (template.endsWith('/')) template += '*';
        if (!template.endsWith('/*')) template += '/*';
        const action = this.sendFolderHandler.bind(this, path, renderer);
        return new HttpRule('GET', template, action);
    }

    /**
     * Creates a new HttpRule for serving a file.
     * @param template - The URL pattern to match for this rule.
     * @param path - The file system path of the file to serve.
     * @returns A new instance of HttpRule configured to serve the specified file.
     * @remarks This method creates a routing rule that serves a file when the specified URL template is matched.
     * 
     * @example
     * // Create a rule to serve a file when the URL matches '/static/file.txt'
     * router.file('/static/file.txt', './public/file.txt');
     */
    public static file(template: string, path: string,): HttpRule {
        const action = this.sendFileHandler.bind(this, path);
        return new HttpRule('GET', template, action);
    }

    /**
     * Handles the sending of a file.
     * This function is responsible for securely serving a file to the client.
     * @param path - The path of the file to serve.
     * @param request - The incoming HTTP request.
     * @param response - The HTTP response object to send data back to the client.
     * @throws { ServerError } Throws a ServerError if the requested file does not exist or is not a file.
     * @returns A promise that resolves when the file has been sent to the client.
     */
    private static async sendFileHandler(path: string, request: Request, response: Response): Promise<void> {
        await response.sendFile(path);
    }

    /**
     * Handles the sending of a folder.
     * This function is responsible for securely serving the contents of a folder,
     * @param path - The base path of the folder to serve.
     * @param renderer - The folder renderer function to customize the response for folder contents. If null, a default template will be used.
     * @param request - The incoming HTTP request.
     * @param client - The HTTP response object to send data back to the client.
     * @throws { ServerError } Throws a ServerError if the requested path is outside the base folder or if the path does not exist.
     * @returns A promise that resolves when the folder contents have been sent to the client.
     */
    private static async sendFolderHandler(path: string, renderer: HttpRule.FolderRenderer | null, request: Request, client: Response): Promise<void> {
        const { $surplus: plus = '' } = request.ruleParams;

        const basePath = Path.resolve(path);
        const securePath = await PathSecurity.resolveInsideBase(basePath, plus);
        if (!securePath) {
            logger.warn(`&C2[Vortez Security] Vortez has detected a potential Path Traversal attack:`);
            logger.warn(` &C3- IP: &C6${request.ip}`);
            logger.warn(` &C3- URL: &C6${request.url}`);
            logger.warn(` &C3- Base: &C6${basePath}`);
            logger.warn(` &C3- Intento: &C6${plus}`);
            throw new ServerError(403, 'Forbidden: Outside of sandbox');
        }
        if (!await File.exists(securePath)) throw new ServerError(404, 'The requested URL was not found');
        const details = await fs.stat(securePath);
        if (details.isFile()) return await client.sendFile(securePath);
        if (!details.isDirectory()) throw new ServerError(404, 'The requested URL was not found');
        const folder = await fs.readdir(securePath);
        if (renderer) return await renderer(request, client, { folder });
        const template = Path.relativeToMe(import.meta, '../../../../global/template/folder.vhtml');
        await client.sendTemplate(template, { url: request.url, folder });
    }
}

export namespace HttpRule {
    export type Content = (request: Request, response: Response, state: Middleware.State) => void | Promise<void>;
    export type FolderRenderer = (request: Request, response: Response, state: Middleware.State & { folder: string[] }) => void | Promise<void>;
}

export default HttpRule;