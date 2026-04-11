/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides utilities for file operations, such as checking if a file exists.
 * This is useful for performing asynchronous file checks in a way that integrates well with modern JavaScript practices.
 * @license Apache-2.0
 */
import { promises as FSP } from 'fs';

export class File {
    /**
     * Checks if a file exists asynchronously.
     * @param path - The path to the file.
     * @returns A promise that resolves to true if the file exists, false otherwise.
     */
    public static async exists(path: string): Promise<boolean> {
        return FSP.access(path).then(() => true).catch(() => false);
    }
}

export namespace File {}
export default File;