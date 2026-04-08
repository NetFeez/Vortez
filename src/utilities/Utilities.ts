/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description add useful functions to the Vortez. 
 * @license Apache-2.0
 */

import { promises as FSP } from "fs";

import _Path from './Path.js';
import _Env from './Env.js';
import _ConsoleUI from './ConsoleUI.js';
import _DebugUI from './DebugUI.js';
import _Schema from './schema/Schema.js';
import _Flatten from './Flatten.js';

export { Path } from './Path.js';
export { Env } from './Env.js';
export { ConsoleUI } from './ConsoleUI.js';
export { DebugUI } from './DebugUI.js';
export { Schema } from './schema/Schema.js';
export { Flatten } from './Flatten.js';

export class Utilities {
    /**
     * Checks if a file exists asynchronously.
     * @param path - The path to the file.
     * @returns A promise that resolves to `true` if the file exists, `false` otherwise.
     */
    public static async fileExists(path: string): Promise<boolean> {
        return FSP.access(path).then(() => true).catch(() => false);
    }
    /**
     * Compares two objects recursively for deep equality.
     * @param obj1 - The first object to compare.
     * @param obj2 - The second object to compare.
     * @returns A boolean indicating whether the objects are deeply equal or not.
     */
    public static deepEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;
        if (
            typeof obj1 !== typeof obj2 ||
            obj1 === null || obj2 === null
        ) return false;
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) if (
            !keys2.includes(key) ||
            !this.deepEqual(obj1[key], obj2[key])
        ) return false;
        return true;
    }
    /**
     * Flattens a nested object into a single-level object with dot notation keys.
     * @param object - The object to flatten.
     * @param depth - The maximum depth to which the object should be flattened.
     * @returns The flattened object.
     */
    public static flattenObject<T extends object, D extends number = 10>(object: T, depth: D = 10 as D): Utilities.Flatten.Object<T, D> {
        return Utilities.Flatten.object(object as Utilities.Types.Document, depth) as Utilities.Flatten.Object<T, D>;
    }
    /**
     * Reconstructs a nested object from a flattened object with dot notation keys.
     * @template Result - The type of the unflattened object.
     * @param obj - The flattened object to un flatten.
     * @returns The unflattened object.
     */
    public static unFlattenObject<Result extends any = any>(obj: any): Result {
        return Utilities.Flatten.unObject<Result>(obj as Utilities.Flatten.Document);
    }
    /**
     * Pauses the execution of the program for a specified duration.
     * @param ms - The number of milliseconds to sleep.
     * @returns A promise that resolves after the given time.
     */
    public static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Encodes a string to base64url format.
     * @param data - The string that needs to be encoded.
     * @returns The base64url-encoded string.
     */
    public static base64UrlEncode(data: string): string {
        return Buffer.from(data).toString('base64url');
    }
    /**
     * Decodes a base64url-encoded string.
     * @param data - The base64url-encoded string that needs to be decoded.
     * @returns The decoded string.
     */
    public static base64UrlDecode(data: string): string {
        return Buffer.from(data, 'base64url').toString('utf8');
    }
}

export namespace Utilities {
    export import Path = _Path;
    export import Env = _Env;
    export import ConsoleUI = _ConsoleUI;
    export import DebugUI = _DebugUI;
    export import Schema = _Schema;
    export import Flatten = _Flatten;

    export namespace Types {
        type NumListAdd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        type strToNum<str extends string> = str extends `${infer num extends number}` ? num : never;

        /**
         * Adds one to a number type.
         * @template Number the number to add one to.
         * @returns The number incremented by one.
         */
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

        /**
         * Converts a union of object types into an intersection type.
         * @template U the union to convert.
         * @returns The intersection type of the given union.
        */
        export type UnionToIntersection<U extends object> = (
            (U extends any ? (arg: U) => void : never) extends (arg: infer I) => void
            ? I extends object
                ? { [K in keyof I]: I[K] extends object ? UnionToIntersection<I[K]> : I[K] }
                : I
            : never
        );

        /**
         * Converts properties with `undefined` in an object type to optional properties.
         * @template T the object to convert.
         * @returns The object type with properties containing `undefined` marked as optional.
         */
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