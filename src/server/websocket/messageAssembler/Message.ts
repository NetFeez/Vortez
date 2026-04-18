import type Frame from '../frame/Frame.js';
import Codec from '../Codec.js';

export class Message {
    public readonly frames: Frame[];
    public readonly opcode: number;
    public readonly payload: Buffer;

    constructor(frames: Frame[]) {
        if (frames.length === 0) throw new Error('No frames to assemble message');
        this.frames = frames;
        this.opcode = frames[0].header.opcode;
        this.payload = Buffer.concat(frames.map(frame => frame.payload));
    }
    public get isText(): boolean { return this.opcode === 0x1; }
    public get isBinary(): boolean { return this.opcode === 0x2; }
    public get isClose(): boolean { return this.opcode === 0x8; }
    public get isPing(): boolean { return this.opcode === 0x9; }
    public get isPong(): boolean { return this.opcode === 0xA; }
    public get isControl(): boolean { return this.opcode >= 0x8; }
}
export namespace Message {
    export type Role = 'server' | 'client';
    export interface Message {
        opcode: number;
        payload: Buffer;
    }
}
export default Message;
