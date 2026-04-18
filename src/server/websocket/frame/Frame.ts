/**
 * Parser dedicado para extraer solo la cabecera de un frame WebSocket.
 * Útil para validaciones previas, handshake, o inspección rápida.
 */
import Codec from '../Codec.js';
import Header from './Header.js';

export class Frame implements Frame.Content {
    public header: Header;
    public payload: Buffer;

    public constructor(data: Frame.Content) {
        this.header = data.header;
        this.payload = data.payload;
    }

    public get isContinuation(): boolean { return this.header.opcode === 0x0; }
    public get isText(): boolean { return this.header.opcode === 0x1; }
    public get isBinary(): boolean { return this.header.opcode === 0x2; }
    public get isClose(): boolean { return this.header.opcode === 0x8; }
    public get isPing(): boolean { return this.header.opcode === 0x9; }
    public get isPong(): boolean { return this.header.opcode === 0xA; }
    public get isControl(): boolean { return this.header.opcode >= 0x8; }

    /**
     * Reads the first complete frame from a buffer and returns its surplus.
     * @throws `RangeError` If the buffer does not contain a complete frame or if the frame size exceeds supported limits.
     * Note: This method assumes that the buffer starts with a valid frame header and does not perform additional validation on the frame contents.
     */
    public static fromBuffer(buffer: Buffer): Frame.ReadResult {
        const header = Header.fromBuffer(buffer);
        const expectedSize = BigInt(header.headerSize) + BigInt(header.size);

        if (BigInt(buffer.length) < expectedSize) throw new RangeError('Incomplete frame data');
        if (expectedSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Frame size exceeds supported buffer limits');

        const chunkSize = Number(expectedSize);
        const chunk = buffer.subarray(0, chunkSize);
        const payload = Codec.decode(chunk, header.headerSize, header.maskKeys);
        const frame = new Frame({ header: header, payload });

        return {
            frame,
            chunk,
            surplus: buffer.subarray(chunkSize)
        };
    }
}

export namespace Frame {
    export interface Content {
        header: Header;
        payload: Buffer;
    }
    export interface ReadResult {
        frame: Frame;
        chunk: Buffer;
        surplus: Buffer;
    }
}

export default Frame;