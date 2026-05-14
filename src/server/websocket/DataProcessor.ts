import { Events } from "@netfeez/common";
import Frame from "./frame/Frame.js";
import Message from "./messageAssembler/Message.js";


export class FrameAssembler extends Events<FrameAssembler.EventMap> {
    protected surplus: Buffer = Buffer.alloc(0);
    /**
     * Pushes incoming data into the assembler, handling any surplus from previous incomplete frames.
     * This method concatenates the new data with any existing surplus and then processes the combined buffer to extract complete frames, which are emitted as 'frame' events.
     * If the buffer contains incomplete frame data, it is stored in the surplus for future processing when more data arrives.
     */
    public push(chunk: Buffer): void {
        if (this.surplus.length > 0) {
            chunk = Buffer.concat([this.surplus, chunk]);
            this.surplus = Buffer.alloc(0);
        } this.processBuffer(chunk);
    }

    protected processBuffer(data: Buffer): void {
        try {
            while (data.length > 0) {
                const result = this.consume(data);
                if (!result) break;
                data = result;
            }
        } catch (error) {
            if (error instanceof Error) this.emit('error', error);
            else this.emit('error', new Error(String(error)));
        }
    }

    protected consume(data: Buffer): void | Buffer {
        try {
            const { frame, surplus } = Frame.fromBuffer(data);
            this.emit('frame', frame);
            return surplus;
        } catch (error) {
            if (!(error instanceof RangeError)) throw error;
            this.surplus = data;
            return;
        }
    }
}
export namespace FrameAssembler {
    export type EventMap = {
        frame: [frame: Frame];
        error: [error: Error];
    }
}
export default FrameAssembler;