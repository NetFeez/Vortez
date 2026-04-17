/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description adds websocket functionality to Vortez
 * @license Apache-2.0
 */

import EVENTS from 'events';
import CRYPTO from 'crypto';
import { Duplex } from 'stream';
import Chunk from './Chunk.js';
import Cookie from '../Cookie.js';
import Request from '../Request.js';
import LoggerManager from '../LoggerManager.js';
import ServerError from '../ServerError.js';

const logger = LoggerManager.getInstance().webSocket;

export { Chunk } from './Chunk.js';


export class Websocket extends EVENTS {
    public static readonly WEBSOCKET_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    private _status: Websocket.handshakeStatus = 'pending';
    /**
     * Creates a new websocket.
     * @param client The connection with the client.
     */
    public constructor(
        public readonly request: Request,
        public readonly connection: Duplex
    ) { super(); this.initEvents(); }
    /** Whether the connection is closed. */
    public get isClosed(): boolean { return this.connection.readableEnded; }
    public get status(): Websocket.handshakeStatus { return this._status; }
    /**
     * Accepts the connection with the client.
     */
    public accept(): void  {
        const key = this.request.headers['sec-websocket-key']?.trim();
        if (!key) throw new ServerError('Missing Sec-WebSocket-Key header', 400);
        this._status = 'accepted';
        const acceptToken = CRYPTO.createHash('SHA1').update(
            key + Websocket.WEBSOCKET_GUID
        ).digest('base64');

        const headers = this.buildHeaders([
            'HTTP/1.1 101 Switching Protocols',
            'Upgrade: websocket',
            'Connection: Upgrade',
            `Sec-WebSocket-Accept: ${acceptToken}`
        ], this.request.cookies);

        this.connection.write(headers);
    }
    /**
     * Rejects the connection with the client.
     * @param code The code that will be sent to the client.
     * @param reason The reason that will be sent to the client.
     */
    public reject(code: number, reason: string): void {
        this._status = 'rejected';
        const body = JSON.stringify({ code, reason },null, 4);
        const headers = this.buildHeaders([
            `HTTP/1.1 ${code} ${reason}`,
            'Content-Type: application/json',
            `Content-Length: ${Buffer.byteLength(body)}`,
            'Connection: close'
        ], this.request.cookies);
        this.connection.write(headers);
        this.connection.end(body);
    }
    /**  Finishes the connection. */
    public end(): void { this.connection.end(); }
    /** Destroys the connection. */
    public destroy(): void { this.connection.destroy(); }
    /**
	 * Send data to the client.
	 * @param data The data that will be sent.
     */
    public send(data: string | Buffer): void {
        if (this.status == 'rejected') return void logger.warn('You cannot send data to a rejected websocket connection');
        if (this.status == 'pending') return void logger.warn('You cannot send data to a pending websocket connection');
        this.write(data);
    }
    /**
	 * Send data to the client in JSON format.
	 * @param data The data that will be sent.
     */
    public sendJson(data: any): void {
        const message = JSON.stringify(data);
        this.send(message);
    }
    /**
	 * Writes data to the client socket.
	 * @param data The data that will be sent.
     */
    private write(data: String | Buffer): void {
        let opCode: number, buffer: Buffer;

        if (data instanceof Buffer) {
            buffer = data;
            opCode = 0x2; // Binary frame
        } else if (typeof data === 'string') {
            buffer = this.stringToBuffer(data);
            opCode = 0x1; // Text frame
        } else {
            const stack = new Error().stack || ''; 
            return logger.warn('&C3Unsupported data type for Websocket.send. Data must be a string or a Buffer.\nStack trace:\n&C0' + stack);
        }
        const message = this.encode(buffer, opCode);
        this.connection.write(message);
    }
    /**
     * Encodes the data to be sent to the client.
     * @param data The data that will be encoded.
     * @param opCode The opcode of the message.
     * - `0x1` for text,
     * - `0x2` for binary,
     * - `0x8` for close,
     * - `0x9` for ping,
     * - `0xA` for pong.
     */
    private encode(data: Buffer, opCode: number = 0x2): Buffer {
        const encoded = [0x80 + opCode]; // FIN + OPCODE
        if (data.length <= 125) {
            encoded[1] = data.length;
        } else if (data.length >= 126 && data.length <= 65535) {
            encoded[1] = 126;
            encoded[2] = (data.length >> 8) & 255;
            encoded[3] = (data.length)      & 255
        } else {
            encoded[1] = 127;
            encoded[2] = (data.length >> 56) & 255;
            encoded[3] = (data.length >> 48) & 255;
            encoded[4] = (data.length >> 40) & 255;
            encoded[5] = (data.length >> 32) & 255;
            encoded[6] = (data.length >> 24) & 255;
            encoded[7] = (data.length >> 16) & 255;
            encoded[8] = (data.length >>  8) & 255;
            encoded[9] = (data.length)       & 255;
        }
        encoded.push(...data);
        return Buffer.from(encoded);
    }
    /**
     * Converts a string to a buffer.
     * @param message The string that will be converted.
     */
    private stringToBuffer(message: string): Buffer {
        return Buffer.from(message, 'utf-8');
    }
    /** Initializes the events. */
    private initEvents(): void {
        let surplus: Buffer = Buffer.alloc(0);
        let currentChunk: Chunk | null = null;
        let chunks: Chunk[] = [];

        this.connection.on('data', (data: Buffer) => {
            if (surplus) {
                data = Buffer.concat([surplus, data]);
                surplus = Buffer.alloc(0);
            }
            if (!currentChunk) currentChunk = new Chunk(data);
            else if (currentChunk.isWaiting()) currentChunk.pushData(data);
            if (!currentChunk.isWaiting()) {
                chunks.push(currentChunk);
                surplus = currentChunk.surplus;
                if (currentChunk.fin) {
                    const { opCode, size } = chunks[0];
                    const decoded = Buffer.concat(chunks.map(chunk => chunk.decode()));

                    if (opCode === 0x1 || opCode === 0x2) {
                        this.emit('message', decoded, { opCode, size });
                    } else if (opCode === 0x8) {
                        this.emit('close');
                        const closeFrame = this.encode(Buffer.alloc(0), 0x8);
                        this.connection.write(closeFrame);
                        this.connection.end();
                    } else if (opCode === 0x9) {
                        const pongFrame = this.encode(decoded, 0xA);
                        this.connection.write(pongFrame);
                    } else if (opCode === 0xA) { /* Ignore PONG frames for now */ }
                    else {
                        const stack = new Error().stack || ''; 
                        logger.warn(`Received unsupported opcode: ${opCode}\nStack trace:\n${stack}`);
                    }
                    chunks = [];
                }
                currentChunk = null;
            }
        });
        this.connection.on('close', ()      => this.emit('close'));
        this.connection.on('end',   ()      => this.emit('finish'));
        this.connection.on('error', (error) => this.emit('error', error));
    }

