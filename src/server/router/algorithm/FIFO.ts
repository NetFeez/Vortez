import { RULE } from '../../../support/symbols.js';

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

    public override clear(): Promise<void> | void {
        this.httpRules = [];
        this.wsRules = [];
        this.routerRules = [];
    }

    public override find(url: string, method?: string, isWs?: boolean): Algorithm.ruleType | null {
        return this.rules.find(r => r.test(url, method, isWs)) || null;
    }
}
export namespace FIFO { }
export default FIFO;