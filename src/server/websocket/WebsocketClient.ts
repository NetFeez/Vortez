import type { Duplex } from 'node:stream';

import net from 'node:net';
import tls from 'node:tls';

import { Async } from '@netfeez/common-node';

import CSHandShaker from './handshake/CSHandshaker.js';
import Websocket from './Websocket.js';
import Codec from './Codec.js';

export class WebsocketClient extends Websocket {
    protected handshaker: CSHandShaker;
    public constructor(socket: Duplex, request: WebsocketClient.Request) { super(socket);
        this.handshaker = new CSHandShaker(socket, request.authority, request.path);
        this.handshake();
    }
    public startHandshake(): void {
        this.handshaker.start();
    }
    protected override encode(buffer: Buffer, opcode: number): Buffer {
        return Codec.clientEncode(buffer, opcode);
    }
    /**
     * Establishes a WebSocket connection to the specified URL by performing the necessary handshake process. This method parses the provided URL, creates a socket connection to the server, and then initiates the WebSocket handshake to establish a full-duplex communication channel.
     * @param url - The WebSocket URL to connect to, which should include the protocol (ws:// or wss://), host, optional port, and path.
     * @param options - An object containing optional parameters for the connection, such as a timeout value for the connection process.
     *  * timeout: An optional number representing the maximum time (in milliseconds) to wait for the connection to be established before timing out. If not provided, a default timeout of 10 seconds (10000 milliseconds) is used.
     * @returns A promise that resolves to a Websocket instance representing the established connection if the handshake is successful, or rejects with an error if the handshake fails or if there are issues during the connection process.
     * @remarks The method first parses the URL to extract the necessary components (protocol, host, port, path), then creates a socket connection based on the protocol (using TLS for wss and a regular TCP socket for ws). After establishing the socket connection, it performs the WebSocket handshake using the CSHandShaker class.
     * If the handshake is successful, it initializes a new WebsocketClient instance with the established socket and resolves the promise with this instance. If any errors occur during parsing, socket creation, or handshake, the promise is rejected with the corresponding error.
     */
    public static async connect(url: string, options: WebsocketClient.ConnectOptions = {}): Promise<Websocket> {
        const { timeout = 10000 } = options;
        const request = WebsocketClient.parseURL(url);
        const socket = WebsocketClient.createSocket(request.protocol, request.host, request.port);
        const websocket = new WebsocketClient(socket, request);
        return Async.awaitEvent<Websocket>((done, fail) => {
            const onOpen = () => { cleanup(); done(websocket); };
            const onError = (err: Error) => { cleanup(); fail(err); };
            const cleanup = () => {
                websocket.off('open', onOpen);
                websocket.off('error', onError);
            };
            websocket.on('open', onOpen);
            websocket.on('error', onError);
            websocket.startHandshake();
            return () => {
                cleanup();
                if (websocket.status !== 'open') {
                    socket.destroy();
                }
            };
        }, timeout);
    }
    /**
     * Parses a WebSocket URL and extracts its components (protocol, host, port, path) to create a structured request object. This method is used internally to process the URL provided for establishing a WebSocket connection.
     * @param url - The WebSocket URL to be parsed, which should include the protocol (ws:// or wss://), host, optional port, and path.
     * @returns An object containing the parsed components of the URL: protocol, host, port, and path. The port is determined based on the protocol if not explicitly provided in the URL (defaulting to 80 for ws and 443 for wss).
     * @throws Will throw an error if the URL does not use a valid WebSocket protocol (i.e., if it does not start with ws:// or wss://).
     */
    public static parseURL(url: string):  WebsocketClient.Request {
        const parsed = new URL(url);
        const protocol = parsed.protocol;
        if (!WebsocketClient.isProtocol(protocol)) throw new Error('Solo se aceptan protocolos ws:// o wss://');
        const defaultPort = protocol === 'wss:' ? 443 : 80;
        const host = parsed.hostname;
        const port = Number(parsed.port || defaultPort);
        const path = parsed.pathname + (parsed.search || '');
        const authority = `${host}:${port}`;
        return { protocol, host, port, path, authority };
    }
    /**
     * Creates a socket connection to the specified host and port using the appropriate protocol (TCP for ws and TLS for wss).
     * This method is used internally to establish the underlying connection before performing the WebSocket handshake.
     * @param protocol - The protocol to use for the connection, which should be either 'ws:' for a regular TCP connection or 'wss:' for a secure TLS connection.
     * @param host - The hostname of the server to connect to.
     * @param port - The port number of the server to connect to.
     * @returns A Duplex stream representing the established socket connection, which will be used for the WebSocket handshake and subsequent communication.
     * @remarks The method checks the protocol and creates a socket connection accordingly. For 'wss:', it uses TLS to create a secure connection, while for 'ws:', it creates a standard TCP connection. The returned Duplex stream can then be used for reading and writing data during the WebSocket communication.
     */
    protected static createSocket(protocol: string, host: string, port: number): Duplex {
        if (protocol === 'wss:') return tls.connect({ host, port, servername: host });
        else return net.connect({ host, port });
    }
    /**
     * Valida si el protocolo es ws o wss. Este método se utiliza internamente para asegurar que solo se acepten URLs con los protocolos correctos durante el proceso de conexión.
     * @param protocol - El protocolo extraído de la URL, que debe ser 'ws:' o 'wss:'.
     * @returns Un valor booleano que indica si el protocolo es válido (true) o no (false).
     */
    protected static isProtocol(protocol: string): protocol is WebsocketClient.Protocol {
        return ['ws:', 'wss:'].includes(protocol);
    }
}

export namespace WebsocketClient {
    export type Protocol = 'ws:' | 'wss:';
    export interface ConnectOptions {
        // headers?: Record<string, string>;
        timeout?: number;
    }
    export interface Request {
        protocol: Protocol,
        authority: string,
        host: string,
        port: number,
        path: string
    }
}
export default WebsocketClient;