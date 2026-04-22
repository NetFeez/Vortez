import { inspect } from "node:util";

import { Time } from "@netfeez/common";

export class Formatter {
    protected readonly format: Formatter.Format;
    protected vArgCustomers: Formatter.Customer[];
    public constructor(format: Formatter.Options) {
        this.format = Formatter.normalizeOptions(format);
        this.vArgCustomers = Formatter.defaultCustomers();
    }
    public execute(date: Date, level: string, name: string, ...data: any[]): string[] {
        data = this.customizeArgs(data);
        const message = data.join(' ');
        const lines = this.splitMessage(message, this.format.maxMessageLength);
        return lines.map(line => this.formatMessage(date, level, name, line));
    }
    protected formatMessage(date: Date, level: string, name: string, message: string): string {
        let dateFormatted = Time.format(this.format.timestampFormat);
        let line = this.format.messageFormat
            .replace('{timestamp}', this.format.timestamp ? dateFormatted : '')
            .replace('{level}',     this.format.level     ? level         : '')
            .replace('{name}',      this.format.name      ? name          : '')
            .replace('{message}', message);
        return line;
    }
    protected splitMessage(message: string, maxLength: number): string[] {
        const originalLines = message.split(/\r?\n/);
        const lines: string[] = [];
        const regex = new RegExp(`(?:.{1,${maxLength}}(\\s|$))|(?:.{1,${maxLength}})`, 'g');

        for (const line of originalLines) {
            if (line.length <= maxLength) lines.push(line);
            else {
                const chunks = line.match(regex) || [line];
                lines.push(...chunks);
            }
        }
        return lines;
    }
    
    protected customizeArgs(args: any[]): string[] {
        return args.map((arg) => {
            for (const customer of this.vArgCustomers) {
                const formatted = customer(arg);
                if (typeof formatted === 'string') return formatted;
            }
            return `${arg}`;
        });
    }
    protected static normalizeOptions(options: Formatter.Options): Formatter.Format {
        const {
            timestamp = true, level = true, name = true,
            timestampFormat = '&C7[{YYYY}-{MM}-{DD}] [{HH}:{mm}:{ss}]&R',
            messageFormat = '{timestamp} {level} {name} -> {message}',
            maxMessageLength = 250
        } = options;
        return { timestamp, level, name, timestampFormat, messageFormat, maxMessageLength };
    }
    protected static defaultCustomers(): Formatter.Customer[] {
        return [
            arg => typeof arg === 'string'  ? `&C7${arg}&R`                  : undefined,
            arg => typeof arg === 'number'  ? `&C3${arg}&R`                  : undefined,
            arg => typeof arg === 'boolean' ? `&C${arg ? '6' : '1'}${arg}&R` : undefined,
            arg => arg instanceof Error     ? `&C1${arg.message}&R`          : undefined,
            arg => {
                if (!(arg instanceof Object)) return undefined;
                if (arg.constructor?.name === 'Object' && Object.keys(arg).length === 0) return '&C6{}&R';

                const name = arg.constructor?.name || 'Object';
                const details = inspect(arg, {
                    depth: 2,
                    colors: false,
                    compact: true,
                    showHidden: false
                });
                    
                return `&C6[${name}]: ${details}&R`;
            }
        ];
    }
}
export namespace Formatter {
    export type Customer = (arg: any) => string | undefined;
    export type Format = Required<Options>;
    export interface Options {
        timestamp?: boolean;
        level?: boolean;
        name?: boolean;
        timestampFormat?: string;
        messageFormat?: string;
        maxMessageLength?: number;
    }
}
export default Formatter;