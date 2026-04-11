export class JwtError extends Error {
    public readonly code: JwtError.Code;

    public constructor(code: JwtError.Code, message: string, options: ErrorOptions = {}) {
        super(message, options);
        this.name = 'JwtError';
        this.code = code;
    }
}

export namespace JwtError {
    export type Code = (
        'TOKEN_INVALID' |
        'KEY_NOT_FOUND' |
        'INVALID_SIGNATURE' |
        'TOKEN_EXPIRED' |
        'SIGN_FAILED'
    );
}

export default JwtError;