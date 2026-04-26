/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Utility to help with debugging tasks and server development.
 * @license Apache-2.0
 */
import { DebugUI } from '@netfeez/vterm';

import type Server from './Server.js';

export class ServerDebug extends DebugUI {
    public constructor(
        public server: Server
    ) { super();
        this.addCommand('sv-start', this.server.start.bind(this.server), { description: '&C6Starts the server', usage: 'start' });
        this.addCommand('sv-stop', this.server.stop.bind(this.server), { description: '&C6Stops the server', usage: 'stop' });
        this.addCommand('sv-restart', this.server.restart.bind(this.server), { description: '&C6Restarts the server', usage: 'restart' });
        this.addCommand('sv-rules', this.showRules.bind(this), { description: '&C6Shows the server rules', usage: 'rules' });
        this.addCommand('sv-config', this.showConfig.bind(this), { description: '&C6Shows the server configuration', usage: 'config' });
        this.addCommand('exit-debug', this.stopReadIn.bind(this), { description: '&C6Exits the debug UI', usage: 'exit-debug' });
        this.addCommand('exit', () => process.exit(), { description: '&C6Exits the process', usage: 'exit' });;
    }
    /** Prints the server rules to the console. */
    public showRules() {
		this.out.info('&C(255,180,220)╭─────────────────────────────────────────────');
        this.out.info('&C(255,180,220)│ &C2 Rules added to server router');
		this.out.info('&C(255,180,220)├─────────────────────────────────────────────');
        const algorithm = this.server.config.get('routing.algorithm') ?? 'FIFO';
        this.out.info(`&C(255,180,220)│ &C3 algorithm: &C6${algorithm}`);

        if (algorithm === 'Tree') {
            this.printTreeRules();
            this.out.info('&C(255,180,220)╰─────────────────────────────────────────────');
            return;
        }

        for (const rule of this.server.router.httpRules) {
            this.out.info(`&C(255,180,220)│ &C3 http rule: &C2${rule.method.padStart(5, ' ')} &R-> &C6${rule.urlRule}`);
        }
        for (const rule of this.server.router.wsRules) {
            this.out.info(`&C(255,180,220)│ &C3 ws rule: &C6${rule.urlRule}`);
        }
        this.out.info('&C(255,180,220)╰─────────────────────────────────────────────');
    }

    private printTreeRules() {
        const root: ServerDebug.RouteTreeNode = { children: new Map(), rules: [] };

        for (const rule of this.server.router.httpRules) {
            this.addRuleToTree(root, rule.urlRule, `http ${rule.method}`);
        }
        for (const rule of this.server.router.wsRules) {
            this.addRuleToTree(root, rule.urlRule, 'ws');
        }

        this.out.info('&C(255,180,220)│ &C3 tree nodes:');
        const topEntries = [...root.children.entries()].sort(([a], [b]) => a.localeCompare(b));
        if (!topEntries.length) {
            this.out.info('&C(255,180,220)│   (empty)');
            return;
        }

        for (let index = 0; index < topEntries.length; index++) {
            const [label, node] = topEntries[index];
            const isLast = index === topEntries.length - 1;
            this.printTreeNode(label, node, '', isLast);
        }
    }

    private addRuleToTree(root: ServerDebug.RouteTreeNode, urlRule: string, ruleLabel: string) {
        const segments = urlRule.split('/').filter(Boolean);
        let current = root;

        for (const segment of segments) {
            const label = this.formatSegmentLabel(segment);
            const next = current.children.get(label) ?? { children: new Map(), rules: [] };
            current.children.set(label, next);
            current = next;
        }
        current.rules.push(ruleLabel);
    }

