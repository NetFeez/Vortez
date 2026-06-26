import { RULE } from '../../../support/symbols.js';

import type Request from '../../Request.js';
import type Response from '../../Response.js';
import type Websocket from '../../websocket/ws.js';
import type HttpRule from '../rule/HttpRule.js';
import type WsRule from '../rule/WsRule.js';

import Algorithm from './Algorithm.js';

export class FIFO extends Algorithm {
    protected rules: (HttpRule | WsRule)[] = [];
    public override get allRules() { return this.rules; }
    public override add(...rules: Algorithm.ruleType[]): Promise<void> | void { this.rules.push(...rules); }
    protected override routeHttp(request: Request, client: Response): boolean {
        const rule = this.rules.find((rule): rule is HttpRule => RULE.HTTP in rule && rule.test(request));
        if (!rule) return false;
        rule.exec(request, client);
        return true;
    }
    protected override routeWebsocket(request: Request, connection: Websocket.Server): boolean {
        const rule = this.rules.find((rule): rule is WsRule => RULE.WEBSOCKET in rule && rule.test(request));
        if (!rule) return false;
        rule.exec(request, connection);
        return true;
    }
}
export namespace FIFO {}
export default FIFO;