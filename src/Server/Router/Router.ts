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
import Request from '../Request.js';
import Response from '../Response.js';
import WebSocket from '../WebSocket/WebSocket.js';
import LoggerManager from '../LoggerManager.js';
import Config from '../Config/Config.js';
import Middleware from './Middleware.js';

export { Rule } from './Rule.js';
export { WsRule } from './WsRule.js';
export { HttpRule } from './HttpRule.js';

const logger = LoggerManager.getInstance();

export class Router {
    public httpRules: Router.HttpRule[] = [];
    public wsRules: Router.WsRule[] = [];
    public config: Config;

    constructor(config: Config, rules: Router.rules[] = []) {
        this.config = config;
		this.addRules(...rules);
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
		this.routeRequest(request, response);
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
		this.routeWebSocket(request, webSocket);
	}
    /**
	 * Routes incoming HTTP requests to be processed.
	 * @param request - The received HTTP request.
	 * @param response - The server response handler.
	 */
	private async routeRequest(request: Request, response: Response): Promise<void> {
		const rule = this.httpRules.find((rule) => rule.test(request));
		if (!rule) return void response.sendError(400, `No router for: ${request.method} -> ${request.url}`);
		return void rule.exec(request, response);
	}
	/**
	 * Routes WebSocket connection requests.
	 * @param request - The received HTTP request.
	 * @param webSocket - The WebSocket connection with the client.
	 * @throws If no WebSocket routing rule matches.
	 */
	private async routeWebSocket(request: Request, webSocket: WebSocket): Promise<void> {
		const rule = this.wsRules.find((rule) => rule.test(request));
		if (!rule) return void webSocket.reject(400, `No router for: ${request.method} -> ${request.url}`);
		return void rule.exec(request, webSocket);
	}
	/**
	 * Adds one or more routing rules to the server.
	 * @param rules - The rule(s) to be added.
	 */
	public addRules(...rules: Router.rules[]): this {
		for (const rule of rules ) this.addRule(rule);
		return this;
	}
	/**
	 * Adds one or more routing rules to the server.
	 * @param rule - The rule(s) to be added.
	 */
	public addRule(rule: Router.rules): this {
		if (rule instanceof Router.WsRule) this.wsRules.push(rule);
		else { this.httpRules.push(rule); }
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
}
export namespace Router {
    export import Rule = _Rule;
	export import WsRule = _WsRule;
	export import HttpRule = _HttpRule;
	export type rules = WsRule | HttpRule;
}

export default Router;