    private printTreeNode(label: string, node: ServerDebug.RouteTreeNode, prefix: string, isLast: boolean) {
        const branch = isLast ? '└─ ' : '├─ ';
        this.out.info(`&C(255,180,220)│ ${prefix}${branch}&C6${label}`);

        const nextPrefix = `${prefix}${isLast ? '   ' : '│  '}`;
        const rules = [...node.rules].sort();
        const children = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));
        const total = rules.length + children.length;

        let index = 0;
        for (const rule of rules) {
            index++;
            const leafBranch = index === total ? '└─ ' : '├─ ';
            this.out.info(`&C(255,180,220)│ ${nextPrefix}${leafBranch}&C2${rule}`);
        }
        for (const [childLabel, childNode] of children) {
            index++;
            this.printTreeNode(childLabel, childNode, nextPrefix, index === total);
        }
    }

    private formatSegmentLabel(segment: string): string {
        if (segment === '*') return '*';
        if (segment.startsWith('$?')) return `param?(${segment.slice(2)})`;
        if (segment.startsWith('$')) return `param(${segment.slice(1)})`;
        return segment;
    }
    /** Prints the server configuration to the console. */
    public showConfig() {
        const { config } = this.server;
        this.out.info('&C(255,180,220)╭─────────────────────────────────────────────');
        this.out.info('&C(255,180,220)│ &C2 Server Configuration');
        this.out.info('&C(255,180,220)├─────────────────────────────────────────────');
        this.out.info(`&C(255,180,220)│ &C3Port: &C6${config.get('port')}`);
        this.out.info(`&C(255,180,220)│ &C3Host: &C6${config.get('host')}`);
        this.out.info(`&C(255,180,220)│ &C3Host: &C6${config.get('host')}`);

        this.out.info(`&C(255,180,220)│ &C3routing options`);
        this.out.info(`&C(255,180,220)│   - &C3algorithm: &C6${config.get('routing.algorithm')}`);

        if (config.data.ssl) {
            this.out.info(`&C(255,180,220)│ &C3ssl options`);
            this.out.info(`&C(255,180,220)│   - &C3enabled: &C6${config.get('ssl.port') ?? 443}`);
            this.out.info(`&C(255,180,220)│   - &C3cert: &C6${config.get('ssl.cert')}`);
            this.out.info(`&C(255,180,220)│   - &C3key: &C6${config.get('ssl.key')}`);
        }
        this.out.info(`&C(255,180,220)│ &C3server templates`);
        for (const name in config.data.templates) {
            const path = config.data.templates[name as keyof Server.Config['data']['templates']] ?? 'undefined';
            this.out.info(`&C(255,180,220)│   - &C3${name}: &C6${path}`);
        }
        this.out.info(`&C(255,180,220)│ &C3Debug options`);
        this.out.info(`&C(255,180,220)│   - &C3 showAll: &C6${config.get('logger.showAll')}`);
        this.out.info(`&C(255,180,220)│   - &C3 show server logs: &C6${config.get('logger.server.show')}`);
        this.out.info(`&C(255,180,220)│   - &C3 save server logs: &C6${config.get('logger.server.save')}`);
        this.out.info(`&C(255,180,220)│   - &C3 show requests logs: &C6${config.get('logger.request.show')}`);
        this.out.info(`&C(255,180,220)│   - &C3 save requests logs: &C6${config.get('logger.request.save')}`);
        this.out.info(`&C(255,180,220)│   - &C3 show responses logs: &C6${config.get('logger.response.show')}`);
        this.out.info(`&C(255,180,220)│   - &C3 save responses logs: &C6${config.get('logger.response.save')}`);
        this.out.info(`&C(255,180,220)│   - &C3 show websockets logs: &C6${config.get('logger.websocket.show')}`);
        this.out.info(`&C(255,180,220)│   - &C3 save websockets logs: &C6${config.get('logger.websocket.save')}`);
        this.out.info('&C(255,180,220)╰─────────────────────────────────────────────');
    }
}

export namespace ServerDebug {
    export interface RouteTreeNode {
        children: Map<string, RouteTreeNode>;
        rules: string[];
    }
}
export default ServerDebug;