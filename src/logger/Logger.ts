import Formatter from "./Formatter.js";
import LoggerCore from "./LoggerCore.js";

export class Logger {
    public static default = new Logger();

    protected readonly formatter: Formatter;
    protected readonly core: LoggerCore;
    protected name: string;
    public save: boolean;
    public show: boolean;

    public constructor(options: Logger.Options | Logger = {}) {
        if (options instanceof Logger) {
            this.core = options.core;
            this.name = options.name;
            this.save = options.save;
            this.show = options.show;
            this.formatter = options.formatter;
            return;
        }
        this.core = Logger.getCore(options.logger);
        this.name = options.name || this.core.id;
        this.save = options.save ?? this.core.save;
        this.show = options.show ?? this.core.show;
        this.formatter = Logger.getFormatter(this.core.formatter, options.formatter);
    }

    public log(...data: any[]): void { this.send(Logger.LEVEL.LOG, ...data); }
    public info(...data: any[]): void { this.send(Logger.LEVEL.INF, ...data); }
    public warn(...data: any[]): void { this.send(Logger.LEVEL.WRN, ...data); }
    public error(...data: any[]): void { this.send(Logger.LEVEL.ERR, ...data); }
    public debug(...data: any[]): void { this.send(Logger.LEVEL.DBG, ...data); }

    protected send(level: Logger.LEVEL, ...data: any[]): void {
        const color = Logger.getColor(level);
        this.core.customLog({
            formatter: this.formatter,
            level: `${color}[${level}]&R`,
            name: `${color}[${this.name}${color}]&R`,
            save: this.save,
            show: this.show,
            data
        });
    }

    public static log(...data: any) { this.send(Logger.LEVEL.LOG, ...data); }
    public static info(...data: any) { this.send(Logger.LEVEL.INF, ...data); }
    public static warn(...data: any) { this.send(Logger.LEVEL.WRN, ...data); }
    public static error(...data: any) { this.send(Logger.LEVEL.ERR, ...data); }
    public static debug(...data: any) { this.send(Logger.LEVEL.DBG, ...data); }

    protected static send(level: Logger.LEVEL, ...data: any): void {
        const color = Logger.getColor(level);
        Logger.default.core.customLog({ level: `${color}[${level}]`, data });
    }

    protected static getFormatter(defaultF: Formatter, formatter?: Formatter | Formatter.Options): Formatter {
        if (!formatter) return defaultF;
        else if (formatter instanceof Formatter) return formatter;
        else return new Formatter(formatter);
    }
    protected static getCore(logger?: Logger.Core): LoggerCore {
        if (!logger) return LoggerCore.get('default');
        else if (logger instanceof LoggerCore) return logger;
        else if (logger instanceof Logger) return logger.core;
        else if (typeof logger === 'string') return LoggerCore.get(logger);
        else if ('id' in logger) return LoggerCore.get(logger.id, logger);
        else return LoggerCore.get(logger);
    }
    protected static getColor(level: Logger.LEVEL): string {
        switch (level) {
            case Logger.LEVEL.LOG: return '&C(#FFB4DC)';
            case Logger.LEVEL.INF: return '&C6';
            case Logger.LEVEL.WRN: return '&C3';
            case Logger.LEVEL.ERR: return '&C1';
            case Logger.LEVEL.DBG: return '&C7';
            default: return '&R';
        }
    }
}
export namespace Logger {
    export enum LEVEL {
        LOG = 'LOG',
        INF = 'INF',
        WRN = 'WRN',
        ERR = 'ERR',
        DBG = 'DBG'
    }
    export type FormatterOption = Formatter | Formatter.Options;
    export type Core = string | Logger | LoggerCore | LoggerOptions;
    export interface Options extends Omit<LoggerCore.Options, 'path'> {
        name?: string;
        formatter?: FormatterOption;
        logger?: Core;
    }
    export interface LoggerOptions extends LoggerCore.Options {
        id: string;
    }
}
export default Logger;