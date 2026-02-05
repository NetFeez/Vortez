import Request from '../Request.js';
import Response from '../Response.js';
import BaseRule from './Rule.js';
import HttpMiddleware from './middleware/HttpMiddleware.js';
import Middleware from './middleware/Middleware.js';

export class HttpRule extends BaseRule<HttpRule.action> {
    /**
     * Creates a routing rule for Vortez.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     * @param middleware - The middleware to clone.
     */
    public constructor(
        public method: Request.Method,
        urlRule: string, action: HttpRule.action,
        public readonly middleware: HttpMiddleware = new HttpMiddleware()
    ) { super(urlRule, action); }
    public exec(request: Request, response: Response, state?: Middleware.State): void {
        request.ruleParams = this.getParams(request.url);
        this.middleware.run(request, response, this.action, state);
    }
    public test(request: Request): boolean {
        return (this.method == request.method || this.method == 'ALL')  && super.test(request);
    }
    /**
     * Adds a middleware to this specific rule.
     * @param action The middleware action.
     */
    public use(action: Middleware.action.http): this {
        this.middleware.use(action);
        return this;
    }
    /**
     * Adds a error middleware to this specific rule.
     * @param action The middleware action.
     */
    public useError(action: Middleware.errorAction.http): this {
        this.middleware.useError(action);
        return this;
    }
    /**
     * Creates a routing rule to send a folder to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the folder to send.
     * @param middleware - The middleware to clone.
     */
    public static folder(urlRule: string, path: string, middleware?: HttpMiddleware): HttpRule {
        if (urlRule.endsWith('/')) urlRule += '*';
        if (!urlRule.endsWith('/*')) urlRule += '/*';
        const action = this.sendFolder.bind(this, path);
        return new HttpRule('GET', urlRule, action, middleware);
    }
    /**
     * Creates a routing rule to send a file to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the file to send.
     * @param middleware - The middleware to clone.
     */
    public static file(urlRule: string, path: string, middleware?: HttpMiddleware): HttpRule {
        const action = this.sendFile.bind(this, path);
        return new HttpRule('GET', urlRule, action, middleware);
    }
    /**
     * Creates a routing rule.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     * @param middleware - The middleware to clone.
     */
    public static action(method: Request.Method, urlRule: string, action: HttpRule.action, middleware?: HttpMiddleware): HttpRule {
        return new HttpRule(method, urlRule, action, middleware);
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
    export type action = (request: Request, response: Response, state: Middleware.State) => void | Promise<void>;
}

export default HttpRule;