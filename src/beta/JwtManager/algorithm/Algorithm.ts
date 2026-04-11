import { createPublicKey, AsymmetricKeyType, KeyObject } from 'crypto';

export abstract class Algorithm {
    /** The private key used for signing and verification. */
    protected readonly key: Algorithm.Key | null;
    /** The public key used for verification. */
    protected readonly pub: Algorithm.Key | null;
    public readonly role: Algorithm.Role;
    public constructor(
        protected readonly hashLength: Algorithm.HashLength,
        secret: Algorithm.Key | Algorithm.KeyOptions,
    ) {
        const { key, pub } = this.normalizeKey(secret);
        if (!pub && !key) throw new Error('At least one of "key" or "pub" must be provided.');
        this.role = pub && !key ? 'verifier' : 'signer';
        this.key = key;
        this.pub = pub;
        Object.defineProperty(this, 'key', { enumerable: false });
        Object.defineProperty(this, 'pub', { enumerable: false });
    }
    protected normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        return Algorithm.normalizeKey(key);
    }
    /** Gets the name of the hash algorithm based on the specified hash length. */
    public get hashName(): Algorithm.ShaName { return `SHA-${this.hashLength}`; }
    /**
     * Signs the given payload using the specific algorithm and the provided key.
     * @param payload The payload to be signed.
     * @returns The signature of the payload, encoded in base64.
     */
    abstract sign(payload: string): string;
    /**
     * Verifies that the provided signature matches the expected signature for the given payload.
     * @param payload The payload whose signature is to be verified.
     * @param signature The signature to be verified, encoded in base64.
     * @returns `true` if the signature is valid; otherwise, `false`.
     */
    abstract verify(payload: string, signature: string): boolean;
    
    public toJSON(): object { return {}; }
    public toString(): string { return `Algorithm hash with "${this.hashName }" with role "${this.role}"`; }

    /**
     * Normalizes the provided key input into a consistent format, ensuring that both the private and public keys are available as Buffers.
     * @param key The key input, which can be either a string, a Buffer, or an object containing "key" and/or "pub" properties.
     * @returns An object containing the normalized private key ("key") and public key ("pub") as Buffers. If only one key is provided, it will be used for both.
     */
    public static normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        if (typeof key === 'string') return { key, pub: null };

        const priv = key.key || null;
        const pub  = key.pub || null;
        if (!pub && !priv) throw new Error('At least one of "key" or "pub" must be provided.');
        return { key: priv, pub };
    }
    /**
     * Converts a key, which can be either a string or a Buffer, into a Buffer format.
     * @param key The key to be converted, which can be a string or a Buffer.
     * @returns The key in Buffer format.
     */
    public static keyToBuffer(key: Algorithm.Key): Buffer {
        return Buffer.isBuffer(key) ? key : Buffer.from(key);
    }
    /**
     * Asserts that the provided key is a valid Buffer. If the key is not valid, an error is thrown with the specified message.
     * @param key The key to be validated, which can be of any type.
     * @param message The error message to be thrown if the key is not a valid Buffer.
     * @throws Will throw an error if the key is not provided or if it is not a Buffer.
     */
    public static assertKey(key: any, message: string): asserts key is Buffer {
        if (!key) throw new Error(message);
        if (typeof key !== 'string') throw new Error(message);
    }
    /**
     * Asserts that the provided key is of the expected asymmetric key type (e.g., "rsa", "ec").
     * If the key is not of the expected type, an error is thrown with the specified message.
     * @param key The key to be validated, which should be a Buffer containing the key data.
     * @param expected The expected asymmetric key type (e.g., "rsa", "ec").
     * @param message The error message to be thrown if the key is not of the expected type.
     * @throws Will throw an error if the key is not a valid asymmetric key of the expected type.
     */
    public static assertKeyType(key: Algorithm.Key, expected: AsymmetricKeyType, message: string): KeyObject {
        try {
            const KeyObject = createPublicKey(key);
            if (KeyObject.asymmetricKeyType !== expected) throw new Error();
            return KeyObject;
        } catch { throw new Error(message); }
    }
}
export namespace Algorithm {
    export type Role = 'signer' | 'verifier';
    export type HashLength = '256' | '384' | '512';
    export type ShaName = `SHA-${HashLength}`;
    export type Key = string;
    export interface KeyObject {
        key: Key | null;
        pub: Key | null;
    }
    export type KeyOptions = Partial<KeyObject>
}
export default Algorithm;