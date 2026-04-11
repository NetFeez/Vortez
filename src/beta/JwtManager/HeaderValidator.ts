import type Jwt from "./Jwt.js";

export class HeaderValidator {
    public static ALLOWED_ALGO_PREFIXES = ['HS', 'RS', 'PS', 'ES'];
    public static ALLOWED_ALGO_LENGTHS = [256, 384, 512];
    /**
     * Static method to validate the JWT header. It checks if the header is a non-null object and then calls specific validation methods for the algorithm, type, and expiration claims. If any of the validations fail, it throws an error indicating the issue with the header.
     * @param header The JWT header object to validate.
     * @throws Will throw an error if the header is not a non-null object or if any of the specific validations fail.
     */
    public static validate(header: any): asserts header is Jwt.Header {
        if (typeof header !== 'object' || header === null) throw new Error('Header must be a non-null object');
        this.validateAlgorithm(header);
        this.validateType(header);
    }
    /**
     * Static method to validate the `alg` (algorithm) property in the JWT header. It checks if the `alg` property is present, ensures that it follows the expected format (a prefix followed by a length), and verifies that the prefix and length are among the allowed values. If any of these conditions are not met, it throws an error indicating the issue with the `alg` property.
     * @param header The JWT header object to validate, which should contain the `alg` property.
     * @throws Will throw an error if the `alg` property is missing, does not follow the expected format, or has an unsupported prefix or length.
     */
    public static validateAlgorithm(header: any): void {
        if (!('alg' in header)) throw new Error('Header must contain "alg" property');
        const [ prefix, lengthStr ] = header.alg.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        if (!prefix || !lengthStr) throw new Error('Invalid "alg" format in header');
        const length = parseInt(lengthStr, 10);
        if (!HeaderValidator.ALLOWED_ALGO_PREFIXES.includes(prefix)) throw new Error(`Unsupported algorithm prefix: ${prefix}`);
        if (!HeaderValidator.ALLOWED_ALGO_LENGTHS.includes(length)) throw new Error(`Unsupported algorithm length: ${length}`);
    }
    /**
     * Static method to validate the `typ` (type) property in the JWT header. It checks if the `typ` property is present, ensures that it is a string, and verifies that its value is "jwt" (case-insensitive). If any of these conditions are not met, it throws an error indicating the issue with the `typ` property.
     * @param header The JWT header object to validate, which should contain the `typ` property.
     * @throws Will throw an error if the `typ` property is missing, is not a string, or does not equal "jwt" (case-insensitive).
     */
    public static validateType(header: any): void {
        if (!('typ' in header)) throw new Error('Header must contain "typ" property');
        if (typeof header.typ !== 'string') throw new Error('The "typ" property must be a string');
        if (header.typ.toLowerCase() !== 'jwt') throw new Error('The "typ" property must be "jwt"');
    }
}
export namespace HeaderValidator {}
export default HeaderValidator;