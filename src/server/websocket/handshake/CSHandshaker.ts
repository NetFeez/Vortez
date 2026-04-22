import { createHash, randomBytes } from 'crypto';
import { Duplex } from 'stream';
import { IncomingHttpHeaders } from 'http';

import { Events } from '@netfeez/common';

export class CSHandShaker extends Events<CSHandShaker.EventMap> {
    private secWebSocketKey: string;
    public constructor(
        private readonly socket: Duplex,
        private readonly host: string,
        private readonly path: string = '/',
    ) { super();
        this.secWebSocketKey = randomBytes(16).toString('base64');
    }
    /**
     * Initiates the WebSocket handshake process by sending a properly formatted HTTP request to the server and setting up a data handler to process the server's response.
     * This method will emit a 'finish' event with the status of the handshake ('open' if successful, 'closed' if failed) once the server's response has been processed, or an 'error' event if any issues occur during the handshake process.
     * 
     * @remarks The handshake process involves sending an HTTP GET request with the necessary headers to request an upgrade to a WebSocket connection. The method also sets up a data handler to listen for the server's response, which will determine whether the handshake was successful based on the status code and headers received. Proper error handling is implemented to ensure that any issues during the handshake are appropriately emitted as events for further handling by the caller.
     */
    public start(): void {
        try {
            
            const request = CSHandShaker.requestMessage(this.host, this.path, this.secWebSocketKey);

            const emitter = new Events.Emitter<CSHandShaker.ServerSocketEventMap>();
            const handler = CSHandShaker.getDataHandler(emitter, this);
            this.socket.on('data', handler);
            emitter.once('response', (status, headers) => {
                this.socket.off('data', handler);
                if (status === 101) {
                    const accept = headers['sec-websocket-accept'];
                    const expected = CSHandShaker.computeAcceptKey(this.secWebSocketKey);
                    if (accept !== expected) {
                        this.emit('error', new Error('Invalid Sec-WebSocket-Accept header in handshake'));
                        setImmediate(() => this.emit('finish', 'closed'));
                        return;
                    }
                    setImmediate(() => this.emit('finish', 'open'));
                } else {
                    setImmediate(() => this.emit('finish', 'closed'));
                }
            });

            this.socket.write(request);
        } catch (error) {
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        }
    }
    /**
     * Generates an DataHandler function for processing the server's response to the WebSocket handshake request. This handler will parse the HTTP response from the server, extract the status code and headers, and emit a 'response' event with this information for further processing by the caller.
     * @param emitter - An event emitter to emit the 'response' event with the parsed status code and headers.
     * @param parent - The instance of CSHandShaker that will emit any errors encountered during the parsing process.
     * @returns A function that can be used as a data handler for the socket's 'data' event to process the server's handshake response.
     */
    private static getDataHandler(
        emitter: Events.Emitter<CSHandShaker.ServerSocketEventMap>,
        parent: CSHandShaker
    ): (data: Buffer) => void {
        let buffer = Buffer.alloc(0);
        return (data: Buffer): void => {
            try {
                buffer = Buffer.concat([buffer, data]);
                const index = buffer.indexOf('\r\n\r\n');
                if (index === -1) return;

                const headerBuffer = buffer.subarray(0, index);
                const leftovers = buffer.subarray(index + 4);

                if (leftovers.length > 0) { parent.socket.unshift(leftovers); }

                const header = headerBuffer.toString('utf-8');
                const headerLines = header.split('\r\n');
                const statusLine = headerLines[0];
                const statusMatch = statusLine.match(/^HTTP\/\d\.\d (\d{3})/);
                if (!statusMatch) {
                    emitter.emit('response', 0, {});
                    parent.emit('error', new Error('Invalid handshake response from server'));
                    return;
                }
                const statusCode = parseInt(statusMatch[1], 10);
                const headers: IncomingHttpHeaders = {};
                for (let i = 1; i < headerLines.length; i++) {
                    const line = headerLines[i];
                    const [key, value] = line.split(':').map(s => s.trim());
                    headers[key.toLowerCase()] = value;
                }
                emitter.emit('response', statusCode, headers);
            } catch (error) {
                parent.emit('error', error instanceof Error ? error : new Error(String(error)));
            }
        };
    }
    /**
     * Generates the HTTP request message for initiating the WebSocket handshake with the server.
     * This method constructs a valid HTTP GET request with the necessary headers to request an upgrade to a WebSocket connection, including a randomly generated Sec-WebSocket-Key and the appropriate Upgrade and Connection headers.
     * @param host - The host and port of the server to which the handshake request will be sent (e.g., "example.com:8080").
     * @param path - The path on the server for the WebSocket endpoint (default is "/").
     */
    private static requestMessage(host: string, path: string = '/', secWebSocketKey: string): string {
        path = encodeURIComponent(path);
        path = path.replace(/%2F/g, '/');
        path = path.replace(/^\/?/, '/');
        return [
            `GET ${path} HTTP/1.1`,
            `Host: ${host}`,
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Key: ${secWebSocketKey}`,
            'Sec-WebSocket-Version: 13',
            ''
        ].join('\r\n');
    }

    /**
     * Computes the expected Sec-WebSocket-Accept value for a given key.
     */
    private static computeAcceptKey(secWebSocketKey: string): string {
        const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        return createHash('sha1')
            .update(secWebSocketKey + GUID)
            .digest('base64');
    }
}
export namespace CSHandShaker {
    export type Status = 'handshake' | 'open' | 'closed';
    export type EventMap = {
        finish: [status: CSHandShaker.Status];
        error: [error: Error];
    }
    export type ServerSocketEventMap = {
        response: [status: number, headers: IncomingHttpHeaders];
    }
}
export default CSHandShaker;