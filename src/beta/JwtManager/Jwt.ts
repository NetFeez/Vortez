import type JwtManager from './JwtManager.js';

import JwtUtils from './JwtUtils.js';

export class Jwt implements Jwt.Jwt {
    public constructor(
        public readonly header: Jwt.Header,
        public readonly payload: Jwt.Payload,
        public readonly signature: string,
        protected readonly manager: JwtManager
    ) {}
    /**
     * Checks if the JWT has expired based on the `exp` claim in the payload. If the `exp` claim is not present, it returns `false`, indicating that the token is not considered expired. If the `exp` claim is present, it compares the current time (in seconds since the Unix epoch) with the expiration time specified in the `exp` claim and returns `true` if the token has expired, or `false` otherwise.
     * @returns `true` if the JWT has expired; otherwise, `false`.
     */
    public expired(): boolean {
        if (!this.header.exp) return false;
        const now = Math.floor(Date.now() / 1000);
        return now >= this.header.exp;
    }
    
    public toJSON(): Jwt.Jwt {
        return { header: this.header, payload: this.payload, signature: this.signature };
    }
    public toString(): string {
        const encodedHeader = JwtUtils.objectToBase64Url(this.header);
        const encodedPayload = JwtUtils.objectToBase64Url(this.payload);
        return `${encodedHeader}.${encodedPayload}.${this.signature}`;
    }
}
export namespace Jwt {
    export interface Jwt {
        header: Header;
        payload: Payload;
        signature: string;
    }
    export interface Header {
        alg: JwtManager.AlgorithmName;
        typ: 'jwt';
        exp?: number;
        [key: string]: any;
    }
    export interface Payload {
        [key: string]: any;
    }
}
export default Jwt;