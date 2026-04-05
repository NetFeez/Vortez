import type Algorithm from "./algorithm/Algorithm.js";
import type JwtManager from "./JwtManager.js";

export class JwtUtils {
    /**
     * Returns the current time in seconds since the Unix epoch. This is commonly used for setting the `iat` (issued at) and `exp` (expiration) claims in JWTs.
     * @returns The current time in seconds since January 1, 1970 (Unix epoch).
     */
    public static nowInSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }
    /**
     * Converts a JavaScript object to a base64url-encoded string.
     * @param obj The object to be converted.
     * @returns The base64url-encoded string representation of the object.
     */
    public static objectToBase64Url(obj: object): string {
        const jsonString = JSON.stringify(obj);
        const buffer = Buffer.from(jsonString, 'utf-8');
        return buffer.toString('base64url');
    }
    /**
     * Converts a base64url-encoded string back to a JavaScript object.
     * @param base64Url The base64url-encoded string to be converted.
     * @returns The JavaScript object represented by the base64url string.
     */
    public static base64UrlToObject<T>(base64Url: string): T {
        const buffer = Buffer.from(base64Url, 'base64url');
        const jsonString = buffer.toString('utf-8');
        return JSON.parse(jsonString) as T;
    }
    /**
     * Extracts the algorithm prefix from the given algorithm name and validates it.
     * @param alg The algorithm name (e.g., "HS256", "RS384", "ES512").
     * @returns The algorithm prefix (e.g., "HS", "RS", "ES", "PS").
     * @throws An error if the algorithm is unsupported.
     */
    public static getAlgPrefix(alg: JwtManager.AlgorithmName): JwtManager.AlgPrefix {
        const prefix = alg.slice(0, 2);
        if (!['HS', 'RS', 'ES', 'PS'].includes(prefix)) {
            throw new Error(`Unsupported algorithm: ${alg}`);
        }
        return prefix as JwtManager.AlgPrefix;
    }
    /**
     * Extracts the hash length from the given algorithm name and validates it.
     * @param alg The algorithm name (e.g., "HS256", "RS384", "ES512").
     * @returns The hash length as a string ("256", "384", or "512").
     * @throws An error if the algorithm is unsupported or if the hash length is invalid.
     */
    public static getHashLength(alg: JwtManager.AlgorithmName): Algorithm.HashLength {
        const hashLength = alg.slice(2);
        if (!['256', '384', '512'].includes(hashLength)) {
            throw new Error(`Unsupported algorithm: ${alg}`);
        }
        return hashLength as Algorithm.HashLength;
    }
}
export namespace JwtUtils {}
export default JwtUtils;