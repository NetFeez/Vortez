import PATH from 'path';
import URL from 'url';

export class Path {
    // Vortez internal directory (where the source code is located)
    public static readonly moduleDir: string = PATH.dirname(PATH.dirname(PATH.dirname(URL.fileURLToPath(import.meta.url))));
    // User project directory (where the user is running the server from)
    public static readonly rootDir: string = process.cwd();

    /**
     * Normalizes a path, resolving '..' and '.' segments and removing redundant slashes.
     * @param path - The path to normalize.
     * @return The normalized path.
     */
    public static normalize(path: string): string {
        path = path.replace(/(?:\/|\\)+/g, PATH.sep);
        return PATH.normalize(path);
    }
    /**
     * Resolves an absolute path from the root of the user project.
     * @param paths - The path to resolve.
     * @return The resolved path.
     */
    public static root(...paths: string[]): string {
        paths = paths.map(path => this.normalize(path));
        return PATH.join(this.rootDir, ...paths);
    }
    /**
     * Resolves an absolute path from the root of Vortez (internal).
     * @param paths - The path to resolve.
     * @return The resolved path.
     */
    public static module(...paths: string[]): string {
        paths = paths.map(path => this.normalize(path));
        return PATH.join(this.moduleDir, ...paths);
    }
    /**
     * Returns the directory name of a path, similar to `PATH.dirname`, but ensures the path is normalized first.
     * @param path - The path to get the directory name of.
     * @return The directory name of the path.
     */
    public static dirname(path: string): string {
        path = this.normalize(path);
        return PATH.dirname(path);
    }
    /**
     * Joins multiple path segments into a single path, ensuring that the result is normalized.
     * @param paths - The path segments to join.
     * @return The joined path.
     */
    public static join(...paths: string[]): string {
        paths = paths.map(path => this.normalize(path));
        return PATH.join(...paths);
    }
    /**
     * Resolves an absolute path from the root of the user project.
     * @param paths - The path to resolve.
     * @return The resolved path.
     */
    public static resolve(...paths: string[]): string {
        paths = paths.map(path => this.normalize(path));
        return PATH.resolve(...paths);
    }
}
export namespace Path {}
export default Path;