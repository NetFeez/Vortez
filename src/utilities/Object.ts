/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides utilities for deep object comparison and manipulation, such as checking for deep equality between objects. This is useful for comparing complex data structures in a way that goes beyond simple reference checks.
 * @license Apache-2.0
 */
export class Object {
    /**
     * Compares two objects recursively for deep equality.
     * @param obj1 - The first object to compare.
     * @param obj2 - The second object to compare.
     * @returns true if the objects are deeply equal, false otherwise.
     */
    public static deepEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;
        if (
            typeof obj1 !== typeof obj2 ||
            obj1 === null || obj2 === null
        ) return false;

        const isArray1 = Array.isArray(obj1);
        const isArray2 = Array.isArray(obj2);

        if (isArray1 || isArray2) {
            if (!isArray1 || !isArray2) return false;
            if (obj1.length !== obj2.length) return false;

            for (let i = 0; i < obj1.length; i++) {
                const hasIndex1 = i in obj1;
                const hasIndex2 = i in obj2;

                if (hasIndex1 !== hasIndex2) return false;
                if (hasIndex1 && !this.deepEqual(obj1[i], obj2[i])) return false;
            }

            return true;
        }
        const keys1 = globalThis.Object.keys(obj1);
        const keys2 = globalThis.Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) if (
            !keys2.includes(key) ||
            !this.deepEqual(obj1[key], obj2[key])
        ) return false;
        return true;
    }
}

export namespace Object {}
export default Object;