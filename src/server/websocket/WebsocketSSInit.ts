import type { Duplex } from 'stream';

import type Request from '../Request.js';

import SSHandshaker from './handshake/SSHandshaker.js';
import WebsocketBase from './WebsocketBase.js';

export class WebsocketSSInit extends WebsocketBase {
    protected handshaker: SSHandshaker;
    public constructor(
        request: Request,
        socket: Duplex
    ) {
        super(socket);
        this.handshaker = new SSHandshaker(socket, request);
    }
    /**
     * Accepts the WebSocket handshake by validating the client's request and sending the appropriate HTTP response to establish the WebSocket connection. This method should be called after verifying that the client's handshake request is valid and meets the necessary criteria for accepting the connection.
      * - It generates the Sec-WebSocket-Accept key based on the client's Sec-WebSocket-Key and constructs the HTTP response with the required headers to complete the handshake.
      * - After sending the response, it updates the internal status to 'open' and emits a 'finish' event with the new status.
      * @throws Will throw an error if the client's handshake request does not contain a valid Sec-WebSocket-Key or if any other issue occurs during the acceptance process. The error will be emitted as an 'error' event for handling by the caller.
      */
    public accept(): void {
        this.handshaker.once('finish', (status) => {
            this.vStatus = status;
            if (status !== 'open') this.emit('close');
            else {
                this.startup();
                this.emit('open');
            }
        });
        this.handshaker.once('error', (error) => {
            this.vStatus = 'closed';
            this.emit('error', error);
        });
        this.handshaker.accept();
    }
    /**
     * Rejects the WebSocket handshake by sending an HTTP response with the specified status code and reason, and then closes the connection.
     * @param code - The HTTP status code to indicate the reason for rejection (e.g., 400 for Bad Request).
     * @param reason - A human-readable string explaining the reason for rejection.
     * @remarks The generated response will have a JSON body containing the provided code and reason, and will include any specified cookies in the headers. This response can be sent back to the client to indicate that the handshake request was rejected, along with the reason for rejection.
     */
    public reject(code: number, reason: string): void {
        this.vStatus = 'closed';
        this.handshaker.reject(code, reason);
        this.emit('close');
    }
}
export namespace WebsocketSSInit {}
export default WebsocketSSInit;