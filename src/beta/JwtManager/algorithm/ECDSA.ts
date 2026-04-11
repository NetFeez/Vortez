import { sign, verify, constants } from 'crypto';
import Algorithm from './Algorithm.js';

export class ECDSA extends Algorithm {
    public normalizeKey(key: Algorithm.Key | Algorithm.KeyOptions): Algorithm.KeyObject {
        let { key: priv, pub } = super.normalizeKey(key);
        if (pub) Algorithm.assertKeyType(pub, 'ec', 'Provided public key is not an EC key.');
        if (priv) {
            const keyObject = Algorithm.assertKeyType(priv, 'ec', 'Provided private key is not an EC key.');
            if (!pub) pub = keyObject.export({ type: 'spki', format: 'pem' });
        }
        return { key: priv, pub };
    }
    /**
     * Signs the given payload using the ECDSA algorithm and the provided key.
     * @param payload The payload to be signed.
     * @returns The ECDSA signature of the payload, encoded in base64.
     */
    public sign(payload: string): string {
        Algorithm.assertKey(this.key, 'No key provided for ECDSA signing');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const signature = sign(this.hashName, plBuffer, {
            key: this.key,
            dsaEncoding: 'ieee-p1363'
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
        Algorithm.assertKey(this.pub, 'No public key provided for ECDSA verification');

        const plBuffer = Buffer.from(payload, 'utf-8');
        const sigBuffer = Buffer.from(signature, 'base64url');
        return verify(this.hashName, plBuffer, {
            key: this.pub,
            dsaEncoding: 'ieee-p1363'
        }, sigBuffer);
    }
}
export default ECDSA;