import type JwtManager from "./JwtManager.js";

import Algorithm from "./algorithm/Algorithm.js";
import RSAPSS from "./algorithm/RSAPSS.js";
import ECDSA from "./algorithm/ECDSA.js";
import HMAC from "./algorithm/HMAC.js";
import RSA from "./algorithm/RSA.js";

import JwtUtils from "./JwtUtils.js";

export class KIDEntry {
    protected static AlgorithmMap = { HS: HMAC, RS: RSA, ES: ECDSA, PS: RSAPSS };

    public readonly kid: string;
    public readonly signer: Algorithm;

    /**
     * Creates a new KIDEntry instance with the specified algorithm, key, and optional key ID (kid).
     * If the kid is not provided, it generates a random one based on the algorithm name and a random string.
     * The signer is created using the `createSigner` static method, which determines the appropriate signing algorithm based on the provided algorithm name and key.
     * @param alg The name of the signing algorithm (e.g., "HS256", "RS384", "ES512").
     * @param key The key or key options to be used for signing, which can be an instance of `Algorithm` or an object containing key options.
     * @param kid An optional key ID to uniquely identify the key. If not provided, a random one will be generated.
     */
    public constructor(
        public readonly alg: KIDEntry.AlgorithmName,
        key: KIDEntry.Signer, kid?: string,
    ) {
        this.kid = kid || `${alg}-${Math.random().toString(36).substring(2, 8)}`;
        this.signer = key instanceof Algorithm ? key : KIDEntry.createSigner(alg, key);
    }
    /**
     * Creates an instance of the appropriate signing algorithm based on the provided algorithm name and key.
     * It extracts the algorithm prefix and hash length from the algorithm name,
     * looks up the corresponding algorithm class in the `AlgorithmMap`,and returns a new instance of that class initialized
     * with the specified hash length and key.
     * @param alg The algorithm name (e.g., "HS256", "RS384", "ES512").
     * @param key The key or key options to be used for signing, which can be an instance of `Algorithm` or an object containing key options.
     * @returns An instance of the appropriate signing algorithm initialized with the specified hash length and key.
     */
    public static createSigner(alg: KIDEntry.AlgorithmName, key: Algorithm.Key | Algorithm.KeyOptions): Algorithm {
        const prefix = JwtUtils.getAlgPrefix(alg);
        const hashLength = JwtUtils.getHashLength(alg);

        const algorithm = this.AlgorithmMap[prefix];
        return new algorithm(hashLength, key);
    }
}
export namespace KIDEntry {
    export type AlgPrefix = 'HS' | 'RS' | 'ES' | 'PS';
    export type AlgorithmName = `${AlgPrefix}${JwtManager.Algorithm.HashLength}`;

    export type Signer = Algorithm | Algorithm.Key | Algorithm.KeyOptions;
    
    export interface KIDEntryOptions {
        key: Signer;
        kid?: string;
        algorithm: AlgorithmName;
    }
    export interface KIDEntry {
        kid: string;
        signer: Algorithm
        alg: AlgorithmName;
    }
}
export default KIDEntry;