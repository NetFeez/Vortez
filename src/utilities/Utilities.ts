/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Exports all utility classes and functions, providing a centralized access point for various helper methods used throughout the project.
 * This includes:
 * - file operations: `Utilities.File`.
 * - object manipulation: `Utilities.Object`.
 * - encoding: `Utilities.Encoding`.
 * - time utilities: `Utilities.Time`.
 * and more utilities.
 * @license Apache-2.0
 */
import _Path from './Path.js';
import _Env from './Env.js';
import _ConsoleUI from './ConsoleUI.js';
import _DebugUI from './DebugUI.js';
import _File from './File.js';
import _Encoding from './Encoding.js';

export { Path } from './Path.js';
export { Env } from './Env.js';
export { ConsoleUI } from './ConsoleUI.js';
export { DebugUI } from './DebugUI.js';
export { File } from './File.js';
export { Encoding } from './Encoding.js';

export class Utilities {
    /**
     * Checks if a file exists at the given path.
     * @param path - The file path to check.
     * @returns A promise that resolves to true if the file exists, false otherwise.
     * @deprecated Use Utilities.File.exists instead.
     */
    public static async fileExists(path: string): Promise<boolean> {
        return Utilities.File.exists(path);
    }
    /**
     * Pauses execution for a specified duration.
     * @param ms - The number of milliseconds to sleep.
     * @returns A promise that resolves after the given time.
     * @deprecated Use Utilities.Time.sleep instead.
     */
    public static async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Encodes a string to base64url format.
     * @param data - The string to encode.
     * @returns The base64url-encoded string.
     * @deprecated Use Utilities.Encoding.base64UrlEncode instead.
     */
    public static base64UrlEncode(data: string): string {
        return Utilities.Encoding.base64UrlEncode(data);
    }
    /**
     * Decodes a base64url-encoded string.
     * @param data - The base64url-encoded string to decode.
     * @returns The decoded UTF-8 string.
     * @deprecated Use Utilities.Encoding.base64UrlDecode instead.
     */
    public static base64UrlDecode(data: string): string {
        return Utilities.Encoding.base64UrlDecode(data);
    }
}
export namespace Utilities {
    export import Path = _Path;
    export import Env = _Env;
    export import ConsoleUI = _ConsoleUI;
    export import DebugUI = _DebugUI;
    export import File = _File;
    export import Encoding = _Encoding;
    export namespace Types {
        type NumListAdd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        type strToNum<str extends string> = str extends `${infer num extends number}` ? num : never;

        export type Inc<Number extends number | string> = (
            `${Number}` extends `${infer surPlus}${NumListAdd[number]}`
            ? `${Number}` extends `${surPlus}${infer unit extends number}`
                ? unit extends Exclude<NumListAdd[number], 9>
                    ? strToNum<`${surPlus}${NumListAdd[unit]}`>
                    : strToNum<`${
                        surPlus extends `${infer Num extends number}` ? '' : '1'
                    }${
                        surPlus extends '' ? '' : Inc<surPlus>
                    }${NumListAdd[unit]}`>
                : number
            : number
        );

        export type UnionToIntersection<U extends object> = (
            (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
            ? I extends object
                ? { [K in keyof I]: I[K] extends object ? UnionToIntersection<I[K]> : I[K] }
                : I
            : never
        );

        export type undefinedToPartial<T extends object> = {
            [K in keyof T as undefined extends T[K] ? never : K]: T[K];
        } & {
            [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
        };

        export type Document = {
            [key: string]: any;
        };
    }
    export interface env {
        [key: string]: string;
    }
}
export default Utilities;