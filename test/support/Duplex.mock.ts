import { Duplex as Real } from 'stream';

export class Duplex extends Real {
    private connected: boolean = false;
    private connection: Duplex | null = null;
    constructor(
        public delay: number = 0
    ) { super(); }
    public connect(connection: Duplex): void {
        if (this.connected) throw new Error('This duplex is already connected');
        if (connection && connection.connected) throw new Error('The brother duplex is already connected');
        if (connection === this) throw new Error('A duplex cannot connect to itself');
        this.connected = true;
        this.connection = connection;
        connection.connected = true;
        connection.connection = this;
    }
    public override _read(size: number): void {}
    public override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        if (!this.connected || !this.connection) {
            callback(new Error('Duplex is not connected'));
            return;
        }
        const defer = this.delay > 0 
            ? (fn: () => void) => setTimeout(fn, this.delay)
            : setImmediate;

        defer(() => {
            if (this.connection) {
                this.connection.push(chunk, encoding);
            }
            callback();
        });
    }
}
export namespace Duplex {}
export default Duplex;