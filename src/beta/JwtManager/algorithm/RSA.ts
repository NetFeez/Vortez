import { createPrivateKey, createPublicKey } from 'crypto';

import { sign, verify, constants } from 'crypto';
import Algorithm from './Algorithm.js';

export class RSA extends Algorithm {
    /**
     * Normalizes the provided key for RSA operations.
     * This method ensures that the provided keys are valid RSA keys and extracts the public key from the private key if only the private key is provided.
     * @param key The key to be normalized, which can be either a private key, a public key, or an object containing both.
     * @returns An object containing the normalized private key ("key") and public key ("pub") as Buffers. If only the private key is provided, the corresponding public key will be extracted and included in the result.
     */
    protected normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        let { key: priv, pub } = super.normalizeKey(key);
        if (pub) Algorithm.assertKeyType(pub, 'rsa', 'Provided public key is not an RSA key.');
        if (priv) {
            const keyObject = Algorithm.assertKeyType(priv, 'rsa', 'Provided private key is not an RSA key.');
            if (!pub) pub = keyObject.export({ type: 'spki', format: 'pem' });
        }
        return { key: priv, pub };
    }
    /**
     * Signs the given payload using the RSA algorithm and the provided key.
     * @param payload The payload to be signed.
     * @returns The RSA signature of the payload, encoded in base64.
     */
    public sign(payload: string): string {
        Algorithm.assertKey(this.key, 'No key provided for RSA signing');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const signature = sign(this.hashName, plBuffer, {
            key: this.key,
            padding: constants.RSA_PKCS1_PADDING
        });
        return signature.toString('base64url');
    }
    /**
     * Verifies that the provided signature matches the expected signature for the given payload.
     * @param payload The payload whose signature is to be verified.
     * @param signature The signature to be verified, encoded in base64.
     * @returns `true` if the signature is valid; otherwise, `false`.
     */
    public verify(payload: string, signature: string): boolean {
        Algorithm.assertKey(this.pub, 'No public key provided for RSA verification');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const sigBuffer = Buffer.from(signature, 'base64url');
        return verify(this.hashName, plBuffer, {
            key: this.pub,
            padding: constants.RSA_PKCS1_PADDING
        }, sigBuffer);
    }
}
export default RSA;