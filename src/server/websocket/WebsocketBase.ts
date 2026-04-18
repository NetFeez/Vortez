/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description adds websocket functionality to Vortez
 * @license Apache-2.0
 */

import type { Duplex } from 'stream';

import type Message from './messageAssembler/Message.js';

import { Events } from '../../utilities/Utilities.js';
import LoggerManager from '../LoggerManager.js';

import Codec from './Codec.js';
import Frame from './frame/Frame.js';
import MessageAssembler from './messageAssembler/MessageAssembler.js';

const logger = LoggerManager.getInstance().webSocket;

export class WebsocketBase extends Events<WebsocketBase.EventMap> {
    protected vStatus: WebsocketBase.Status = 'handshake';

    protected assembler: MessageAssembler;
    protected surplus: Buffer = Buffer.alloc(0);

    public constructor(
        public readonly connection: Duplex,
    ) {
        super();
        this.assembler = new MessageAssembler();
    }

    public get isClosed(): boolean { return this.connection.readableEnded; }
    public get status(): WebsocketBase.Status { return this.vStatus; }
    /**
     * Sends a JSON-serializable object through the WebSocket connection as a text frame. The object is first serialized to a JSON string before being sent.
     * @param data - The JSON-serializable object to be sent through the WebSocket connection.
     */
    public sendJson(data: any): void {
        const jsonString = JSON.stringify(data);
        this.send(jsonString);
    }
    /**
     * Sends data through the WebSocket connection.
     * The data can be either a string (which will be sent as a text frame) or a Buffer (which will be sent as a binary frame).
     * If the connection is not open, a warning is logged and the data is not sent.
     * @param data - The data to be sent through the WebSocket connection, which can be either a string or a Buffer.
     * @remarks The method first checks the status of the connection to ensure that it is open before attempting to send data. If the connection is closed or still in the handshake phase, a warning is logged to inform the developer that data cannot be sent in the current state. If the connection is open, the method calls the internal `write` method to handle encoding and sending the data through the WebSocket connection.
     */
    public send(data: string | Buffer): void {
        if (this.status === 'closed') return void logger.warn('You cannot send data to a closed websocket connection');
        if (this.status === 'handshake') return void logger.warn('You cannot send data to a websocket connection in the handshake phase');
        this.write(data);
    }
    /**
     * ====== Override this method in Client side to use different codec ======
     * 
     * Internal method to encode and send a WebSocket frame with the specified opcode.
     * This method is used to send control frames (like close, ping, pong) or any other frames with specific opcodes as needed.
     * It encodes the provided frame data using the Codec module and sends it through the WebSocket connection.
     * @param buffer - The Buffer containing the data to be sent in the WebSocket frame, which will be encoded according to the WebSocket protocol.
     * @param opcode - The opcode indicating the type of frame being sent (e.g., 0x8 for close, 0x9 for ping, 0xA for pong).
     * @remarks The method encodes the frame data with the specified opcode and sends it through the WebSocket connection. This is typically used for sending control frames in response to certain events (like responding to a ping with a pong) or for initiating a close frame when closing the connection.
     */
    protected writeFrame(buffer: Buffer, opcode: number): void {
        const frame = Codec.encode(buffer, opcode);
        this.connection.write(frame);
    }
    /**
     * Internal method to write data to the WebSocket connection.
     * This method handles encoding the data into the appropriate WebSocket frame format before sending it through the connection.
     * It supports both string and Buffer data types, encoding them as text or binary frames respectively.
     * If an unsupported data type is provided, a warning is logged and the data is not sent.
     * @param data - The data to be sent through the WebSocket connection, which can be either a string (for text frames) or a Buffer (for binary frames).
     * @remarks The method first checks the type of the data and encodes it accordingly using the Codec module. It then sends the encoded frame through the WebSocket connection.
     * If the data type is not supported, a warning is logged to inform the developer of the issue without throwing an error, allowing the application to continue running without interruption.
     */
    private write(data: string | Buffer): void {
        let opcode: number, buffer: Buffer;
        if (data instanceof Buffer) {
            buffer = data; opcode = 0x2;
        } else if (typeof data === 'string') {
            buffer = Buffer.from(data, 'utf-8'); opcode = 0x1;
        } else {
            const stack = new Error().stack || '';
            return logger.warn('&C3Unsupported data type for Websocket.send. Data must be a string or a Buffer.\nStack trace:\n&C0' + stack);
        }
        this.writeFrame(buffer, opcode);
    }
    /**
     * Initializes the WebSocket connection by setting up event listeners for incoming data, message assembly, and connection events.
     * This method is called after a successful handshake to start processing WebSocket frames and messages.
     * It listens for 'data' events on the socket to process incoming frames, and uses the MessageAssembler to assemble complete messages from the frames.
     * It also handles control frames (like close and ping) appropriately, emitting events for messages, errors, and connection closures as needed.
      * @param socket - The Duplex stream representing the WebSocket connection, which will be used to listen for incoming data and send responses as needed.
      * @remarks The method sets up a 'data' event listener on the socket to process incoming data buffers. It uses the MessageAssembler to handle the assembly of messages from frames, emitting 'message' events when complete messages are assembled. It also handles control frames such as close and ping, emitting a 'close' event when a close frame is received and responding to ping frames with pong frames. Additionally, it listens for 'close' and 'error' events on the socket to emit corresponding events for the WebSocket instance.
     */
    protected startup(socket: Duplex): void {
        socket.on('data', (data: Buffer) => {
            if (this.surplus.length > 0) {
                data = Buffer.concat([this.surplus, data]);
                this.surplus = Buffer.alloc(0);
            }
            this.processBuffer(data);
        });
        this.assembler.on('message', (message: Message) => {
            if (message.isText || message.isBinary) {
                this.emit('message', message.payload);
                if (message.isText) this.emit('message:text', message.payload.toString('utf-8'));
                else this.emit('message:binary', message.payload);
            } else if (message.isClose) {
                this.emit('close');
                const closeFrame = Codec.encode(Buffer.alloc(0), 0x8);
                this.connection.write(closeFrame);
                this.connection.end();
            } else if (message.isPing) {
                const pongFrame = Codec.encode(message.payload, 0xA);
                this.connection.write(pongFrame);
            }
        });
        this.assembler.on('error', (error) => {
            this.emit('error', error);
            const closeFrame = Codec.encode(Buffer.alloc(0), 0x8);
            this.connection.write(closeFrame);
            this.connection.end();
        });
        socket.on('close', this.emit.bind(this, 'close'));
        socket.on('error', this.emit.bind(this, 'error'));
    }
    /**
     * Procesa el buffer recibido, extrayendo todos los frames completos y acumulando el surplus.
     * Se encarga de manejar errores de parsing y de empujar los frames al assembler.
     */
    private processBuffer(data: Buffer): void {
        try {
            while (data.length > 0) {
                let result: Frame.ReadResult;
                try {
                    result = Frame.fromBuffer(data);
                } catch (error) {
                    if (error instanceof RangeError) {
                        this.surplus = data;
                        break;
                    } else if (error instanceof Error) {
                        this.emit('error', error);
                        break;
                    } else {
                        this.emit('error', new Error(String(error)));
                        break;
                    }
                }
                const { frame, chunk, surplus: rest } = result;
                this.assembler.push(frame);
                data = rest;
            }
        } catch (error) {
            if (error instanceof Error) this.emit('error', error);
            else this.emit('error', new Error(String(error)));
        }
    }
}
export namespace WebsocketBase {
    export type Status = 'handshake' | 'open' | 'closed';
    export interface dataInfo {
        opCode: number;
        size: number | bigint;
    }
    export type EventMap = {
        message: [message: Buffer | string];
        'message:text': [message: string];
        'message:binary': [message: Buffer];
        error: [error: Error];
        close: [];
        open: [];
    }
}
export default WebsocketBase;