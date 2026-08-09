/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Router: routing using Algorithm.find + Pipeline orchestration (v2 design).
 * @license Apache-2.0
 */

import { CLIENT, RULE } from '../../support/symbols.js';

import type Request from '../Request.js';
import type Response from '../Response.js';
import type ws from '../websocket/ws.js';
import LoggerManager from '../LoggerManager.js';
import Config from '../config/Config.js';

import _Algorithm from './algorithm/Algorithm.js';
import _FIFO from './algorithm/FIFO.js';
import _Tree from './algorithm/Tree.js';

import _Pipeline from './middleware/Pipeline.js';
import _Middleware from './middleware/Middleware.js';
import _HttpRule from './rule/HttpRule.js';
import _WsRule from './rule/WsRule.js';
import _RouterRule from './rule/RouterRule.js';
import Rule from './rule/Rule.js';

const logger = LoggerManager.getInstance();

export class Router {
    public static AlgorithmMap: Router.AlgorithmMap = {
        FIFO: _FIFO,
        Tree: _Tree,
    };

    public readonly algorithm: _Algorithm;
    public readonly pipeline: _Pipeline;

    public constructor(
        public config: Config = new Config({}),
        algorithm: keyof Router.AlgorithmMap | _Algorithm = 'FIFO'
    ) {
        this.algorithm = Router.getAlgorithm(algorithm);
        this.pipeline = new _Pipeline();
    }

    /**
     * Tests whether a request matches any routing rule in the router.
     * @param request - The request to test.
     * @param client - The client that made the request.
     * @returns True if the request matches any routing rule, false otherwise.
     */
    public test(request: Request): boolean {
        const rule = this.algorithm.test(request) || null;
        return !!rule;
    }

    /**
     * Routes a request to the appropriate rule based on the request and client type (HTTP or WebSocket).
     * @param request - The Request object representing the incoming request.
     * @param client - The client object, which can be either a Response (for HTTP) or a WebSocket.Server (for WebSocket).
     * @returns A promise that resolves to true if a matching rule was found and executed, or false if no matching rule was found.
     * @throws An error if the client type is invalid (not Response or WebSocket.Server).
     * @remarks This method determines the type of client (HTTP or WebSocket) and calls the appropriate routing method (routeRequest or routeWebSocket) to find and execute the matching rule. If no matching rule is found, it returns false. If the client type is invalid, it throws an error.
     */
    public async route(request: Request, client: Response | ws.Server, state: _Middleware.State = {}): Promise<boolean> {
        const rule: Rule<any> | null = this.algorithm.find(request) || null;
        if (!rule) return false;
        const destination: _Pipeline.Destination = async (state) => rule.exec(request, client, state);
        await this.pipeline.run(request, client, destination);
        return true;
    }

    /**
     * Creates a routing rule and adds it to the router.
     * @param method - The HTTP method for the rule.
     * @param template - The URL template for the rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance.
     * @remarks This method creates a routing rule that executes the specified action when the URL template is matched.
     * 
     * @example
     * // Create a rule to handle GET requests to '/home'
     * router.action('GET', '/home', (req, res) => {
     *     res.send('Welcome to the home page!');
     * });
     */
    public action(method: Request.Method | 'ALL', template: string, action: _HttpRule.Content): _HttpRule {
        const rule = new _HttpRule(method as Request.Method, template, action);
        this.algorithm.add(rule);
        return rule;
    }

