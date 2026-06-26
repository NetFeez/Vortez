import { CLIENT } from '../../support/symbols.js';

import type { Duplex } from 'node:stream';

import type Request from '../Request.js';

import SSHandshaker from './handshake/SSHandshaker.js';
import Websocket from './Websocket.js';

export class WebsocketServer extends Websocket {
    public readonly [CLIENT.WEBSOCKET] = true;

    protected handshaker: SSHandshaker;
    public constructor(request: Request, socket: Duplex) { super(socket);
        this.handshaker = new SSHandshaker(this.connection, request);
        this.handshake();
    }
    /**
     * Accepts the WebSocket handshake by validating the client's request and sending the appropriate HTTP response to establish the WebSocket connection. This method should be called after verifying that the client's handshake request is valid and meets the necessary criteria for accepting the connection.
      * - It generates the Sec-WebSocket-Accept key based on the client's Sec-WebSocket-Key and constructs the HTTP response with the required headers to complete the handshake.
      * - After sending the response, it updates the internal status to 'open' and emits a 'finish' event with the new status.
      * @throws Will throw an error if the client's handshake request does not contain a valid Sec-WebSocket-Key or if any other issue occurs during the acceptance process. The error will be emitted as an 'error' event for handling by the caller.
      */
    public async accept(): Promise<void> {
        if (this.status !== 'handshake') return this.emit('error', new Error('Handshake already completed or connection is closed'));
        await this.handshaker.accept();
    }
    /**
     * Rejects the WebSocket handshake by sending an HTTP response with the specified status code and reason, and then closes the connection.
     * @param code - The HTTP status code to indicate the reason for rejection (e.g., 400 for Bad Request).
     * @param reason - A human-readable string explaining the reason for rejection.
     * @remarks The generated response will have a JSON body containing the provided code and reason, and will include any specified cookies in the headers. This response can be sent back to the client to indicate that the handshake request was rejected, along with the reason for rejection.
     */
    public async reject(code: number, reason: string): Promise<void> {
        if (this.status !== 'handshake') return this.emit('error', new Error('Handshake already completed or connection is closed'));
        await this.handshaker.reject(code, reason);
    }
}
export namespace WebsocketServer {}
export default WebsocketServer;