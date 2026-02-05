export class ServerError extends Error {
    public constructor(
        public readonly message: string,
        public readonly status: number = 500,
        public readonly options: ServerError.Options = {}
    ) { super(message, { cause: options.cause }) }
    public get isSended() { return this.options.isSended ?? false; }
    public toJSON() { return { message: this.message, status: this.status } }
}
export namespace ServerError {
    export interface Options {
        isSended?: boolean;
        cause?: Error;
    }
}
export default ServerError;