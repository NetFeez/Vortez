import Request from '../Request.js';
import WebSocket from '../WebSocket/WebSocket.js';
import BaseRule from './Rule.js';

export class WsRule extends BaseRule<WsRule.action> {
    public exec(request: Request, client: WebSocket): void {
        request.ruleParams = this.getParams(request.url);
        return this.action(request, client);
    }
}
export namespace WsRule {
    export type action = (request: Request, client: WebSocket) => void;
}
export default WsRule;