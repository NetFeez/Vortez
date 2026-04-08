/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Utility to help with debugging tasks and server development.
 * @license Apache-2.0
 */

import type Server from './Server.js';
import DebugUI from '../utilities/DebugUI.js';

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
        for (const rule of this.server.router.httpRules) {
            this.out.info(`&C(255,180,220)│ &C3 http rule: &C2${rule.method.padStart(5, ' ')} &R-> &C6${rule.urlRule}`);
        }
        for (const rule of this.server.router.wsRules) {
            this.out.info(`&C(255,180,220)│ &C3 ws rule: &C6${rule.urlRule}`);
        }
        this.out.info('&C(255,180,220)╰─────────────────────────────────────────────');
    }
    /** Prints the server configuration to the console. */
    public showConfig() {
        const { config } = this.server;
        this.out.info('&C(255,180,220)╭─────────────────────────────────────────────');
        this.out.info('&C(255,180,220)│ &C2 Server Configuration');
        this.out.info('&C(255,180,220)├─────────────────────────────────────────────');
        this.out.info(`&C(255,180,220)│ &C3Port: &C6${config.get('port')}`);
        this.out.info(`&C(255,180,220)│ &C3Host: &C6${config.get('host')}`);
        if (config.data.ssl) {
            this.out.info(`&C(255,180,220)│ &C3ssl options`);
            this.out.info(`&C(255,180,220)│   - &C3enabled: &C6${config.get('ssl.port') ?? 443}`);
            this.out.info(`&C(255,180,220)│   - &C3cert: &C6${config.get('ssl.pubKey')}`);
            this.out.info(`&C(255,180,220)│   - &C3key: &C6${config.get('ssl.privKey')}`);
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
export namespace ServerDebug {}
export default ServerDebug;