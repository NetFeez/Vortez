import Request from '../Request.js';
import Response from '../Response.js';
import BaseRule from './Rule.js';

export class HttpRule extends BaseRule<HttpRule.action> {
    /**
     * Creates a routing rule for Vortez.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     */
    public constructor(
        public readonly method: Request.Method,
        urlRule: string, action: HttpRule.action
    ) { super(urlRule, action); }
    public exec(request: Request, client: Response): void {
        request.ruleParams = this.getParams(request.url);
        return this.action(request, client);
    }
    public test(request: Request): boolean {
        return (this.method == request.method || this.method == 'ALL')  && super.test(request);
    }
    /**
     * Creates a routing rule to send a folder to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the folder to send.
     */
    public static folder(urlRule: string, path: string): HttpRule {
        if (urlRule.endsWith('/')) urlRule += '*';
        if (!urlRule.endsWith('/*')) urlRule += '/*';
        return new HttpRule('GET', urlRule, this.sendFolder.bind(this, path));
    }
    /**
     * Creates a routing rule to send a file to the client.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param path - The path of the file to send.
     */
    public static file(urlRule: string, path: string): HttpRule {
        return new HttpRule('GET', urlRule, this.sendFile.bind(this, path));
    }
    /**
     * Creates a routing rule.
     * @param method - The HTTP method of the rule.
     * @param urlRule - The URL rule adopted by this Rule instance.
     * @param action - The executable content of the rule.
     */
    public static action(method: Request.Method, urlRule: string, action: HttpRule.action): HttpRule {
        return new HttpRule(method, urlRule, action);
    }
    /**
     * Sends a folder to the client.
     * @param path - The path of the folder to send.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static sendFolder(path: string, request: Request, client: Response): void {
        const { $surplus = '' } = request.ruleParams;
        client.sendFolder(path, $surplus);
    }
    /**
     * Sends a file to the client.
     * @param path - The path of the file to send.
     * @param request - The incoming request.
     * @param client - The client that made the request.
     */
    private static sendFile(path: string, request: Request, client: Response): void {
        client.sendFile(path);
    }
}
export namespace HttpRule {
    export type action = (request: Request, response: Response) => void;
}
export default HttpRule;