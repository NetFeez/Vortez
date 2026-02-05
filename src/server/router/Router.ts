/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Manages the routing of the requests and WebSocket connections.
 * @license Apache-2.0
*/

import HTTP from 'http';
import { Duplex } from 'stream';

import _Rule from './Rule.js';
import _WsRule from './WsRule.js';
import _HttpRule, { HttpRule } from './HttpRule.js';
import _WsMiddleware from './middleware/WsMiddleware.js';
import _HttpMiddleware from './middleware/HttpMiddleware.js';
import _Middleware from './middleware/Middleware.js';

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
    public httpRules: Router.HttpRule[] = [];
    public wsRules: Router.WsRule[] = [];
	public readonly httpMiddleware: Router.HttpMiddleware;
	public readonly wsMiddleware: Router.WsMiddleware;
	/**
	 * Creates a router for rule management.
	 * @param config - The server configuration.
	 */
    public constructor(
		public config: Config = new Config(),
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
	 */
	public async routeRequest(request: Request, response: Response): Promise<boolean> {
		const rule = this.httpRules.find((rule) => rule.test(request));
		if (!rule) return false;
		rule.exec(request, response);
		return true;
	}
	/**
	 * Routes WebSocket connection requests.
	 * @param request - The received HTTP request.
	 * @param webSocket - The WebSocket connection with the client.
	 */
	public async routeWebSocket(request: Request, webSocket: Websocket): Promise<boolean> {
		const rule = this.wsRules.find((rule) => rule.test(request));
		if (!rule) return false;
		rule.exec(request, webSocket);
		return true;
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
	 * Mount a router in this router
	 * this action merge the rules adding the provided url rule as a prefix to all rules.
	 * @param router - The router to mount.
	 * @param urlRule - The url rule to mount the router.
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
	 * Creates a new router.
	 * @returns A new router.
	 */
	public createRouter(): Router { return new Router(this.config); }
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