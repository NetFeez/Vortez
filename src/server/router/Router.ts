/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Router v2 proposal: strategy-based routing (FIFO/Tree) with backward-compatible API.
 * @license Apache-2.0
 */

import HTTP from 'http';
import { Duplex } from 'stream';

import _Rule from './Rule.js';
import _WsRule from './WsRule.js';
import _HttpRule from './HttpRule.js';
import _WsMiddleware from './middleware/WsMiddleware.js';
import _HttpMiddleware from './middleware/HttpMiddleware.js';
import _Middleware from './middleware/Middleware.js';

import _Algorithm from './algorithm/Algorithm.js';
import _FIFO from './algorithm/FIFO.js';
import _Tree from './algorithm/Tree.js';

import Request from '../Request.js';
import Response from '../Response.js';
import Websocket from '../websocket/Websocket.js';
import LoggerManager from '../LoggerManager.js';
import Config from '../config/Config.js';

export { Rule } from './Rule.js';
export { WsRule } from './WsRule.js';
export { HttpRule } from './HttpRule.js';

const logger = LoggerManager.getInstance();

export class Router {
	public static AlgorithmMap: Router.AlgorithmMap = {
		FIFO: _FIFO,
		Tree: _Tree
	};

	public readonly algorithm: Router.Algorithm;
	public readonly httpMiddleware: Router.HttpMiddleware;
	public readonly wsMiddleware: Router.WsMiddleware;

	/**
	 * Creates a router for rule management.
	 * @param config - The server configuration.
	 * @param rules - An optional array of routing rules to initialize the router with.
	 * @param options - Additional options for configuring the router, including middleware and algorithm choice.
	 */
	public constructor(
		public config: Config = new Config({}),
		rules: Router.rules[] = [],
		options: Router.Options = {}
	) {
		const {
			http: httpMiddleware = new Router.HttpMiddleware(),
			ws: wsMiddleware = new Router.WsMiddleware(),
			algorithm = 'FIFO',
		} = options;

		this.httpMiddleware = httpMiddleware;
		this.wsMiddleware = wsMiddleware;
		this.algorithm = Router.getAlgorithm(algorithm);
		this.addRules(...rules);
	}

	/** HTTP rules view (computed from algorithm). */
	public get httpRules(): Router.HttpRule[] {
		return this.algorithm.allRules.filter((rule): rule is Router.HttpRule => rule instanceof Router.HttpRule);
	}

	/** WebSocket rules view (computed from algorithm). */
	public get wsRules(): Router.WsRule[] {
		return this.algorithm.allRules.filter((rule): rule is Router.WsRule => rule instanceof Router.WsRule);
	}
	/**
	 * Adds middleware actions to the router.
	 * @param middleware - The middleware to be added.
	 */
	public use(middleware: Router.HttpMiddleware | Router.WsMiddleware): this {
		if (middleware instanceof Router.HttpMiddleware) this.httpMiddleware.use(middleware);
		else this.wsMiddleware.use(middleware);
		return this;
	}
	/**
	 * Adds middleware error actions to the router.
	 * @param middleware - The middleware to be added.
	 */
	public useError(middleware: Router.HttpMiddleware | Router.WsMiddleware): this {
		if (middleware instanceof Router.HttpMiddleware) this.httpMiddleware.useError(middleware);
		else this.wsMiddleware.useError(middleware);
		return this;
	}
	/**
	 * Triggered when the server receives an HTTP request.
	 * @param request - The received HTTP request.
	 * @param response - The server response handler.
	 * @returns True if the request was routed, false otherwise.
	 * @remarks This method attempts to route the incoming HTTP request using the routing algorithm.
	 * If a matching route is found, it processes the request and returns true; otherwise, it returns false, indicating that no suitable route was found for the request.
	 */
	public requestManager(HttpRequest: HTTP.IncomingMessage, HttpResponse: HTTP.ServerResponse): void {
		const request = new Request(HttpRequest);
		const response = new Response(request, HttpResponse, this.config.data.templates);
		const sessionID = request.cookies.get('Session');
		logger.request.log(request.ip, request.method, request.url, sessionID);
		const isRouted = this.routeRequest(request, response);
		if (!isRouted) response.sendError(400, `No router for: ${request.method} -> ${request.url}`);
	}

