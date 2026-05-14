/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description adds websocket functionality to Vortez
 * @license Apache-2.0
 */

import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';

import { BufferedEvents } from '@netfeez/common';

import LoggerManager from '../LoggerManager.js';

import Codec from './Codec.js';
import Frame from './frame/Frame.js';
import FrameAssembler from './DataProcessor.js';
import Message from './messageAssembler/Message.js';
import MessageAssembler from './messageAssembler/MessageAssembler.js';
import Handshaker from './handshake/Handshaker.js';

const logger = LoggerManager.getInstance().webSocket;

export abstract class Websocket extends BufferedEvents<Websocket.EventMap> {
    protected vMainStatus?: Websocket.Status;

    protected readonly abstract handshaker: Handshaker;

    protected readonly messaging: MessageAssembler = new MessageAssembler();
    protected readonly framing: FrameAssembler = new FrameAssembler();

    protected readonly binds: Websocket.Binds = {
        messageHandler: this.messageHandler.bind(this),
        putFrame: this.messaging.push.bind(this.messaging),
        putData: this.framing.push.bind(this.framing),
        errorHandler: this.errorHandler.bind(this),
        closeHandler: this.closeHandler.bind(this),
    };

    public constructor(
        public readonly connection: Duplex
    ) { super(); }

    public get isClosed(): boolean { return this.connection.readableEnded; }
    public get status(): Websocket.Status { return this.vMainStatus || this.handshaker.status; }
    public get websocket(): Websocket { return this; }

    /**
     * Handles the WebSocket handshake process by setting up event listeners for handshake completion and errors.
     * This method is called during the initialization of the WebSocket connection to manage the handshake phase and transition to the open state once the handshake is successfully completed.
      * - It listens for 'error' events from the handshaker to handle handshake errors, emitting an 'error' event and closing the connection if an error occurs.
      * - It listens for 'finish' events from the handshaker to determine when the handshake is complete. If the status is 'open', it sets up the WebSocket connection for message processing and emits an 'open' event. If the status is 'closed', it emits a 'close' event.
      * @remarks This method is essential for managing the handshake phase of the WebSocket connection, ensuring that any errors during the handshake are properly handled and that the connection transitions to the open state when the handshake is successful. It also sets up the necessary event listeners to manage the lifecycle of the WebSocket connection based on the handshake outcome.
     */
    protected handshake(): void {
        this.handshaker.on('error', (error) => {
            logger.debug(`[${this.constructor.name}] websocket handshake error:`, error);
            this.emit('error', error);
            this.encode(Buffer.alloc(0), 0x8);
            this.connection.end();
        });
        this.handshaker.on('finish', (status) => {
            logger.debug(`[${this.constructor.name}] websocket handshake finished with status: ${status}`);
            if (status === 'open') {
                this.startup();
                this.emit('open');
                this.framing.push(this.handshaker.overflow);
            } else this.emit('close');
        });
    };
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
        if (typeof data === 'string') return this.write(Buffer.from(data, 'utf-8'), 0x1);
        else if (data instanceof Buffer) return this.write(data, 0x2);

