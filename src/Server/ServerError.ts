export class ServerError extends Error {
    public constructor(
        public readonly message: string,
        public readonly status: number = 500,
        cause: Error | undefined = undefined
    ) { super(message, { cause }) }
    public toJSON() { return { message: this.message, status: this.status } }
}
export default ServerError;