import Algorithm from './Algorithm.js';

import type Request from '../../Request.js';
import Response from '../../Response.js';
import Websocket from '../../websocket/Websocket.js';
import HttpRule from '../HttpRule.js';
import WsRule from '../WsRule.js';

export class FIFO extends Algorithm {
    protected rules: (HttpRule | WsRule)[] = [];
    public get allRules() { return this.rules; }
    public override add(...rules: Algorithm.ruleType[]): Promise<void> | void { this.rules.push(...rules); }
    protected override routeHttp(request: Request, client: Response): boolean {
        const rule = this.rules.find((rule): rule is HttpRule => rule instanceof HttpRule && rule.test(request));
        if (!rule) return false;
        rule.exec(request, client);
        return true;
    }
    protected override routeWebsocket(request: Request, client: Websocket): boolean {
        const rule = this.rules.find((rule): rule is WsRule => rule instanceof WsRule && rule.test(request));
        if (!rule) return false;
        rule.exec(request, client);
        return true;
    }
}
export namespace FIFO {}
export default FIFO;