import HTTP from 'http';
import { Duplex } from 'stream';

import Request from "../Request.js";
import Response from "../Response.js";
import Websocket from "../websocket/ws.js";
import LoggerManager from "../LoggerManager.js";

import type Config from "../config/Config.js";
import type Router from "./Router.js";

export class Gate {
    public constructor(
        private readonly config: Config,
        private readonly router: Router,
        private readonly logger = LoggerManager.getInstance()
    ) {}

    public async requestManager(HttpRequest: HTTP.IncomingMessage, HttpResponse: HTTP.ServerResponse): Promise<void> {
        const request = new Request(HttpRequest);
        const response = new Response(request, HttpResponse, this.config.data.templates);
        const sessionID = request.cookies.get('Session');
        this.logger.request.log(request.ip, request.method, request.url, sessionID);
        const routed = await this.router.route(request, response);
        if (!routed && !response.isSent) await response.sendError(404, `No route for: ${request.method} -> ${request.url}`);
    }

    public async upgradeManager(HttpRequest: HTTP.IncomingMessage, Socket: Duplex): Promise<void> {
        const request = new Request(HttpRequest);
        const websocket = new Websocket.Server(request, Socket);
        const sessionID = request.cookies.get('Session');
        this.logger.webSocket.log(request.ip, request.method, request.url, sessionID);
        const routed = await this.router.route(request, websocket);
        if (!routed) websocket.reject(404, `No route for: ${request.method} -> ${request.url}`).catch(() => {});
    }
}