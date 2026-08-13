import { RULE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type ws from "../../websocket/ws.js";
import type Middleware from "../middleware/Middleware.js";
import Pipeline from "../middleware/Pipeline.js";
import Tracker from "../Tracker.js";

import Rule from "./Rule.js";

export class WsRule extends Rule<WsRule.Content> {
    public [RULE.WEBSOCKET] = true;
    public readonly identifier = 'ws';
    /**
     * Tests whether a request matches the routing rule.
     * @param request - The request to test.
     * @returns True if the request matches the routing rule, false otherwise.
     * @Remarks This method overrides the base Rule.test() method to add additional checks for HTTP requests.
     */
    public constructor(
        template: string,
        content: WsRule.Content,
        pipeline: Pipeline = new Pipeline()
    ) { super(template, content, pipeline); }

    public override test(request: Request): boolean {
        if (!WsRule.isWebsocketRequest(request)) return false;
        return super.test(request);
    }

    public override async exec(request: Request, client: ws.Server, state: Middleware.State = {}, tracker?: Tracker): Promise<void> {
        request.ruleParams = this.params(request.url);
        await this.pipeline.run(request, client, async middlewareState => {
            await this.vContent(request, client, middlewareState);
        }, state, tracker);
    }

    /**
     * Tests whether a request is a WebSocket request.
     * @param request - The request to test.
     * @returns True if the request is a WebSocket request, false otherwise.
     * @Remarks This method is used by the router to determine whether a request is an HTTP request or a WebSocket request.
     */
    public static isWebsocketRequest(request: Request): boolean {
        if (!('upgrade' in request.headers)) return false;
        if (!('sec-websocket-key' in request.headers)) return false;
        if (request.method !== 'GET') return false;
        return true;
    }
}

export namespace WsRule {
    export type Content = (request: Request, websocket: ws.Server, state: Middleware.State) => void | Promise<void>;
}

export default WsRule;