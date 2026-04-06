import type Algorithm from './algorithm/Algorithm.js';
import type KIDEntry from './KIDEntry.js';

import JwtUtils from './JwtUtils.js';

export class Jwt implements Jwt.Jwt {
    public constructor(
        public readonly header: Jwt.Header,
        public readonly payload: Jwt.Payload,
        public readonly signature: string,
        protected readonly signer: Algorithm
    ) {}
    /**
     * Checks if the JWT has expired based on the `exp` claim in the payload. If the `exp` claim is not present, it returns `false`, indicating that the token is not considered expired. If the `exp` claim is present, it compares the current time (in seconds since the Unix epoch) with the expiration time specified in the `exp` claim and returns `true` if the token has expired, or `false` otherwise.
     * @returns `true` if the JWT has expired; otherwise, `false`.
     */
    public get expired(): boolean {
        if (this.payload.exp == null) return false;
        return Jwt.isExpired(this.payload.exp);
    }

    public toJSON(): Jwt.Jwt {
        return { header: this.header, payload: this.payload, signature: this.signature };
    }
    public toString(): string {
        const encodedHeader = JwtUtils.objectToBase64Url(this.header);
        const encodedPayload = JwtUtils.objectToBase64Url(this.payload);
        return `${encodedHeader}.${encodedPayload}.${this.signature}`;
    }

    /**
     * Static method to check if a given expiration time (in seconds since the Unix epoch) has passed. It compares the current time with the provided expiration time and returns `true` if the current time is greater than or equal to the expiration time, indicating that the token has expired, or `false` otherwise.
     * @param exp The expiration time to check, represented as a number of seconds since the Unix epoch.
     * @returns `true` if the current time is greater than or equal to the expiration time; otherwise, `false`.
     */
    public static isExpired(exp: number): boolean {
        const now = JwtUtils.nowInSeconds();
        return now >= exp;
    }
}
export namespace Jwt {
    export interface Jwt {
        header: Header;
        payload: Payload;
        signature: string;
    }
    export interface Header {
        alg: KIDEntry.AlgorithmName;
        typ: 'jwt';
        kid?: string;
        [key: string]: any;
    }
    export interface Payload {
        exp?: number;
        [key: string]: any;
    }
}
export default Jwt;