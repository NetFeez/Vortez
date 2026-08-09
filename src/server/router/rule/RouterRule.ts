import { RULE } from "../../../support/symbols.js";

import type Request from "../../Request.js";
import type Response from "../../Response.js";
import type ws from "../../websocket/ws.js";
import type Middleware from "../middleware/Middleware.js";
import Pipeline from "../middleware/Pipeline.js";
import Router from "../Router.js";

import Rule from "./Rule.js";

export class RouterRule extends Rule<Router> {

    public [RULE.ROUTER] = true;
    public readonly identifier = 'router';

    public constructor(
        template: string,
        content: Router,
        pipeline: Pipeline = new Pipeline()
    ) { super(template, content, pipeline); }

    /**
     * Tests whether a request matches the routing rule.
     * @param request - The request to test.
     * @returns True if the request matches the routing rule, false otherwise.
     * @Remarks This method overrides the base Rule.test() method to add additional checks for HTTP requests.
     */
    public override test(request: Request): boolean {
        return super.test(request) && this.content.test(request);
    }
    public override async exec(request: Request, client: Response | ws.Server, state: Middleware.State = {}): Promise<void> {
        await this.content.route(request, client, state);
    }
}

export namespace RouterRule {}

export default RouterRule;