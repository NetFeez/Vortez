import { createHash, randomBytes } from 'node:crypto';
import { IncomingHttpHeaders } from 'node:http';
import { Duplex } from 'node:stream';

import Handshaker from './Handshaker.js';

export class CSHandShaker extends Handshaker {
    private secWebSocketKey: string;

    constructor(
        private readonly socket: Duplex,
        private readonly host: string,
        private readonly path: string = '/',
    ) { super();
        this.secWebSocketKey = randomBytes(16).toString('base64');
    }

    public start(): void {
        const action = this.handshake();
        action.next();
        const handler = (chunk: Buffer) => {
            try { action.next(chunk); }
            catch (error) { this.emit('error', error instanceof Error ? error : new Error(String(error))); }
            finally { this.socket.off('data', handler); }
        };
        this.socket.on('data', handler);
        const request = CSHandShaker.requestMessage(this.host, this.path, this.secWebSocketKey);
        this.socket.write(request);
    }

    /**
     * Performs the client-side WebSocket handshake by reading the server's response, validating it against the expected handshake response, and handling any excess data received during the process.
     * This generator function yields control back to the caller each time a chunk of data is received, allowing for asynchronous processing of the incoming data stream.
     * It continues to read data until it has received the full HTTP response headers (indicated by the presence of "\r\n\r\n"), at which point it parses the headers, validates the handshake response, and emits a 'finish' event with the appropriate status ('open' for a successful handshake or 'closed' for a failed handshake). If any errors occur during this process, an 'error' event is emitted with the relevant error information.
     * The handshake process involves several steps:
     * 1. Reading data from the socket until the full HTTP response headers are received (indicated by "\r\n\r\n").
     * 2. Parsing the HTTP response headers to extract the status code and relevant headers.
     * 3. Storing any leftover data that comes after the headers in an overflow buffer for later processing.
     * 4. Validating the handshake response by checking the status code and comparing the Sec-WebSocket-Accept header against the expected value computed from the original Sec-WebSocket-Key.
     * 5. Emitting a 'finish' event with the appropriate status based on whether the handshake was successful or not, and emitting an 'error' event if any issues arise during the process.
     * any steps after an error occurs will be skipped, and the handshake will be marked as 'closed' to indicate that the connection should not be established.
     */
    protected * handshake(): Generator<void, void, Buffer> {
        let buffer = Buffer.alloc(0);
        try {
            // Step 1: Read data until we have the full HTTP response headers (ending with \r\n\r\n)
            while (buffer.indexOf('\r\n\r\n') === -1) {
                const chunk = yield;
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Step 2: Parse the HTTP response headers
            const index = buffer.indexOf('\r\n\r\n');
            const headerBuffer = buffer.subarray(0, index);
            const leftovers = buffer.subarray(index + 4);

            // Step 3: Store any leftover data that comes after the headers in the overflow buffer for later processing
            if (leftovers.length > 0) this.overflow = leftovers;

            // Step 4: Validate the handshake response
            const { statusCode, headers } = this.parseHeaders(headerBuffer.toString('utf-8'));

            if (statusCode !== 101) throw new Error(`Unexpected status code: ${statusCode}`);

            const accept = headers['sec-websocket-accept'];
            const expected = CSHandShaker.computeAcceptKey(this.secWebSocketKey);
            if (accept !== expected) throw new Error('Invalid Sec-WebSocket-Accept header');

            // Step 5: Mark the handshake as finished through the shared handshaker flow.
            this.finish('open');
        } catch (error) {
            // Step 5 (error case): Use the shared finish flow so state and events stay consistent.
            this.finish('closed', error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Parses the raw HTTP response from the server to extract the status code and headers.
     * This method takes the raw response as a string, splits it into lines, and processes the first line to retrieve the HTTP status code.
     * It then iterates through the remaining lines to build an object containing all the headers, which are normalized to lowercase for easier access.
     * If the response does not conform to the expected format, an error is thrown indicating an invalid handshake response.
     * @param raw - The raw HTTP response string received from the server during the handshake process.
     * @returns An object containing the parsed status code and headers from the HTTP response.
     */
    private parseHeaders(raw: string) {
        const lines = raw.split('\r\n');
        const statusMatch = lines[0].match(/^HTTP\/\d\.\d (\d{3})/);
        
        if (!statusMatch) throw new Error('Invalid handshake response');

        const headers: IncomingHttpHeaders = {};
        for (let i = 1; i < lines.length; i++) {
            const [key, value] = lines[i].split(':').map(s => s.trim());
            if (key) headers[key.toLowerCase()] = value;
        }

        return { statusCode: parseInt(statusMatch[1], 10), headers };
    }
    /**
     * Generates the HTTP request message for initiating the WebSocket handshake with the server.
     * This method constructs a valid HTTP GET request with the necessary headers to request an upgrade to a WebSocket connection, including a randomly generated Sec-WebSocket-Key and the appropriate Upgrade and Connection headers.
     * @param host - The host and port of the server to which the handshake request will be sent (e.g., "example.com:8080").
     * @param path - The path on the server for the WebSocket endpoint (default is "/").
     * @param secWebSocketKey - The Sec-WebSocket-Key header value for the handshake request.
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
            '\r\n'
        ].join('\r\n');
    }

    /**
     * Computes the expected Sec-WebSocket-Accept value for a given key.
     * This method takes the Sec-WebSocket-Key provided in the client's handshake request, appends a fixed GUID string to it, and then computes the SHA-1 hash of the resulting string. The hash is then encoded in base64 to produce the expected Sec-WebSocket-Accept value that the server should return in its handshake response if the handshake is successful.
     * @param secWebSocketKey - The Sec-WebSocket-Key header value from the client's handshake request.
     * @returns The computed Sec-WebSocket-Accept value that the server should return in its handshake response.
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