        const stack = new Error().stack || '';
        return logger.warn('&C3Unsupported data type for Websocket.send. Data must be a string or a Buffer.\nStack trace:\n&C0' + stack);
    }
    /**
     * Sends a ping frame through the WebSocket connection and waits for a corresponding pong response to measure the round-trip time (RTT) of the ping-pong exchange. The method returns a promise that resolves with the measured RTT in milliseconds or rejects if a timeout occurs or if there is an error during the process.
     * @param options - An optional object containing configuration options for the ping operation, including:
     *   - `timeout`: The maximum time to wait for a pong response before rejecting the promise (default is 5000 milliseconds).
     *   - `data`: Optional data to include in the ping frame, which can be a Buffer or a string. If a string is provided, it will be converted to a Buffer using UTF-8 encoding.
     * @returns A promise that resolves with the measured round-trip time (RTT) in milliseconds if a pong response is received within the specified timeout, or rejects with an error if a timeout occurs or if there is an issue during the ping-pong exchange.
     */
    public async ping(options: Websocket.PingOptions = {}): Promise<number> {
        const {
            timeout = 5000,
            data = randomUUID(),
        } = options;
        
        const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
        const start = Date.now();

        return new Promise((resolve, reject) => {
            const handler = (payload: Buffer) => {
                if (payload.equals(buffer)) {
                    cleanup();
                    resolve(Date.now() - start);
                }
            };

            const timer = setTimeout(() => {
                cleanup();
                reject(new Error(`Ping timeout after ${timeout}ms`));
            }, timeout);

            const cleanup = () => {
                clearTimeout(timer);
                this.off('pong', handler);
            };

            this.on('pong', handler);
            
            try { this.write(buffer, 0x09); }
            catch (error) {
                cleanup();
                reject(error);
            }
        });
    }
    /**
     * Closes the WebSocket connection by sending a close frame and ending the connection. If the connection is already closed, this method does nothing.
      * - It first checks if the connection is already closed, and if so, it simply returns without performing any actions.
      * - If the connection is not closed, it updates the internal status to 'closed', sends a close frame to the peer, and ends the connection.
      * @remarks This method ensures that the WebSocket connection is properly closed by sending the appropriate close frame and terminating the connection. It also prevents any further actions from being taken on a closed connection by checking the status before attempting to close it again.
     */
    public close(): void {
        this.write(Buffer.alloc(0), 0x8);
        this.vMainStatus = 'closed';
        this.connection.end();
    }
    /**
     * Writes the given buffer with the specified opcode to the WebSocket connection.
     * This method is responsible for encoding the data into a WebSocket frame format and sending it through the underlying connection.
     * In the base implementation, it uses the `encode` method to perform the encoding, which can be overridden in subclasses to provide different encoding strategies (e.g., masking for client-to-server communication).
     * @param buffer - The data buffer to be encoded and sent through the WebSocket connection.
     * @param opcode - The opcode indicating the type of frame being sent (e.g., 0x1 for text frames, 0x2 for binary frames).
     * @remarks This method is designed to be overridden in client-side implementations to allow for different encoding strategies, such as masking frames for client-to-server communication. In the base implementation, it simply encodes the buffer using the standard `encode` method and writes it to the connection, but subclasses can provide their own encoding logic as necessary.
     */
    public write(buffer: Buffer, opcode: number): void {
        if (this.status !== 'open') return logger.warn('&C3Attempted to send data on a WebSocket connection that is not open. Data will not be sent.');
        if (
            this.connection.writableEnded ||
            this.connection.destroyed ||
            !this.connection.writable
        ) {
            this.vMainStatus = 'closed';
            this.emit('close');
            const stack = new Error().stack || '';
            return logger.warn(`&C3Attempted to send data on a WebSocket connection that is already closed. Data will not be sent. ${stack}`);
        }
        const frame = this.encode(buffer, opcode);
        this.connection.write(frame);
    }
    /**
     * ====== Override this method in Client side to use different codec ======
     * 
     * Encodes the given buffer with the specified opcode and sends it through the WebSocket connection. This method is responsible for encoding the data into a WebSocket frame format and writing it to the underlying connection.
     * In the base implementation, it uses the Codec.encode method to perform the encoding, but this method can be overridden in subclasses (such as WebsocketCSInit) to use a different encoding strategy if needed.
     * @param buffer - The data buffer to be encoded and sent through the WebSocket connection.
     * @param opcode - The opcode indicating the type of frame being sent (e.g., 0x1 for text frames, 0x2 for binary frames).
     * @returns the encoded buffer that was sent through the connection. This allows for further processing or logging of the encoded data if necessary.
     * @remarks This method is designed to be overridden in client-side implementations to allow for different encoding strategies, such as masking frames for client-to-server communication. In the base implementation, it simply encodes the buffer using the standard Codec.encode method and writes it to the connection, but subclasses can provide their own encoding logic as necessary.
     */
    protected encode(buffer: Buffer, opcode: number): Buffer {
        return Codec.encode(buffer, opcode);
    }
    /**
     * Initializes the WebSocket connection by setting up event listeners for incoming data, message assembly, and connection events.
     * This method is called after a successful handshake to start processing WebSocket frames and messages.
     * It listens for 'data' events on the socket to process incoming frames, and uses the MessageAssembler to assemble complete messages from the frames.
     * It also handles control frames (like close and ping) appropriately, emitting events for messages, errors, and connection closures as needed.
      * @remarks The method sets up a 'data' event listener on the socket to process incoming data buffers. It uses the MessageAssembler to handle the assembly of messages from frames, emitting 'message' events when complete messages are assembled. It also handles control frames such as close and ping, emitting a 'close' event when a close frame is received and responding to ping frames with pong frames. Additionally, it listens for 'close' and 'error' events on the socket to emit corresponding events for the WebSocket instance.
     */
    protected startup(): void {
        this.messaging.on('message', this.binds.messageHandler);
        this.framing.on('frame', this.binds.putFrame);
        this.connection.on('data', this.binds.putData);
        this.connection.on('close', this.binds.closeHandler);
        this.framing.on('error', this.binds.errorHandler);
        this.messaging.on('error', this.binds.errorHandler);
        this.connection.on('error', this.binds.errorHandler);
    }
    protected messageHandler(message: Message): void {
        if (message.isText || message.isBinary) {
            this.emit('message', message);
            if (message.isText) this.emit('message:text', message.payload.toString('utf-8'));
            else if (message.isBinary) this.emit('message:binary', message.payload);
        } else if (message.isClose) {
            if (this.status === 'closed') return;
            if (this.connection.writable && !this.connection.writableEnded) {
                try { this.write(message.payload, 0x8);
                } catch (error) {}
            }
            this.vMainStatus = 'closed';
            this.connection.end();
            this.emit('close');
        } else if (message.isPing) {
            this.emit('ping', message.payload);
            this.write(message.payload, 0xA);
        } else if (message.isPong) {
            this.emit('pong', message.payload);
        }
    }
    /**
     * Handles errors that occur during WebSocket communication by updating the connection status, emitting an 'error' event, sending a close frame to the peer, and ending the connection.
     * This method is designed to be called whenever an error is encountered in the WebSocket processing flow, ensuring that the connection is properly closed and that relevant error information is emitted to listeners.
     * @param error - The error object representing the issue that occurred during WebSocket communication. This error will be emitted to listeners and can be used for logging or debugging purposes.
     * @remarks When an error occurs, this method updates the internal status to 'closed', emits an 'error' event with the provided error information, sends a close frame to the peer to indicate that the connection is being closed due to an error, and ends the underlying connection. This ensures that the WebSocket connection is properly terminated in response to errors and that relevant information is available to listeners for handling or logging the error.
     */
    protected errorHandler(error: Error): void {
        this.vMainStatus = 'closed';
        this.emit('error', error);
        this.encode(Buffer.alloc(0), 0x8);
        this.connection.end();
    }
    protected closeHandler(): void {
        if (this.status === 'closed') return;
        this.vMainStatus = 'closed';
        this.emit('close');
    }
}

export namespace Websocket {
    export type EventMap = {
        message: [message: Message];
        'message:text': [message: string];
        'message:binary': [message: Buffer];
        ping: [data: Buffer];
        pong: [data: Buffer];
        error: [error: Error];
        close: [];
        open: [];
    }
    export type Status = 'handshake' | 'open' | 'closed';
    export interface DataInfo {
        opCode: number;
        size: number | bigint;
    }
    export interface PingOptions {
        timeout?: number;
        data?: Buffer | string;
    }
    export type EventBuffer = {
        [name in keyof Websocket.EventMap]?: Websocket.EventMap[name][];
    };
    export interface Binds {
        messageHandler: (message: Message) => void;
        putFrame: (frame: Frame) => void;
        putData: (data: Buffer) => void;
        errorHandler: (error: Error) => void;
        closeHandler: () => void;
    }
}
export default Websocket;