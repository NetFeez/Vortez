/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds a logger manager to have an instance of the Vortez loggers.
 * @license Apache-2.0
 */

import Debug from "../Logger/Debug.js";
import Logger from "../Logger/Logger.js";

export class LoggerManager {
    private static instance: LoggerManager | null;
    public static getInstance(): LoggerManager {
        if (!LoggerManager.instance) LoggerManager.instance = new LoggerManager();
        return LoggerManager.instance;
    }
    public server: Logger;
    public request: Logger;
    public response: Logger;
    public webSocket: Logger;
    private constructor() {
        this.server = new Logger({ prefix: 'Server' });
        this.request = new Logger({ prefix: 'Request' });
        this.response = new Logger({ prefix: 'Response' });
        this.webSocket = new Logger({ prefix: 'WebSocket' })
    }
    public log(...data: any[]) { this.server.log(...data); }
    public info(...data: any[]) { this.server.info(...data); }
    public warn(...data: any[]) { this.server.warn(...data); }
    public error(...data: any[]) { this.server.error(...data); }
}
export namespace LoggerManager {}
export default LoggerManager;