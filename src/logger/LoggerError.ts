export class LoggerError extends Error {
    public readonly name: string = 'LoggerError';
    public constructor(
        public readonly code: LoggerError.Codes,
        message: string, options?: ErrorOptions
    ) { super(message, options); }
}
export namespace LoggerError {
    export enum Codes {
        PERMISSION_DENIED,
        CANT_OPEN_STREAM,
        UNKNOWN_ERROR,
        WRITE_ERROR
    }
}
export default LoggerError;