/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Utility to help with debugging tasks and server development.
 * @license Apache-2.0
 */
import { DebugUI } from '@netfeez/vterm';
import Grouper from '@netfeez/vterm/logger/Grouper';

import { RULE } from '../support/symbols.js';

import type Server from './Server.js';
import type HttpRule from './router/rule/HttpRule.js';
import type WsRule from './router/rule/WsRule.js';
import type RouterRule from './router/rule/RouterRule.js';

export class ServerDebug extends DebugUI {
    public readonly group: Grouper.GroupOptions = {
        open: '&C(#FFB4DC)╭─',
        line: '&C(#FFB4DC)├─',
        item: '&C(#FFB4DC)│ &R',
        stop: '&C(#FFB4DC)╰─',
    };

    public constructor(
        public server: Server
    ) {  super(); }

}

export namespace ServerDebug {}

export default ServerDebug;