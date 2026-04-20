import CRYPTO from 'crypto';
import { Duplex } from 'stream';

import { Events } from '../../../utilities/Utilities.js';
import Request from '../../Request.js';
import Cookie from '../../Cookie.js';

export class SSHandshaker extends Events<SSHandshaker.EventMap> {
    public static readonly WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    public vStatus: SSHandshaker.Status = 'handshake';
    public constructor(
        private readonly socket: Duplex,
        private readonly Request: Request,
    ) { super(); }
    /**
     * Accepts the WebSocket handshake by validating the client's request and sending the appropriate HTTP response to establish the WebSocket connection. This method should be called after verifying that the client's handshake request is valid and meets the necessary criteria for accepting the connection.
      * - It generates the Sec-WebSocket-Accept key based on the client's Sec-WebSocket-Key and constructs the HTTP response with the required headers to complete the handshake.
      * - After sending the response, it updates the internal status to 'open' and emits a 'finish' event with the new status.
      * 
      * @throws Will throw an error if the client's handshake request does not contain a valid Sec-WebSocket-Key or if any other issue occurs during the acceptance process. The error will be emitted as an 'error' event for handling by the caller.
      */
    public accept(): void {
        try {
            const key = this.Request.headers['sec-websocket-key'];
            if (!key) throw new Error('Server handshake requires a key');
            const response = SSHandshaker.acceptMessage(key, this.Request.cookies);
            this.socket.write(response);
            this.vStatus = 'open';
        } catch (error) {
            this.vStatus = 'closed';
            this.emit('error', error instanceof Error ? error : new Error(String(error)));
        } finally { setImmediate(() => this.emit('finish', this.vStatus)); }
    }
    /**
     * Rejects the WebSocket handshake by sending an HTTP response with the specified status code and reason, and then closes the connection.
     * @param code - The HTTP status code to indicate the reason for rejection (e.g., 400 for Bad Request).
     * @param reason - A human-readable string explaining the reason for rejection.
     * 
     * @remarks The generated response will have a JSON body containing the provided code and reason, and will include any specified cookies in the headers. This response can be sent back to the client to indicate that the handshake request was rejected, along with the reason for rejection.
     */
    public reject(code: number = 400, reason: string = 'Bad Request'): void {
        try {
            const response = SSHandshaker.rejectMessage(code, reason, this.Request.cookies);
            this.socket.write(response);
            this.socket.end();
            this.vStatus = 'closed';
        } catch (error) { this.emit('error', error instanceof Error ? error : new Error(String(error))); }
        finally { setImmediate(() => this.emit('finish', this.vStatus)); }
    }
    /**
     * Generates the Sec-WebSocket-Accept key for the server handshake response based on the client's Sec-WebSocket-Key.
     * @param key - The Sec-WebSocket-Key received from the client during the handshake request.
     * @returns The computed Sec-WebSocket-Accept key to be sent in the handshake response.
     */
    public static generateAcceptKey(key: string): string {
        return CRYPTO.createHash('sha1')
            .update(key + SSHandshaker.WEBSOCKET_GUID)
            .digest('base64');
    }
    /**
     * Generates an HTTP response message to accept a WebSocket handshake request with the appropriate headers.
     * @param key - The Sec-WebSocket-Key received from the client during the handshake request.
     * @param cookies - Optional cookies to be included in the response.
     * @returns A complete HTTP response message as a string to be sent back to the client.
     */
    private static acceptMessage(key: string, cookies?: Cookie): string {
        const acceptKey = SSHandshaker.generateAcceptKey(key);
        const setters = cookies
            ? cookies.setters.map((setter) => `Set-Cookie: ${setter}`)
            : [];
        return [
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptKey}`,
            ...setters,
            '\r\n'
        ].join('\r\n');
    }
    /**
     * Generates an HTTP response message to reject a WebSocket handshake request with a specific status code and reason.
     * @param code - The HTTP status code to indicate the reason for rejection (e.g., 400 for Bad Request).
     * @param reason - A human-readable string explaining the reason for rejection.
     * @param cookies - Optional cookies to be included in the response.
     * @returns A complete HTTP response message as a string to be sent back to the client.
     * 
     * @remarks The generated response will have a JSON body containing the provided code and reason, and will include any specified cookies in the headers. This response can be sent back to the client to indicate that the handshake request was rejected, along with the reason for rejection.
     */
    private static rejectMessage(code: number, reason: string, cookies?: Cookie): string {
        const body = JSON.stringify({ code, reason }, null, 4);
        const setters = cookies
            ? cookies.setters.map((setter) => `Set-Cookie: ${setter}`)
            : [];
        return [
            'HTTP/1.1 400 Bad Request',
            'Content-Type: application/json',
            `Content-Length: ${Buffer.byteLength(body)}`,
            ...setters,
            '\r\n',
            body
        ].join('\r\n');
    }
}
export namespace SSHandshaker {
    export type Status = 'handshake' | 'open' | 'closed';
    export type EventMap = {
        finish: [status: SSHandshaker.Status];
        error: [error: Error];
    }
}
export default SSHandshaker;