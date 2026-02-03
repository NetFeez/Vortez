import Request from '../Request.js';
import WebSocket from '../WebSocket/WebSocket.js';
import Middleware from './Middleware/Middleware.js';
import WsMiddleware from './Middleware/WsMiddleware.js';
import BaseRule from './Rule.js';

export class WsRule extends BaseRule<WsRule.action> {
    public constructor(
        public readonly urlRule: string,
        public readonly action: WsRule.action,
        public readonly middleware: WsMiddleware = new WsMiddleware()
    ) { super(urlRule, action); }
    /**
     * Adds a middleware to this specific rule.
     * @param action The middleware action.
     */
    public use(action: Middleware.wsAction): this {
        this.middleware.use(action);
        return this;
    }
    public exec(request: Request, client: WebSocket, state?: Middleware.State): void {
        request.ruleParams = this.getParams(request.url);
        this.middleware.run(request, client, this.action, state);
    }
    public test(request: Request): boolean {
        return super.test(request);
    }
}
export namespace WsRule {
    export type action = (request: Request, client: WebSocket, state: Middleware.State) => void;
}
export default WsRule;