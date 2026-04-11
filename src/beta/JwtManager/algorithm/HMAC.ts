import { createHmac } from 'crypto';

import Algorithm from './Algorithm.js';

export class HMAC extends Algorithm {
    /**
     * Normalizes the provided key for HMAC operations.
     * Since HMAC uses a single secret key for both signing and verification, this method ensures that the same key is used for both operations.
     * @param key The key to be normalized, which can be either a secret key or an object containing key options.
     * @returns An object containing the normalized key for both signing and verification.
     */
    protected normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        const { key: priv, pub } = super.normalizeKey(key);
        const secret = priv || pub;
        return { key: secret, pub: secret };
    }
    /**
     * Signs the given payload using the HMAC algorithm and the provided key.
     * @param payload The payload to be signed.
     * @returns The HMAC signature of the payload, encoded in base64.
     */
    public sign(payload: string): string {
        Algorithm.assertKey(this.key, 'No key provided for HMAC signing');

        const hmac = createHmac(this.hashName, this.key);
        hmac.update(payload);
        return hmac.digest('base64url');
    }
    /**
     * Verifies that the provided signature matches the expected signature for the given payload.
     * @param payload The payload whose signature is to be verified.
     * @param signature The signature to be verified, encoded in base64.
     * @returns `true` if the signature is valid; otherwise, `false`.
     */
    public verify(payload: string, signature: string): boolean {
        const expectedSignature = this.sign(payload);
        return expectedSignature === signature;
    }
}
export default HMAC;