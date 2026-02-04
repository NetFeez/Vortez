/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the routing of the requests and WebSocket connections.
 * @license Apache-2.0
*/

import HTTP from 'http';
import { Duplex } from 'stream';

import _Rule from './Rule.js';
import _WsRule from './WsRule.js';
import _HttpRule from './HttpRule.js';
import _WsMiddleware from './Middleware/WsMiddleware.js';
import _HttpMiddleware from './Middleware/HttpMiddleware.js';
import _Middleware from './Middleware/Middleware.js';

import Request from '../Request.js';
import Response from '../Response.js';
import WebSocket from '../WebSocket/WebSocket.js';
import LoggerManager from '../LoggerManager.js';
import Config from '../Config/Config.js';

export { Rule } from './Rule.js';
export { WsRule } from './WsRule.js';
export { HttpRule } from './HttpRule.js';

const logger = LoggerManager.getInstance();

export class Router {
    public httpRules: Router.HttpRule[] = [];
    public wsRules: Router.WsRule[] = [];
	public subRouters: Router[] = [];
	public readonly httpMiddleware: Router.HttpMiddleware;
	public readonly wsMiddleware: Router.WsMiddleware;

    constructor(
		public config: Config,
		rules: Router.rules[] = [],
		middlewares: Router.MiddlewareOptions = {}
	) {
		const {
			http: httpMiddleware = new Router.HttpMiddleware(),
			ws: wsMiddleware = new Router.WsMiddleware()
		} = middlewares;
		this.httpMiddleware = httpMiddleware;
		this.wsMiddleware = wsMiddleware;
		this.addRules(...rules);
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
	 * @param HttpRequest - The incoming HTTP request.
	 * @param HttpResponse - The server response stream.
	 */
	public requestManager(HttpRequest: HTTP.IncomingMessage, HttpResponse: HTTP.ServerResponse): void {
		const request = new Request(HttpRequest);
		const response = new Response(request, HttpResponse, this.config.templates);
		const sessionID = request.cookies.get('Session');
		logger.request.log(request.ip, request.method, request.url, sessionID);
		const isRouted = this.routeRequest(request, response);
		if (!isRouted) response.sendError(400, `No router for: ${request.method} -> ${request.url}`);
	};
	/**
	 * Will be executed when the server receives an upgrade request.
	 * @param HttpRequest The request received by the server.
	 * @param Socket The socket to respond with (WebSocket upgrade).
	 */
	public upgradeManager(HttpRequest: HTTP.IncomingMessage, Socket: Duplex): void {
		const request = new Request(HttpRequest);
		const webSocket = new WebSocket(request, Socket);
		const sessionID = request.cookies.get('Session');
		logger.webSocket.log(request.ip, request.method, request.url, sessionID);
		const isRouted = this.routeWebSocket(request, webSocket);
		if (!isRouted) webSocket.reject(400, `No router for: ${request.method} -> ${request.url}`);
	}
    /**
	 * Routes incoming HTTP requests to be processed.
	 * @param request - The received HTTP request.
	 * @param response - The server response handler.
	 */
	public async routeRequest(request: Request, response: Response): Promise<boolean> {
		let rule = this.httpRules.find((rule) => rule.test(request));
		if (rule) {
			rule.exec(request, response);
			return true;
		}
		for (const router of this.subRouters) {
			const isRouted = await router.routeRequest(request, response);
			if (isRouted) return true;
		}
		return false;
	}
	/**
	 * Routes WebSocket connection requests.
	 * @param request - The received HTTP request.
	 * @param webSocket - The WebSocket connection with the client.
	 */
	public async routeWebSocket(request: Request, webSocket: WebSocket): Promise<boolean> {
		const rule = this.wsRules.find((rule) => rule.test(request));
		if (rule) {
			rule.exec(request, webSocket);
			return true;
		}
		for (const router of this.subRouters) {
			const isRouted = await router.routeWebSocket(request, webSocket);
			if (isRouted) return true;
		}
		return false;
	}
	/**
	 * Adds one or more routing rules to the server.
	 * @param rules - The rule(s) to be added.
	 */
	public addRules(...rules: Router.rules[]): this {
		for (const rule of rules) this.addRule(rule);
		return this;
	}
	/**
	 * Adds one or more routing rules to the server.
	 * @param rule - The rule(s) to be added.
	 */
	public addRule(rule: Router.rules): this {
		if (rule instanceof Router.WsRule) {
			rule.middleware.mergeAtStart(this.wsMiddleware);
			this.wsRules.push(rule);
		} else {
			rule.middleware.mergeAtStart(this.httpMiddleware);
			this.httpRules.push(rule);
		}
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
	public addFile(urlRule: string, source: string,): Router.HttpRule {
		const rule = Router.HttpRule.file(urlRule, source);
		this.addRule(rule);
		return rule;
	}
	/**
	 * Adds a folder routing rule.
	 * @param urlRule - The URL path to listen on.
	 * @param source - The directory path to be served.
	 */
	public addFolder(urlRule: string, source: string): Router {
		const rule = Router.HttpRule.folder(urlRule, source);
		this.addRule(rule);
		return this;
	}
	/**
	 * Adds a WebSocket routing rule.
	 * @param urlRule - The URL path to listen on.
	 * @param action - The action to be executed on connection.
	 */
	public addWebSocket(urlRule: string, action: Router.WsRule.action): Router.WsRule {
		const rule = new Router.WsRule(urlRule, action)
		this.addRules(rule);
		return rule;
	}
	/**
	 * Creates a new sub-router.
	 * - this sub route heredes the middleware actions of the parent router.
	 * - has independent middleware actions.
	 * @param config - The configuration for the new sub-router.
	 */
	public subRouter(config: Config = this.config): Router {
		const router = new Router(config);
		this.subRouters.push(router);
		router.wsMiddleware.mergeAtStart(this.wsMiddleware);
		router.httpMiddleware.mergeAtStart(this.httpMiddleware);
		return router;
	}
}
export namespace Router {
    export import Rule = _Rule;
	export import WsRule = _WsRule;
	export import HttpRule = _HttpRule;
	export import WsMiddleware = _WsMiddleware;
	export import HttpMiddleware = _HttpMiddleware;
	export import Middleware = _Middleware;
	export interface MiddlewareOptions {
		http?: HttpMiddleware;
		ws?: WsMiddleware;
	}
	export type rules = WsRule | HttpRule;
}

export default Router;