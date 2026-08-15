import { RULE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type Response from "../../Response.js";
import type ws from "../../websocket/ws.js";
import type Middleware from "../middleware/Middleware.js";
import Pipeline from "../middleware/Pipeline.js";
import Router from "../Router.js";
import Tracker from "../Tracker.js";

import Rule from "./Rule.js";

export class RouterRule extends Rule<Router> {

    public [RULE.ROUTER] = true;
    public readonly identifier = 'router';

    public constructor(
        template: string,
        content: Router,
        pipeline: Pipeline = new Pipeline()
    ) {
        template = template.endsWith('/*') ? template : template + '/*';
        super(template, content, pipeline);
    }

    public override test(url: string, method?: string, isWs?: boolean): boolean {
        if (!super.test(url)) return false;
        const surplus = this.surplus(url);
        return this.content.test(surplus, method, isWs);
    }

    public override async exec(request: Request, client: Response | ws.Server, state: Middleware.State = {}, tracker?: Tracker, currentPath?: string): Promise<void> {
        const path = currentPath ?? request.url;
        const surplus = this.surplus(path);
        await this.content.route(request, client, state, tracker, surplus);
    }
}

export namespace RouterRule { }

export default RouterRule;