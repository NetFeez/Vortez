/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides security utilities for handling file paths in `Vortez`.
 * @license Apache-2.0
 */
import FS from 'fs';
import PATH from 'path';

import Utilities from '../../utilities/Utilities.js';

export class PathSecurity {
	private static readonly maxRealPathCacheSize = 128;
	private static readonly realPathCache = new Map<string, string>();

	/**
	 * Resolves a path relative to a base path while preventing traversal outside the base.
	 * @param base - The base path.
	 * @param plus - The user-controlled relative path.
	 * @returns A safe absolute path or null if the path escapes the base.
	 */
	public static async resolveInsideBase(base: string, plus: string): Promise<string | null> {
		base = Utilities.Path.resolve(base);
		plus = Utilities.Path.normalize(plus);

		if (this.hasTraversalUnderflow(plus)) return null;

		const candidate = this.getCandidate(base, plus);

		if (!this.isPathInside(base, candidate)) return null;

		const [safeBase, safeCandidate] = await Promise.all([
			this.getSafeBase(base),
			this.tryReal(candidate).then(path => path ?? candidate),
		]);

		return this.isPathInside(safeBase, safeCandidate) ? safeCandidate : null;
	}
    /**
     * Checks if the given path contains directory traversal that would escape the base directory, by analyzing the path segments for '..' components that would underflow the directory structure.
     * @param path - The path to check for traversal underflow.
     * @returns True if the path contains traversal that escapes the base, false otherwise.
     */
	private static hasTraversalUnderflow(path: string): boolean {
		const parts = path.split(/[\\/]+/);
		let depth = 0;

		for (const part of parts) {
			if (!part || part === '.') continue;
			if (part === '..') {
				if (depth === 0) return true;
				depth -= 1;
				continue;
			} depth += 1;
		} return false;
	}
    /**
     * Checks if a candidate path is located within a base path, preventing directory traversal attacks.
     * @param basePath - The base path to check against.
     * @param candidatePath - The candidate path to verify.
     * @returns True if the candidate path is inside the base path, false otherwise.
     */
	private static isPathInside(basePath: string, candidatePath: string): boolean {
		const relativePath = PATH.relative(basePath, candidatePath);
		return relativePath === '' || (!relativePath.startsWith('..') && !PATH.isAbsolute(relativePath));
	}
	/**
	 * Generates a candidate path by joining a base path with a user-controlled relative path, ensuring that the relative path does not start with slashes to prevent bypassing the base directory.
	 * @param base - The base path.
	 * @param plus - The user-controlled relative path.
	 * @returns The generated candidate path.
	 * @remarks This method does not perform any security checks and should be used in conjunction with `resolveInsideBase` to ensure safety.
	 */
	private static getCandidate(base: string, plus: string): string {
		plus = plus.replace(/^[\\/]+/, '');
		const candidate = Utilities.Path.join(base, plus);
		return Utilities.Path.resolve(candidate);
	}
    /**
     * Retrieves a safe real path for the given base path, using caching to optimize performance while preventing cache overflow.
     * @param basePath - The base path for which to retrieve the real path.
     * @returns The real path corresponding to the base path, or the original base path if resolution fails.
     */
	private static async getSafeBase(basePath: string): Promise<string> {
		const cached = this.realPathCache.get(basePath);
		if (cached) return cached;

		const resolved = await this.tryReal(basePath) ?? basePath;
		if (this.realPathCache.size >= this.maxRealPathCacheSize) {
			const firstKey = this.realPathCache.keys().next().value;
			if (typeof firstKey === 'string') this.realPathCache.delete(firstKey);
		}
		this.realPathCache.set(basePath, resolved);
		return resolved;
	}
    /**
     * Attempts to resolve the real path of a given path, returning null if it fails (e.g., if the path does not exist).
     * @param path - The path to resolve.
     * @returns The real path as a string, or null if resolution fails.
     */
	private static async tryReal(path: string): Promise<string | null> {
		try { return await FS.promises.realpath(path); }
		catch { return null; }
	}
}

export default PathSecurity;