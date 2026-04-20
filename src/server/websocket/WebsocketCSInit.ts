import type { Duplex } from 'stream';

import net from 'net';
import tls from 'tls';

import CSHandShaker from './handshake/CSHandshaker.js';
import WebsocketBase from './WebsocketBase.js';
import Codec from './Codec.js';

export class WebsocketCSInit extends WebsocketBase {
    protected handshaker: CSHandShaker;
    public request: WebsocketCSInit.Request;
    public constructor(socket: Duplex, request: WebsocketCSInit.Request) { super(socket);
        this.handshaker = new CSHandShaker(socket, request.authority, request.path);
        this.request = request;
        this.handshake();
    }
    protected override encode(buffer: Buffer, opcode: number): Buffer {
        return Codec.clientEncode(buffer, opcode);
    }
    /**
     * Handles the WebSocket handshake process by listening for 'finish' and 'error' events from the CSHandShaker instance.
     * When the handshake is completed successfully, it updates the connection status to 'open', initializes the WebSocket connection, and emits an 'open' event. If the handshake fails or encounters an error, it updates the status to 'closed' and emits a 'close' or 'error' event accordingly.
     * This method is called internally during the construction of the WebsocketCSInit instance to automatically manage the handshake process when a new connection is established.
     */
    protected handshake(): void {
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
        this.handshaker.start();
    }
    /**
     * Establishes a WebSocket connection to the specified URL by performing the necessary handshake process. This method parses the provided URL, creates a socket connection to the server, and then initiates the WebSocket handshake to establish a full-duplex communication channel.
     * @param url - The WebSocket URL to connect to, which should include the protocol (ws:// or wss://), host, optional port, and path.
     * @returns A promise that resolves to a Websocket instance representing the established connection if the handshake is successful, or rejects with an error if the handshake fails or if there are issues during the connection process.
     * @remarks The method first parses the URL to extract the necessary components (protocol, host, port, path), then creates a socket connection based on the protocol (using TLS for wss and a regular TCP socket for ws). After establishing the socket connection, it performs the WebSocket handshake using the CSHandShaker class.
     * If the handshake is successful, it initializes a new ClientInit instance with the established socket and resolves the promise with this instance. If any errors occur during parsing, socket creation, or handshake, the promise is rejected with the corresponding error.
     */
    public static async connect(url: string): Promise<WebsocketBase> {
        const request = WebsocketCSInit.parseURL(url);
        const socket = WebsocketCSInit.createSocket(request.protocol, request.host, request.port);
        const websocket = new WebsocketCSInit(socket, request);
        return websocket;
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
    public static createSocket(protocol: string, host: string, port: number): Duplex {
        if (protocol === 'wss:') return tls.connect({ host, port, servername: host });
        else return net.connect({ host, port });
    }
    /**
     * Parses a WebSocket URL and extracts its components (protocol, host, port, path) to create a structured request object. This method is used internally to process the URL provided for establishing a WebSocket connection.
     * @param url - The WebSocket URL to be parsed, which should include the protocol (ws:// or wss://), host, optional port, and path.
     * @returns An object containing the parsed components of the URL: protocol, host, port, and path. The port is determined based on the protocol if not explicitly provided in the URL (defaulting to 80 for ws and 443 for wss).
     * @throws Will throw an error if the URL does not use a valid WebSocket protocol (i.e., if it does not start with ws:// or wss://).
     */
    public static parseURL(url: string):  WebsocketCSInit.Request {
        const parsed = new URL(url);
        const protocol = parsed.protocol;
        if (!WebsocketCSInit.isProtocol(protocol)) throw new Error('Solo se aceptan protocolos ws:// o wss://');
        const defaultPort = protocol === 'wss:' ? 443 : 80;
        const host = parsed.hostname;
        const port = Number(parsed.port || defaultPort);
        const path = parsed.pathname + (parsed.search || '');
        const authority = `${host}:${port}`;
        return { protocol, host, port, path, authority };
    }
    /**
     * Valida si el protocolo es ws o wss. Este método se utiliza internamente para asegurar que solo se acepten URLs con los protocolos correctos durante el proceso de conexión.
     * @param protocol - El protocolo extraído de la URL, que debe ser 'ws:' o 'wss:'.
     * @returns Un valor booleano que indica si el protocolo es válido (true) o no (false).
     */
    protected static isProtocol(protocol: string): protocol is WebsocketCSInit.Protocol {
        return ['ws:', 'wss:'].includes(protocol);
    }
}

export namespace WebsocketCSInit {
    export type Protocol = 'ws:' | 'wss:';
    export interface Request {
        protocol: Protocol,
        authority: string,
        host: string,
        port: number,
        path: string
    }
}
export default WebsocketCSInit;