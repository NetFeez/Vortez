/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds a logger manager to have an instance of the Vortez loggers.
 * @license Apache-2.0
 */

import Debug from "../Debug.js";
import _Logger from "./Logger.js";

export class LoggerManager {
    private static instance: LoggerManager | null;
    public static getInstance(): LoggerManager {
        if (!LoggerManager.instance) LoggerManager.instance = new LoggerManager();
        return LoggerManager.instance;
    }
    public server: LoggerManager.Logger;
    public request: LoggerManager.Logger;
    public response: LoggerManager.Logger;
    public webSocket: LoggerManager.Logger;
    private constructor() {
        this.server = new LoggerManager.Logger({ prefix: 'Server' });
        this.request = new LoggerManager.Logger({ prefix: 'Request' });
        this.response = new LoggerManager.Logger({ prefix: 'Response' });
        this.webSocket = new LoggerManager.Logger({ prefix: 'WebSocket' })
    }
    public log(...data: any[]) { this.server.log(...data); }
    public info(...data: any[]) { this.server.info(...data); }
    public warn(...data: any[]) { this.server.warn(...data); }
    public error(...data: any[]) { this.server.error(...data); }
}
export namespace LoggerManager {
    export import Logger = _Logger;
}
export default LoggerManager;