    /**
     * Creates a routing rule for GET requests and adds it to the router.
     * @param template - The URL template for the GET rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the GET request.
     * @remarks This method creates a routing rule that executes the specified action when a GET request matches the URL template.
     * 
     * @example
     * // Create a rule to handle GET requests to '/home'
     * router.get('/home', (req, res) => { res.send('Welcome to the home page!'); });
     */
    public get(template: string, action: _HttpRule.Content): _HttpRule { return this.action('GET', template, action); }
    /**
     * Creates a routing rule for POST requests and adds it to the router.
     * @param template - The URL template for the POST rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the POST request.
     * @remarks This method creates a routing rule that executes the specified action when a POST request matches the URL template.
     * 
     * @example
     * // Create a rule to handle POST requests to '/submit'
     * router.post('/submit', (req, res) => { res.send('Form submitted!'); });
     */
    public post(template: string, action: _HttpRule.Content): _HttpRule { return this.action('POST', template, action); }
    /**
     * Creates a routing rule for PUT requests and adds it to the router.
     * @param template - The URL template for the PUT rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the PUT request.
     * @remarks This method creates a routing rule that executes the specified action when a PUT request matches the URL template.
     * 
     * @example
     * // Create a rule to handle PUT requests to '/update'
     * router.put('/update', (req, res) => { res.send('Resource updated!'); });
     */
    public put(template: string, action: _HttpRule.Content): _HttpRule { return this.action('PUT', template, action); }
    /**
     * Creates a routing rule for DELETE requests and adds it to the router.
     * @param template - The URL template for the DELETE rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the DELETE request.
     * @remarks This method creates a routing rule that executes the specified action when a DELETE request matches the URL template.
     * 
     * @example
     * // Create a rule to handle DELETE requests to '/delete'
     * router.delete('/delete', (req, res) => { res.send('Resource deleted!'); });
     */
    public delete(template: string, action: _HttpRule.Content): _HttpRule { return this.action('DELETE', template, action); }
    /**
     * Creates a routing rule for PATCH requests and adds it to the router.
     * @param template - The URL template for the PATCH rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the PATCH request.
     * @remarks This method creates a routing rule that executes the specified action when a PATCH request matches the URL template.
     * 
     * @example
     * // Create a rule to handle PATCH requests to '/update'
     * router.patch('/update', (req, res) => { res.send('Resource updated!'); });
     */
    public patch(template: string, action: _HttpRule.Content): _HttpRule { return this.action('PATCH', template, action); }
    /**
     * Creates a routing rule for HEAD requests and adds it to the router.
     * @param template - The URL template for the HEAD rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the HEAD request.
     * @remarks This method creates a routing rule that executes the specified action when a HEAD request matches the URL template.
     * 
     * @example
     * // Create a rule to handle HEAD requests to '/status'
     * router.head('/status', (req, res) => { res.send('OK'); });
     */
    public head(template: string, action: _HttpRule.Content): _HttpRule { return this.action('HEAD', template, action); }
    /**
     * Creates a routing rule for OPTIONS requests and adds it to the router.
     * @param template - The URL template for the OPTIONS rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created HttpRule instance for the OPTIONS request.
     * @remarks This method creates a routing rule that executes the specified action when an OPTIONS request matches the URL template.
     * 
     * @example
     * // Create a rule to handle OPTIONS requests to '/api'
     * router.options('/api', (req, res) => { res.send('Allowed methods: GET, POST'); });
     */
    public options(template: string, action: _HttpRule.Content): _HttpRule { return this.action('OPTIONS', template, action); }

    /**
     * Creates a routing rule to send a file to the client and adds it to the router.
     * @param template - The URL template for the file rule.
     * @param source - The path of the file to send.
     * @returns The created HttpRule instance for the file.
     * @remarks This method creates a routing rule that sends a file to the client when the specified URL template is matched.
     * 
     * @example
     * // Create a rule to serve the 'index.html' file when the URL is '/home'
     * router.file('/home', './public/index.html');
     */
    public file(template: string, source: string): _HttpRule {
        const rule = _HttpRule.file(template, source);
        this.algorithm.add(rule);
        return rule;
    }

    /**
     * Creates a routing rule to send a folder to the client and adds it to the router.
     * @param template - The URL template for the folder rule.
     * @param source - The path of the folder to send.
     * @returns The created HttpRule instance for the folder.
     * @remarks This method creates a routing rule that sends a folder to the client when the specified URL template is matched.
     * It automatically appends '/*' to the template if it doesn't already end with it.
     * 
     * @example
     * // Create a rule to serve files from the 'public' folder when the URL starts with '/static'
     * router.folder('/static', './public');
     */
    public folder(template: string, source: string): _HttpRule {
        const rule = _HttpRule.folder(template, source);
        this.algorithm.add(rule);
        return rule;
    }

