import { CLIENT, RULE } from '../../../support/symbols.js';

import type Request from '../../Request.js';
import HttpRule from '../rule/HttpRule.js';
import WsRule from '../rule/WsRule.js';
import type RouterRule from '../rule/RouterRule.js';

import Algorithm from './Algorithm.js';

export class FIFO extends Algorithm {
    protected httpRules: HttpRule[] = [];
    protected wsRules: WsRule[] = [];
    protected routerRules: RouterRule[] = [];
    public override get rules(): (HttpRule | WsRule | RouterRule)[] { return [...this.httpRules, ...this.wsRules, ...this.routerRules]; }
    public override add(...rules: Algorithm.ruleType[]): Promise<void> | void {
        for (const rule of rules) {
            if (RULE.HTTP in rule) this.httpRules.push(rule);
            else if (RULE.WEBSOCKET in rule) this.wsRules.push(rule);
            else if (RULE.ROUTER in rule) this.routerRules.push(rule);
            else throw new Error(`Invalid rule type: ${rule}`);
        }
    }
    public override find(request: Request): Algorithm.ruleType | null {
        let rule: Algorithm.ruleType | null = null;
        if (HttpRule.isHttpRequest(request)) rule = this.httpRules.find(r => r.test(request)) || null;
        else if (WsRule.isWebsocketRequest(request)) rule = this.wsRules.find(r => r.test(request)) || null;
        if (!rule) rule = this.routerRules.find(r => r.test(request)) || null;
        return rule;
    }
}
export namespace FIFO {}
export default FIFO;