	/**
	 * Triggered when the server receives a WebSocket upgrade request.
	 * @param request - The received WebSocket upgrade request.
	 * @param webSocket - The WebSocket connection handler.
	 * @returns True if the request was routed, false otherwise.
	 * @remarks This method attempts to route the incoming WebSocket upgrade request using the routing algorithm.
	 * If a matching route is found, it processes the request and returns true; otherwise, it returns false, indicating that no suitable route was found for the request.
	 */
	public upgradeManager(HttpRequest: HTTP.IncomingMessage, Socket: Duplex): void {
		const request = new Request(HttpRequest);
		const webSocket = new Websocket(request, Socket);
		const sessionID = request.cookies.get('Session');
		logger.webSocket.log(request.ip, request.method, request.url, sessionID);
		const isRouted = this.routeWebSocket(request, webSocket);
		if (!isRouted) webSocket.reject(400, `No router for: ${request.method} -> ${request.url}`);
	}
	/**
	 * Routes incoming HTTP requests to be processed.
	 * @param request - The received HTTP request.
	 * @param response - The server response handler.
	 * @returns True if the request was routed, false otherwise.
	 * @remarks This method attempts to route the incoming HTTP request using the routing algorithm.
	 * If a matching route is found, it processes the request and returns true; otherwise, it returns false, indicating that no suitable route was found for the request.
	 */
	public routeRequest(request: Request, response: Response): boolean {
		return this.algorithm.route(request, response);
	}
	/**
	 * Routes incoming WebSocket upgrade requests to be processed.
	 * @param request - The received WebSocket upgrade request.
	 * @param webSocket - The WebSocket connection handler.
	 * @returns True if the request was routed, false otherwise.
	 * @remarks This method attempts to route the incoming WebSocket upgrade request using the routing algorithm.
	 * If a matching route is found, it processes the request and returns true; otherwise, it returns false, indicating that no suitable route was found for the request.
	 */
	public routeWebSocket(request: Request, webSocket: Websocket): boolean {
		return this.algorithm.route(request, webSocket);
	}
	/**
	 * Adds multiple routing rules to the server.
	 * @param rules - An array of rules to be added.
	 * @returns The current router instance for chaining.
	 * @remarks This method is a convenience function that allows adding multiple rules at once by internally calling the addRule method for each rule in the array.
	 */
	public addRules(...rules: Router.rules[]): this {
		for (const rule of rules) this.addRule(rule);
		return this;
	}
	/**
	 * Adds a routing rule to the server.
	 * @param rule - The rule to be added.
	 * @returns The current router instance for chaining.
	 * @remarks This method integrates the new rule into the routing algorithm and ensures that any associated middleware is properly merged.
	 */
	public addRule(rule: Router.rules): this {
		if (rule instanceof Router.WsRule) rule.middleware.mergeAtStart(this.wsMiddleware);
		else rule.middleware.mergeAtStart(this.httpMiddleware);

		this.algorithm.add(rule);
		return this;
	}
	/**
	 * Mounts another router onto this router, optionally under a specific URL path.
	 * @param router - The router to be mounted.
	 * @param urlRule - An optional URL path to mount the router under. If not provided, the router's rules will be added at the root level.
	 * @returns The current router instance for chaining.
	 * @remarks This method allows you to compose routers together, enabling modular route management.
	 * When a URL path is specified, all routes from the mounted router will be prefixed with that path.
	 */
	public mount(router: Router, urlRule?: string): this {
		const httpRules = router.httpRules.map((rule) => {
			const newUrlRule = urlRule ? `${urlRule}/${rule.urlRule}` : rule.urlRule;
			return new Router.HttpRule(rule.method, newUrlRule, rule.action, rule.middleware.clone());
		});
		const wsRules = router.wsRules.map((rule) => {
			const newUrlRule = urlRule ? `${urlRule}/${rule.urlRule}` : rule.urlRule;
			return new Router.WsRule(newUrlRule, rule.action, rule.middleware.clone());
		});
		this.addRules(...httpRules, ...wsRules);
		return this;
	}
	/**
	 * Adds an action routing rule.
	 * @param method - The HTTP method to respond to.
	 * @param urlRule - The URL path for the action.
	 * @param action - The action to be executed.
	 */
	public addAction(method: Request.Method, urlRule: string, action: Router.HttpRule.action): Router.HttpRule {
		const rule = new Router.HttpRule(method, urlRule, action);
		this.addRule(rule);
		return rule;
	}
	/**
	 * Adds a file routing rule.
	 * @param urlRule - The URL path to listen on.
	 * @param source - The path to the file to be served.
	 */
	public addFile(urlRule: string, source: string): Router.HttpRule {
		const rule = Router.HttpRule.file(urlRule, source);
		this.addRule(rule);
		return rule;
	}
	/**
	 * Adds a folder routing rule.
	 * @param urlRule - The URL path to listen on.
	 * @param source - The path to the folder to be served.
	 */
	public addFolder(urlRule: string, source: string): this {
		const rule = Router.HttpRule.folder(urlRule, source);
		this.addRule(rule);
		return this;
	}
	/**
	 * Adds a WebSocket routing rule.
	 * @param urlRule - The URL path to listen on.
	 * @param action - The action to be executed when a WebSocket connection is established on the specified URL path.
	 * @returns The created WebSocket rule.
	 */
	public addWebSocket(urlRule: string, action: Router.WsRule.action): Router.WsRule {
		const rule = new Router.WsRule(urlRule, action);
		this.addRules(rule);
		return rule;
	}
	/**
	 * Creates a new router instance with the same configuration and middleware but without any rules.
	 * @returns A new RouterV2 instance.
	 * @remarks This method is useful for creating sub-routers that share the same configuration and middleware but have different routing rules.
	 */
	public createRouter(): Router {
		const algorithm = this.algorithm instanceof Router.Tree ? new Router.Tree() : new Router.FIFO();
		return new Router(this.config, [], {
			http: this.httpMiddleware.clone(),
			ws: this.wsMiddleware.clone(),
			algorithm,
		});
	}
	/**
	 * Gets an algorithm instance based on the provided input, which can be either a string key or an instance of the algorithm.
	 * @param algorithm - The algorithm to retrieve, either as a string key or an instance.
	 * @returns An instance of the requested algorithm.
	 * @throws Will throw an error if the algorithm key is not found in the AlgorithmMap.
	 * @remarks If the algorithm is provided as a string and is not found in the AlgorithmMap,it defaults to FIFO and logs a warning.
	 * @example
	 * // Using a string key to get an algorithm instance
	 * const fifoAlgorithm = RouterV2.getAlgorithm('FIFO');
	 *
	 * // Using an instance directly
	 * const treeAlgorithm = new RouterV2.Tree();
	 * const retrievedTreeAlgorithm = RouterV2.getAlgorithm(treeAlgorithm);
	 */
	public static getAlgorithm(algorithm: keyof Router.AlgorithmMap | Router.Algorithm): Router.Algorithm {
		if (algorithm instanceof Router.Algorithm) return algorithm;

		const AlgorithmClass = this.AlgorithmMap[algorithm];
		if (AlgorithmClass) return new AlgorithmClass();
		logger.warn(`&C3Algorithm &C6${algorithm} &C3not found. Defaulting to &C6FIFO&C3.`);
		return new Router.FIFO();
	}
}

export namespace Router {
	export import Rule = _Rule;
	export import WsRule = _WsRule;
	export import HttpRule = _HttpRule;
	export import WsMiddleware = _WsMiddleware;
	export import HttpMiddleware = _HttpMiddleware;
	export import Middleware = _Middleware;
	export import Algorithm = _Algorithm;
	export import FIFO = _FIFO;
	export import Tree = _Tree;

	export type algorithmName = keyof Router.AlgorithmMap;

	export interface AlgorithmMap {
		FIFO: typeof FIFO;
		Tree: typeof Tree;
	}
	export interface Options {
		http?: HttpMiddleware;
		ws?: WsMiddleware;
		algorithm?: algorithmName | Algorithm;
	}
	export type rules = WsRule | HttpRule;
}

export default Router;