    /**
     * Creates a WebSocket routing rule and adds it to the router.
     * @param template - The URL template for the WebSocket rule.
     * @param action - The action to execute when the rule is matched.
     * @returns The created WebSocket rule.
     * @remarks This method creates a WebSocket routing rule that executes the specified action when the URL template is matched.
     */
    public ws(template: string, action: _WsRule.Content): _WsRule {
        const rule = new _WsRule(template, action);
        this.algorithm.add(rule);
        return rule;
    }

    /**
     * Creates a sub-router and adds it to the router with a specified URL template.
     * @param template - The URL template for the sub-router.
     * @param options - Optional configuration for the sub-router, including a custom router instance, configuration, algorithm, and pipeline.
     * @returns The created sub-router instance.
     * @remarks This method allows for the creation of nested routers, enabling modular routing structures. The sub-router can have its own rules and configurations.
     * 
     * @example
     * // Create a sub-router for '/api' with its own rules
     * const apiRouter = router.router('/api', {
     *     config: new Config({ ... }),
     *     algorithm: 'Tree',
     * });
     * apiRouter.get('/users', (req, res) => { res.send('User list'); });
     */
    public router(template: string, options: Router.SubRouterOptions = {}): Router {
        const config = options.config ?? this.config;
        const subRouter = options.router ?? new Router(config, options.algorithm);
        const rule = new _RouterRule(template, subRouter, options.pipeline);
        this.algorithm.add(rule);
        return subRouter;
    }

    /**
     * Adds multiple routing rules to the router.
     * @param rules - An array of routing rules to add.
     * @returns The Router instance for chaining.
     * @remarks This method allows adding multiple routing rules at once. Each rule can be an instance of HttpRule or WsRule.
     * 
     * @example
     * // Add multiple rules to the router
     * router.multiple(
     *     new HttpRule('GET', '/home', (req, res) => { res.send('Home'); }),
     *     new HttpRule('POST', '/submit', (req, res) => { res.send('Submitted'); }),
     *     HttpRule.file('/manifest.json', './assets/manifest.json'),
     *     HttpRule.folder('/static', './public'),
     *     new WsRule('/chat', (req, ws) => {  Ws.on('message', console.log); })
     * );
     */
    public multiple(...rules: (_HttpRule | _WsRule)[]): this {
        for (const rule of rules) this.algorithm.add(rule);
        return this;
    }

    /**
     * Gets the algorithm instance based on the provided algorithm name or instance.
     * @param algorithm - The name of the algorithm or an instance of the algorithm.
     * @returns An instance of the specified algorithm.
     * @remarks If the algorithm name is not found in the AlgorithmMap, it defaults to FIFO.
     */
    private static getAlgorithm(algorithm: keyof Router.AlgorithmMap | _Algorithm): _Algorithm {
        if (algorithm instanceof _Algorithm) return algorithm;
        const AlgorithmClass = Router.AlgorithmMap[algorithm];
        if (AlgorithmClass) return new AlgorithmClass();
        logger.warn(`Algorithm ${algorithm} not found. Defaulting to FIFO.`);
        return new _FIFO();
    }
}

export namespace Router {
    export import Algorithm = _Algorithm;
    export import FIFO = _FIFO;
    export import Tree = _Tree;
    export import Pipeline = _Pipeline;
    export import Middleware = _Middleware;
    export import HttpRule = _HttpRule;
    export import WsRule = _WsRule;

    export interface AlgorithmMap {
        FIFO: typeof _FIFO;
        Tree: typeof _Tree;
    }

    export type SubRouterOptions = {
        router?: Router;
        config?: Config;
        algorithm?: keyof AlgorithmMap | _Algorithm;
        pipeline?: _Pipeline;
    }
}

export default Router;
