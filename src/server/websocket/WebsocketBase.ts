/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description adds websocket functionality to Vortez
 * @license Apache-2.0
 */

import type { Duplex } from 'stream';


import { Events } from '../../utilities/Utilities.js';
import LoggerManager from '../LoggerManager.js';

import Codec from './Codec.js';
import Frame from './frame/Frame.js';
import Message from './messageAssembler/Message.js';
import MessageAssembler from './messageAssembler/MessageAssembler.js';
import { buffer } from 'stream/consumers';

const logger = LoggerManager.getInstance().webSocket;

export class WebsocketBase extends Events<WebsocketBase.EventMap> {
    protected vStatus: WebsocketBase.Status = 'handshake';

    protected readonly vEventBuffer: WebsocketBase.EventBuffer = {};
    protected vEventBuffering: boolean = true

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
        if (typeof data === 'string') return this.write(Buffer.from(data, 'utf-8'), 0x1);
        else if (data instanceof Buffer) return this.write(data, 0x2);

        const stack = new Error().stack || '';
        return logger.warn('&C3Unsupported data type for Websocket.send. Data must be a string or a Buffer.\nStack trace:\n&C0' + stack);
    }
    /**
     * Closes the WebSocket connection by sending a close frame and ending the connection. If the connection is already closed, this method does nothing.
      * - It first checks if the connection is already closed, and if so, it simply returns without performing any actions.
      * - If the connection is not closed, it updates the internal status to 'closed', sends a close frame to the peer, and ends the connection.
      * @remarks This method ensures that the WebSocket connection is properly closed by sending the appropriate close frame and terminating the connection. It also prevents any further actions from being taken on a closed connection by checking the status before attempting to close it again.
     */
    public close(): void {
        this.vStatus = 'closed';
        this.write(Buffer.alloc(0), 0x8);
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
        if (this.vStatus !== 'open') return logger.warn('&C3Attempted to send data on a WebSocket connection that is not open. Data will not be sent.');
        if (
            this.connection.writableEnded ||
            this.connection.destroyed ||
            !this.connection.writable
        ) {
            this.vStatus = 'closed';
            this.emit('close');
            const stack = new Error().stack || '';
            return logger.warn(`&C3Attempted to send data on a WebSocket connection that is already closed. Data will not be sent. ${stack}`);
        }
        const frame = this.encode(buffer, opcode);
        this.connection.write(frame);
    }
    /**
     * flush pending events. This method is used to emit any buffered events that were stored while there were no listeners for those events.
     * It checks for buffered 'message', 'message:text', 'message:binary', and 'error' events and emits them if there are listeners available.
     * Additionally, it handles re-emission of 'open' and 'close' events if they were emitted before listeners were added.
     * This ensures that all relevant events are properly emitted to listeners once they are registered, allowing for correct handling of WebSocket events in the application.
     * 
     * If you are using this class as a we client, you can use it after add your listeners.
     * 
     * If you are using this class as a web server, you can use it after routing and executed the action rule on the router o middleware exec (vortez context).
     * 
     * Here in **Vortez**, the WebsocketSSInit instance is created in the router on receive upgrade request.
     * Before it is executed the middleware stack -> executed the action rule on the router and automatically is called flush() method to emit the buffered events.
     * we are sure that the events will be received with your instance of Websocket on server side if you use `vortez`
     * 
     * If you are using the class as a client ``WebsocketCSInit`` or out of Vortez, you can call it after add your listeners to make sure that you will receive the events emitted during the handshake phase.
     * @remarks This method is essential for ensuring that all relevant events are emitted to listeners, especially in cases where events may have been emitted before listeners were registered. By calling this method after adding listeners, you can ensure that any buffered events are properly emitted and handled by the listeners, allowing for correct functionality of the WebSocket connection in your application.
     */
    public flush(): void {
        this.vEventBuffering = false;
        const is = <T extends string>(name: T): name is T & keyof WebsocketBase.EventMap => { return name in this.vEventBuffer; };
        for (const name in this.vEventBuffer) {
            if (!is(name)) continue;
            const buffer = this.vEventBuffer[name] ?? [];
            for (const args of buffer) super.emit(name, ...args);
            delete this.vEventBuffer[name];
        }
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
        this.assembler.on('message', (message: Message) => {
            if (message.isText || message.isBinary) {
                this.emit('message', message);
                if (message.isText) this.emit('message:text', message.payload.toString('utf-8'));
                else if (message.isBinary) this.emit('message:binary', message.payload);
            } else if (message.isClose) {
                if (this.vStatus === 'closed') return;
                if (this.connection.writable && !this.connection.writableEnded) {
                    try { this.encode(message.payload, 0x8);
                    } catch (error) {}
                }
                this.vStatus = 'closed';
                this.connection.end();
                this.emit('close');
            } else if (message.isPing) {
                this.encode(message.payload, 0xA);
            }
        });
        this.assembler.on('error', (error) => {
            this.vStatus = 'closed';
            this.emit('error', error);
            this.encode(Buffer.alloc(0), 0x8);
            this.connection.end();
        });
        this.connection.on('data', (data: Buffer) => {
            if (this.surplus.length > 0) {
                data = Buffer.concat([this.surplus, data]);
                this.surplus = Buffer.alloc(0);
            } this.processBuffer(data);
        });
        this.connection.on('close', () => {
            this.vStatus = 'closed';
            this.emit('close');
        });
        this.connection.on('error', this.emit.bind(this, 'error'));
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
    /**
     * Middleware for emitting events. It handles buffering of messages and errors when there are no listeners, and re-emits 'open' and 'close' events if they were emitted before listeners were added.
     * This method overrides the base emit method to provide additional functionality specific to WebSocket event handling, such as buffering messages and errors until listeners are available, and ensuring that 'open' and 'close' events are emitted appropriately based on the connection status and listener presence.
     * @param event - The event to be emitted, which includes the event name and any associated arguments. The method processes the event based on its type and manages buffering and re-emission logic as needed.
     */
    protected override emit<E extends string & keyof WebsocketBase.EventMap>(...event: [name: E, ...args: WebsocketBase.EventMap[E]]): void {
        if (!this.vEventBuffering) return super.emit(...event);
        const [name, ...args] = event;
        if (this.vEventBuffering && this.eventCount(name) === 0) {
            this.vEventBuffer[name] = this.vEventBuffer[name] ?? [];
            this.vEventBuffer[name].push(args);
        } else super.emit(...event);
    }
}
export namespace WebsocketBase {
    export type EventMap = {
        message: [message: Message];
        'message:text': [message: string];
        'message:binary': [message: Buffer];
        error: [error: Error];
        close: [];
        open: [];
    }
    export type Status = 'handshake' | 'open' | 'closed';
    export interface dataInfo {
        opCode: number;
        size: number | bigint;
    }
    export type EventBuffer = {
        [name in keyof WebsocketBase.EventMap]?: WebsocketBase.EventMap[name][];
    };
}
export default WebsocketBase;