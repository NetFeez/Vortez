/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds a logger class to have organized logs.
 * @license Apache-2.0
*/

import _Debug from "./Debug.js";

export { Debug } from "./Debug.js";

export class Logger {
    private static readonly LEVEL_MAP: Logger.LevelMap = {
        log: `&C2[LOG]`,
        warn: `&C3[WRN]`,
        info: `&C6[INF]`,
        error: `&C1[ERR]`,
    }
    private prefix: string;
    private format: string;
    private debug: Logger.Debug;
    public show: boolean = true;
    public save: boolean = true;
    constructor(options: Logger.Options = {}) {
        const { prefix = 'Logger', format = '&R&C7', debug = Logger.Debug.default } = options;
        this.prefix = prefix;
        this.format = format;
        if (debug instanceof Logger.Debug) this.debug = debug;
        else if (typeof debug === 'string') this.debug = Logger.Debug.getInstance(debug);
        else if (typeof debug === 'object') this.debug = Logger.Debug.getInstance(debug.id, debug);
        else {
            this.debug = Logger.Debug.default;
            this.warn('The provided option.debug is not valid, the default debug instance will be used.');
        }
    }
    public log (...data: any[]) { this.debug.customLog(data, this.getLogOptions('log')); }
    public warn (...data: any[]) { this.debug.customLog(data, this.getLogOptions('warn')); }
    public info (...data: any[]) { this.debug.customLog(data, this.getLogOptions('info')); }
    public error (...data: any[]) { this.debug.customLog(data, this.getLogOptions('error')); }
    private getLogOptions(level: Logger.level): Logger.Debug.LogOptions {
        const prefix = `${Logger.LEVEL_MAP[level]} [${this.prefix}]${this.format}`
        return { prefix, save: this.save, show: this.show, }
    }
}
export namespace Logger {
    export import Debug = _Debug;
    export type level = 'log' | 'warn' | 'info' | 'error';
    export type LevelMap = Record<level, string>;
    export interface NewDebugOptions {
        id: string;
        path?: string;
        show?: boolean;
        save?: boolean;
    }
    export interface Options {
        prefix?: string;
        format?: string;
        debug?: string | Logger.Debug | NewDebugOptions;
    }
}
export default Logger;