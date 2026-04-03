import { generateKeyPairSync, randomBytes } from "crypto";
import type Algorithm from "./algorithm/Algorithm.js";

export class KeyGenerator {
    /**
     * Generates a key or key pair based on the specified type and options. The generated key(s) can be used for signing and verifying JWTs with various algorithms.
     * @param type The type of key to generate. Supported types include:
     * - 'secret': Generates a random secret key for HMAC algorithms (e.g., HS256). The key is a base64url-encoded string.
     * - 'rsa': Generates an RSA key pair for RSASSA-PKCS1-v1_5 algorithms (e.g., RS256). The keys are returned in PEM format.
     * - 'rsa-pss': Generates an RSA key pair for RSASSA-PSS algorithms (e.g., PS256). The keys are returned in PEM format.
     * - 'ec': Generates an Elliptic Curve (EC) key pair for ECDSA algorithms (e.g., ES256). The keys are returned in PEM format.
     * @param options Optional parameters for key generation, such as modulus length for RSA keys or named curve for EC keys.
     * @returns An object containing the generated private key ("key
     */
    public static generate(type: KeyGenerator.Type, options: KeyGenerator.Options = {}): KeyGenerator.KeyObject {
        let privateKey: Algorithm.Key;
        let publicKey: Algorithm.Key;
        
        switch(type) {
            case 'secret': {
                const secret = randomBytes(options.modulusLength || 32).toString('base64url');
                privateKey = publicKey = secret; break;
            }
            case 'rsa': {
                const { key, pub } = KeyGenerator.RSA(options.modulusLength);
                privateKey = key; publicKey = pub; break;
            }
            case 'rsa-pss': {
                const { key, pub } = KeyGenerator.RSAPSS(options.modulusLength);
                privateKey = key; publicKey = pub; break;
            }
            case 'ec': {
                const { key, pub } = KeyGenerator.EC(options.namedCurve);
                privateKey = key; publicKey = pub; break;
            }
            default: throw new Error(`Unsupported key type: ${type}`);
        }
        return { key: privateKey, pub: publicKey };
    }
    /**
     * Generates an RSA key pair with the specified modulus length.
     * If no modulus length is provided, it defaults to 2048 bits.
     * @param modulusLength The length of the RSA modulus in bits (e.g., 2048, 4096). Defaults to 2048 if not specified.
     * @returns An object containing the generated private key ("key") and public key ("pub") as strings, both in PEM format.
     */
    protected static RSA(modulusLength: number = 2048): KeyGenerator.KeyObject {
        const { privateKey, publicKey } = generateKeyPairSync('rsa', {
            modulusLength: modulusLength,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        return { key: privateKey, pub: publicKey };
    }
    /**
     * Generates an RSA-PSS key pair with the specified modulus length.
     * If no modulus length is provided, it defaults to 2048 bits.
     * @param modulusLength The length of the RSA modulus in bits (e.g., 2048, 4096). Defaults to 2048 if not specified.
     * @returns An object containing the generated private key ("key") and public key ("pub") as strings, both in PEM format.
     */
    protected static RSAPSS(modulusLength: number = 2048): KeyGenerator.KeyObject {
        return this.RSA(modulusLength);
        // Standard jwt libraries typically use the same RSA key pair for both RSASSA-PKCS1-v1_5 and RSASSA-PSS algorithms, as the key generation process is the same for both.
        // The difference lies in how the signature is created and verified, not in the key itself.
        // Therefore, we can reuse the RSA key generation method for RSAPSS as well.
        const { privateKey, publicKey } = generateKeyPairSync('rsa-pss', {
            modulusLength: modulusLength,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { key: privateKey, pub: publicKey };
    }
    /**
     * Generates an Elliptic Curve (EC) key pair using the specified named curve.
     * If no named curve is provided, it defaults to 'P-256'.
     * @param namedCurve The name of the elliptic curve to use (e.g., 'P-256', 'P-384', 'P-521'). Defaults to 'P-256' if not specified.
     * @returns An object containing the generated private key ("key") and public key ("pub") as strings, both in PEM format.
     */
    protected static EC(namedCurve: string = 'P-256'): KeyGenerator.KeyObject {
        const { privateKey, publicKey } = generateKeyPairSync('ec', {
            namedCurve: namedCurve,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        return { key: privateKey, pub: publicKey };
    }
}
export namespace KeyGenerator {
    export type Type = 'secret' | 'rsa' | 'rsa-pss' | 'ec';
    export interface KeyObject {
        key: Algorithm.Key;
        pub: Algorithm.Key;
    }
    export interface Options {
        namedCurve?: string
        modulusLength?: number;
    }
}
export default KeyGenerator;