import type { Duplex } from 'stream';

import type Request from '../Request.js';

import WebsocketBase from "./WebsocketBase.js";

import _WebsocketCSInit from './WebsocketCSInit.js';
import _WebsocketSSInit from './WebsocketSSInit.js';

export { Codec } from './Codec.js';
export { WebsocketCSInit } from './WebsocketCSInit.js';
export { WebsocketSSInit } from './WebsocketSSInit.js';

export class Websocket extends WebsocketBase {
    /**
     * Creates a new ServerInit with handshake functions for accepting or rejecting WebSocket connections.
     * This method is intended to be used in server-side applications to handle incoming WebSocket handshake requests and establish WebSocket connections with clients.
     * Before handshakes finish you should get WebSocket instance with get method `websocket`
     * @example
     * ```typescript
     * const serverSocketInit = Websocket.SS(socket, request);
     * serverSocketInit.accept(); // To accept the handshake and establish the WebSocket connection
     * // or
     * serverSocketInit.reject(400, 'Bad Request'); // To reject the handshake with a specific status code and reason
     * 
     * const socket = serverSocketInit.websocket; // Access the WebSocket instance for further communication after accepting the handshake
     * ```
     * @param socket - The Duplex stream representing the incoming socket connection from a client, which will be used for the WebSocket handshake and subsequent communication if the handshake is accepted.
     * @param request - The Request object representing the client's handshake request, which contains the necessary information for validating and processing the handshake.
     * @returns A ServerInit instance that provides methods for accepting or rejecting the WebSocket handshake, as well as access to the WebSocket instance for communication after a successful handshake.
     * @remarks The method creates a new ServerInit instance with the provided socket and request, which encapsulates the logic for handling the WebSocket handshake process. The returned ServerInit instance can then be used to accept or reject the handshake based on the validation of the client's request, and to access the WebSocket instance for communication if the handshake is accepted.
     */
    public static SS(socket: Duplex, request: Request): Websocket.WebsocketSSInit {
        return new _WebsocketSSInit(request, socket);
    }
    /**
     * Creates a new ClientInit and initiates a WebSocket connection to the specified URL by performing the necessary handshake process.
     * This method is intended to be used in client-side applications to establish WebSocket connections to servers by providing the appropriate WebSocket URL.
     * @param url - The WebSocket URL to connect to, which should include the protocol (ws:// or wss://), host, optional port, and path.
     * @returns A promise that resolves to a Websocket instance representing the established connection if the handshake is successful, or rejects with an error if the handshake fails or if there are issues during the connection process.
     * @remarks The method calls the static `connect` method of the ClientInit class, which handles parsing the URL, creating the socket connection, and performing the WebSocket handshake. If the handshake is successful, it resolves with a Websocket instance that can be used for communication. If any errors occur during the process, it rejects with the corresponding error.
     */
    public static CS(url: string): Promise<Websocket> {
        return _WebsocketCSInit.connect(url);
    }
}
export namespace Websocket {
    export import WebsocketCSInit = _WebsocketCSInit;
    export import WebsocketSSInit = _WebsocketSSInit;
}
export default Websocket;