    public on(event: 'close',    listener: Websocket.listener.close): this;
    public on(event: 'error',    listener: Websocket.listener.error): this;
    public on(event: 'finish',   listener: Websocket.listener.finish): this;
    public on(event: 'message',  listener: Websocket.listener.message): this;
    public on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }
    public off(event: 'close',   listener: Websocket.listener.close): this;
    public off(event: 'error',   listener: Websocket.listener.error): this;
    public off(event: 'finish',  listener: Websocket.listener.finish): this;
    public off(event: 'message', listener: Websocket.listener.message): this
    public off(event: string, listener: (...args: any[]) => void): this {
        return super.off(event, listener);
    }
    private buildHeaders(lines: string[], cookies?: Cookie): string {
        const cookieSetters = cookies
            ? cookies.getSetters().map((setter) => `Set-Cookie: ${setter}`)
            : [];
        return [...lines, ...cookieSetters, '\r\n'].join('\r\n');
    }
}

export namespace Websocket {
    export namespace listener {
        export type close = () => void;
        export type error = (error: Error) => void;
        export type finish = () => void;
        export type message = (data: Buffer, info: dataInfo) => void;
    }
    export interface dataInfo {
        opCode: number;
        size: number | bigint;
    }
    export type handshakeStatus = 'accepted' | 'rejected' | 'pending';
}

export default Websocket;

/* To accept a connection
 * 
 * HTTP/1.1 101 Switching Protocols
 * Upgrade: websocket
 * Connection: Upgrade
 * Sec-WebSocket-Accept: Sec-Websocket-key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
 *                                            en HASH SHA-1 encoded in Base64
 *
 ** Format to data exchange
 *  0               1               2               3              
 *  0                   1                   2                   3
 *  0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 * +-+-+-+-+-------+-+-------------+-------------------------------+
 * |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 * |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 * |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 * | |1|2|3|       |K|             |                               |
 * +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 * |     Extended payload length continued, if payload len == 127  |
 * + - - - - - - - - - - - - - - - +-------------------------------+
 * |                               |Masking-key, if MASK set to 1  |
 * +-------------------------------+-------------------------------+
 * | Masking-key (continued)       |          Payload Data         |
 * +-------------------------------- - - - - - - - - - - - - - - - +
 * :                     Payload Data continued ...                :
 * + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 * |                     Payload Data continued ...                |
 * +---------------------------------------------------------------+
 * 
 * 
 * FIN and OPCODE works together to deliver messages with a separate frame
 * Only available in OPCODE 0x0 to 0x2
 * 
 * 
 * OPCODES:
 * 0x0: continuation
 * 0x1: text
 * 0x2: binary
 * 0x8: close
 * 0x9: ping
 * 0xA: pong
 */