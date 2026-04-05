import RSA from "./algorithm/RSA.js";
import HMAC from "./algorithm/HMAC.js";
import ECDSA from "./algorithm/ECDSA.js";
import RSAPSS from "./algorithm/RSAPSS.js";

import HeaderValidator from "./HeaderValidator.js";

import _KeyGenerator from "./KeyGenerator.js";
import _JwtUtils from "./JwtUtils.js";
import _Algorithm from "./algorithm/Algorithm.js";
import _Jwt from "./Jwt.js";

export { KeyGenerator } from "./KeyGenerator.js";
export { Algorithm } from "./algorithm/Algorithm.js";
export { JwtUtils } from "./JwtUtils.js";
export { Jwt } from "./Jwt.js";

export const AlgorithmMap = {
    HS: HMAC,
    RS: RSA,
    PS: RSAPSS,
    ES: ECDSA
};

export class JwtManager {
    protected readonly algorithm: JwtManager.Algorithm;
    public constructor(
        public readonly algorithmName: JwtManager.AlgorithmName,
        key: JwtManager.Algorithm.Key | JwtManager.Algorithm.KeyOptions
    ) { this.algorithm = JwtManager.getAlgorithm(algorithmName, key); }
    /**
     * Signs the given payload with the specified header using the configured algorithm and key.
     * @param payload The payload to be signed, represented as a JavaScript object.
     * @param header The header to be included in the JWT, represented as a JavaScript object. The `alg` property will be automatically set based on the manager's algorithm.
     * @returns The complete JWT as a string, consisting of the base64url-encoded header, payload, and signature.
     */
    public sign(payload: JwtManager.Jwt.Payload, header: Partial<JwtManager.Jwt.Header> = {}): string {
        header = { ...header, alg: this.algorithmName };
        
        const encodedHeader = JwtManager.JwtUtils.objectToBase64Url(header);
        const encodedPayload = JwtManager.JwtUtils.objectToBase64Url(payload);

        const content = `${encodedHeader}.${encodedPayload}`;
        const signature = this.algorithm.sign(content);

        return `${content}.${signature}`;
    }
    public parse(token: string): JwtManager.Jwt {
        const parts = token.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT format');

        const [ encodedHeader, encodedPayload, signature ] = parts;

        const verified = this.algorithm.verify(`${encodedHeader}.${encodedPayload}`, signature);
        if (!verified) throw new Error('Invalid JWT signature');
    
        const header = JwtManager.JwtUtils.base64UrlToObject<JwtManager.Jwt.Header>(encodedHeader);
        HeaderValidator.validate(header);

        const payload = JwtManager.JwtUtils.base64UrlToObject<JwtManager.Jwt.Payload>(encodedPayload);
        return new JwtManager.Jwt(header, payload, signature, this);
    }

    toJSON(): object { return { algorithm: this.algorithmName }; }
    toString(): string { return `Jwt manager with algorithm ${this.algorithmName}`; }

    /**
     * Determines the appropriate algorithm class based on the provided options and creates an instance of it.
     * @param algorithm The name of the algorithm to be used for signing and verifying JWTs (e.g., "HS256", "RS384", "ES512").
     * @param key The secret key or private key to be used for signing and verifying JWTs.
     * @returns An instance of the corresponding Algorithm subclass.
     */
    protected static getAlgorithm(algorithm: JwtManager.AlgorithmName, key: JwtManager.Algorithm.Key | JwtManager.Algorithm.KeyOptions): JwtManager.Algorithm {
        const prefix = JwtManager.JwtUtils.getAlgPrefix(algorithm);
        const hashLength = JwtManager.JwtUtils.getHashLength(algorithm);

        const alg = AlgorithmMap[prefix];
        return new alg(hashLength, key);
    }
}
export namespace JwtManager {
    export import Algorithm = _Algorithm;
    export import KeyGenerator = _KeyGenerator;
    export import JwtUtils = _JwtUtils;
    export import Jwt = _Jwt;

    export type AlgPrefix = 'HS' | 'RS' | 'ES' | 'PS';
    export type AlgorithmName = `${AlgPrefix}${JwtManager.Algorithm.HashLength}`;
}
export default JwtManager;