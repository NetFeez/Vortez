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
import _Schema from './schema/Schema.js';
import _Flatten from './Flatten.js';
import _File from './File.js';
import _Object from './Object.js';
import _Encoding from './Encoding.js';
import _Time from './Time.js';
import _Events from './Events.js';

export { Path } from './Path.js';
export { Env } from './Env.js';
export { ConsoleUI } from './ConsoleUI.js';
export { DebugUI } from './DebugUI.js';
export { Schema } from './schema/Schema.js';
export { Flatten } from './Flatten.js';
export { File } from './File.js';
export { Object } from './Object.js';
export { Encoding } from './Encoding.js';
export { Time } from './Time.js';
export { Events } from './Events.js';
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
     * Checks if two values are deeply equal.
     * @param obj1 - The first value to compare.
     * @param obj2 - The second value to compare.
     * @returns A boolean indicating if the values are deeply equal.
     * @deprecated Use Utilities.Object.deepEqual instead.
     */
    public static deepEqual(obj1: any, obj2: any): boolean {
        return Utilities.Object.deepEqual(obj1, obj2);
    }
    /**
     * Flattens a nested object into a single-level object with dot-separated keys.
     * @param object - The object to flatten.
     * @param depth - The maximum depth to flatten (default is 10).
     * @returns A new object with flattened keys.
     * @deprecated Use Utilities.Flatten.object instead.
     */
    public static flattenObject<T extends object, D extends number = 10>(object: T, depth: D = 10 as D): Utilities.Flatten.Object<T, D> {
        return Utilities.Flatten.object(object as Utilities.Types.Document, depth) as Utilities.Flatten.Object<T, D>;
    }
    /**
     * Unflattens a flattened object back into its original nested structure.
     * @param obj - The flattened object to unflatten.
     * @returns A new object with the original nested structure.
     * @deprecated Use Utilities.Flatten.unObject instead.
     */
    public static unFlattenObject<Result extends any = any>(obj: any): Result {
        return Utilities.Flatten.unObject<Result>(obj as Utilities.Flatten.Document);
    }
    /**
     * Pauses execution for a specified duration.
     * @param ms - The number of milliseconds to sleep.
     * @returns A promise that resolves after the given time.
     * @deprecated Use Utilities.Time.sleep instead.
     */
    public static sleep(ms: number): Promise<void> {
        return Utilities.Time.sleep(ms);
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
    export import Schema = _Schema;
    export import Flatten = _Flatten;
    export import File = _File;
    export import Object = _Object;
    export import Encoding = _Encoding;
    export import Time = _Time;
    export import Events = _Events;
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
    export type FlattenObject<T extends Types.Document, depth extends number = 5> = Flatten.Object<T, depth>;
    export interface env {
        [key: string]: string;
    }
}
export default Utilities;