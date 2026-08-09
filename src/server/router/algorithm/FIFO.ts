import { CLIENT, RULE } from '../../../support/symbols.js';

import type Request from '../../Request.js';
import type HttpRule from '../rule/HttpRule.js';
import type RouterRule from '../rule/RouterRule.js';
import type WsRule from '../rule/WsRule.js';

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
        return this.httpRules.find(rule => rule.test(request)) || this.wsRules.find(rule => rule.test(request)) || null;
    }
}
export namespace FIFO {}
export default FIFO;