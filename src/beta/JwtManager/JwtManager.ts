
import _KeyGenerator from "./KeyGenerator.js";
import _Algorithm from "./algorithm/Algorithm.js";
import _JwtUtils from "./JwtUtils.js";
import _KeyEntry from "./KeyEntry.js";
import _Jwt from "./Jwt.js";

export { KeyGenerator } from "./KeyGenerator.js";
export { Algorithm } from "./algorithm/Algorithm.js";
export { JwtUtils } from "./JwtUtils.js";
export { KeyEntry as KIDEntry } from "./KeyEntry.js";
export { Jwt } from "./Jwt.js";

export class JwtManager {    
    protected KIDMap: JwtManager.KIDMap = {};
    protected defaultEntry: JwtManager.KeyEntry;

    public constructor(
        entry: JwtManager.KeyOption,
        ...entries: JwtManager.KeyOption[]
    ) {
        this.defaultEntry = JwtManager.normalizeEntry(entry);
        entries = [this.defaultEntry, ...entries];
        for (const e of entries) { this.addKey(e); }
    }
    /**
     * Adds a new key entry to the manager's KID map.
     * The provided entry can be either an instance of `KIDEntry` or an object containing the necessary properties to create a new `KIDEntry`.
     * The method normalizes the entry using the `normalizeEntry` static method and then adds it to the KID map using the entry's `kid` property as the key.
     * @param entry The key entry to be added, which can be either an instance of `KIDEntry` or an object containing the properties needed to create a new `KIDEntry`.
     */
    public addKey(entry: JwtManager.KeyOption): void {
        const kidEntry = JwtManager.normalizeEntry(entry);
        this.KIDMap[kidEntry.kid] = kidEntry;
    }
    /**
     * Removes the key associated with the specified key ID (kid) from the manager's KID map.
     * If the specified kid does not exist in the map, this method does nothing.
     * @param kid The key ID of the key to be removed from the manager's KID map.
     */
    public delKey(kid: string): void { delete this.KIDMap[kid]; }
    /**
     * Signs the given payload with the specified header using the configured algorithm and key.
     * @param payload The payload to be signed, represented as a JavaScript object.
     * @param header The header to be included in the JWT, represented as a JavaScript object.
     *   - The `alg` property will be automatically set based on the manager's algorithm.
     * @returns The complete JWT as a string, consisting of the base64url-encoded header, payload, and signature.
     */
    public sign(payload: JwtManager.Jwt.Payload, header: Partial<JwtManager.Jwt.Header> = {}): string {
        const kid = header.kid || this.defaultEntry.kid;
        const entry = this.KIDMap[kid];
        if (!entry) throw new Error(`No key found for kid: ${kid}`);

        const { signer, alg } = entry;

        header = { ...header, alg, kid, typ: 'jwt' };
        
        const encodedHeader = JwtManager.JwtUtils.objectToBase64Url(header);
        const encodedPayload = JwtManager.JwtUtils.objectToBase64Url(payload);
        const content = `${encodedHeader}.${encodedPayload}`;
        
        const signature = signer.sign(content);

        return `${content}.${signature}`;
    }
    public parse(token: string): JwtManager.Jwt {
        const {
            header, payload, signature,
            encodedHeader, encodedPayload
        } = JwtManager.JwtUtils.getJwtParts(token);

        const kid = header.kid || this.defaultEntry.kid;
        const entry = this.KIDMap[kid];
        if (!entry) throw new Error(`No key found for kid: ${kid}`);

        const signer = entry.signer;
        const content = `${encodedHeader}.${encodedPayload}`;
        if (!signer.verify(content, signature)) throw new Error('Invalid signature'); 

        const jwt = new JwtManager.Jwt(header, payload, signature, signer);
        if (jwt.expired) throw new Error('Token has expired');

        return jwt; 
    }

    // toJSON(): object { return { algorithm: this.algorithmName }; }
    // toString(): string { return `Jwt manager with algorithm ${this.algorithmName}`; }

    /**
     * Normalizes a given key entry option into a `KIDEntry` instance. If the provided entry is already an instance of `KIDEntry`, it is returned as-is.
     * If the entry is provided as an object containing the necessary properties to create a new `KIDEntry`.
     * @param entry The key entry option to be normalized, which can be either an instance of `KIDEntry` or an object containing the properties needed to create a new `KIDEntry`.
     * @returns A `KIDEntry` instance corresponding to the provided entry option.
     */
    public static normalizeEntry(entry: JwtManager.KeyOption): JwtManager.KeyEntry {
        if (entry instanceof JwtManager.KeyEntry) return entry;
        const { alg: algorithm, key, kid } = entry;
        return new JwtManager.KeyEntry(algorithm, key, kid);
    }
}
export namespace JwtManager {
    export import Algorithm = _Algorithm;
    export import KeyGenerator = _KeyGenerator;
    export import JwtUtils = _JwtUtils;
    export import KeyEntry = _KeyEntry;
    export import Jwt = _Jwt;

    export type KeyOption =  KeyEntry | KeyEntry.KeyEntryOptions; 
    export interface KIDMap {
        [kid: string]: KeyEntry;
    }
}
export default JwtManager;