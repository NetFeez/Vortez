import { sign, verify, constants } from 'crypto';
import Algorithm from './Algorithm.js';

export class RSAPSS extends Algorithm {
    /**
     * Normalizes the provided key for RSA-PSS operations.
     * This method ensures that the provided keys are valid RSA-PSS keys and extracts the public key from the private key if only the private key is provided.
     * @param key The key to be normalized, which can be either a private key, a public key, or an object containing both.
     * @returns An object containing the normalized private key ("key") and public key ("pub") as Buffers. If only the private key is provided, the corresponding public key will be extracted and included in the result.
     */
    protected normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        // For RSA-PSS, the same key pair is used as for RSA, so we can reuse the normalization logic from the RSA algorithm. more info in file KeyGenerator.ts (method RSAPSS)
        let { key: priv, pub } = super.normalizeKey(key);
        if (pub) Algorithm.assertKeyType(pub, /* 'rsa-pss' */ 'rsa', 'Provided public key is not an RSA-PSS key.');
        if (priv) {
            const keyObject = Algorithm.assertKeyType(priv, /* 'rsa-pss' */ 'rsa', 'Provided private key is not an RSA-PSS key.');
            if (!pub) pub = keyObject.export({ type: 'spki', format: 'pem' });
        }
        return { key: priv, pub };
    }
    /**
     * Signs the given payload using the RSA-PSS algorithm and the provided key.
     * @param payload The payload to be signed.
     * @returns The RSA-PSS signature of the payload, encoded in base64.
     */
    public sign(payload: string): string {
        Algorithm.assertKey(this.key, 'No key provided for RSA-PSS signing');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const signature = sign(this.hashName, plBuffer, {
            key: this.key,
            padding: constants.RSA_PKCS1_PSS_PADDING,
            saltLength: constants.RSA_PSS_SALTLEN_DIGEST
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
        Algorithm.assertKey(this.pub, 'No public key provided for RSA-PSS verification');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const sigBuffer = Buffer.from(signature, 'base64url');
        return verify(this.hashName, plBuffer, {
            key: this.pub,
            padding: constants.RSA_PKCS1_PSS_PADDING,
            saltLength: constants.RSA_PSS_SALTLEN_DIGEST
        }, sigBuffer);
    }
}
export default RSAPSS;