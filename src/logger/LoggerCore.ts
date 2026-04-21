import Path from "../utilities/Path.js";
import ConsoleUI from "../utilities/ConsoleUI.js";

import LoggerStream from "./LoggerStream.js";
import Formatter from "./Formatter.js";
import Date from "./Date.js";

export class LoggerCore {
    protected static rootPath: string = '.logs';
    protected static fileExtension: string = 'vlog';

    protected static defaultID: string = 'default';
    protected static instances: LoggerCore.InstanceMap = new Map();
    protected static default = LoggerCore.get();
    

    /**
     * Get a LogEngine instance by ID. If it doesn't exist, create a new one with the provided format options.
     * @param id - Unique identifier for the LogEngine instance.
     * @param format - Optional formatting options for the LogEngine instance.
     * @returns A LogEngine instance associated with the given ID.
     */
    public static get(id: string = LoggerCore.defaultID, options: LoggerCore.Options = {}): LoggerCore {
        let instance = this.instances.get(id);
        if (!instance) {
            instance = new LoggerCore(id, options);
            this.instances.set(id, instance);
        }
        return instance;
    }

    protected readonly startTime: Date;
    protected readonly path: string;
    protected readonly stream: LoggerStream;

    public formatter: Formatter;
    public save: boolean;
    public show: boolean;

    protected constructor(
        public readonly id: string,
        options: LoggerCore.Options
    ) {
        this.formatter = options.format instanceof Formatter ? options.format : new Formatter(options.format || {});
        this.save = options.save ?? true;
        this.show = options.show ?? true;
        this.startTime = new Date();
        this.path = options.path
            ? LoggerCore.compilePath(options.path, this.startTime)
            : LoggerCore.compilePath(`${LoggerCore.rootPath}/{YYYY}.{MM}.{DD}/[${this.id}] {HH}.{mm}.{ss}.{ms}.${LoggerCore.fileExtension}`, this.startTime);
        this.stream = new LoggerStream(this.path);
    }

    public customLog(options: LoggerCore.CustomLog): void {
        const {
            level = '&C6[INFO]&R', name = `&C6[${this.id}]&R`, date = new Date(),
            save = this.save, show = this.show,
            data = [], formatter = this.formatter
        } = options;
        const now = date instanceof Date ? date : new Date(date);
        const args = Array.isArray(data) ? data : [data];
        const lines = formatter.execute(now, level, name, ...args);
        lines.forEach((line) => {
            if (show) console.log(ConsoleUI.formatText(line));
            if (save) this.stream.push(line + '\n');
        });
    }
    protected static compilePath(path: string, date?: Date): string {
        const now = date ?? new Date();
        path = now.format(path);
        return Path.normalize(path); 
    }
}
export namespace LoggerCore {
    export type InstanceMap = Map<string, LoggerCore>;
    export interface CustomLog {
        formatter?: Formatter;
        level?: string;
        name?: string;
        date?: Date | globalThis.Date | number;
        save?: boolean;
        show?: boolean;
        data: any[] | any;
    }
    export interface LoggerFunction {
        save: boolean;
        show: boolean;
    }
    export interface Options {
        format?: Formatter | Formatter.Options;
        save?: boolean;
        show?: boolean;
        path?: string;
    }
}
export default LoggerCore;