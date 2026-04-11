/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides utilities for encoding and decoding data, such as base64url encoding.
 * This is useful for handling data transformations that are commonly needed in web applications, such as encoding data for transmission or storage.
 * @license Apache-2.0
 */
export class Encoding {
    /**
     * Encodes a string to base64url format.
     * @param data - The string to encode.
     * @returns The base64url-encoded string.
     */
    public static base64UrlEncode(data: string): string {
        return Buffer.from(data).toString('base64url');
    }
    /**
     * Decodes a base64url-encoded string.
     * @param data - The base64url-encoded string to decode.
     * @returns The decoded UTF-8 string.
     */
    public static base64UrlDecode(data: string): string {
        return Buffer.from(data, 'base64url').toString('utf8');
    }
}

export namespace Encoding {}
export default Encoding;