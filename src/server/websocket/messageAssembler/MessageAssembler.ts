import { Events } from '@netfeez/common';

import Frame from '../frame/Frame.js';
import Message from './Message.js';

export class MessageAssembler extends Events<MessageAssembler.EventMap> {
    private frames: Frame[] = [];
    /**
     * Pushes a frame into the assembler and attempts to assemble a complete message if the frame indicates the end of a message (FIN flag is set).
     * Control frames are processed immediately, while data frames are accumulated until a complete message can be formed.
     * 
     * @param frame - The frame to be pushed into the assembler for processing.
     */
    public push(frame: Frame): void {
        if (frame.isControl) {
            if (!frame.header.fin) return this.emit('error', new Error('Control frames must not be fragmented'));
            const message = new Message([frame]);
            return this.emit('message', message);
        }
        if (this.frames.length > 0 && !frame.isContinuation) {
            this.reset();
            this.emit('error', new Error('Protocol Error: Expected continuation frame (0x0).'));
            return;
        }
        if (this.frames.length === 0 && frame.isContinuation) {
            this.emit('error', new Error('Protocol Error: Unexpected continuation frame.'));
            return;
        }
        this.frames.push(frame);
        if (frame.header.fin) {
            try {
                const message = new Message(this.frames);
                this.frames = [];
                this.emit('message', message);
            } catch (error) {
                this.reset();
                this.emit('error', error instanceof Error ? error : new Error(String(error)));
            }
        }
    }
    /**
     * Resets the assembler by clearing any stored frames.
     * This is typically used to discard incomplete message data after an error is encountered, ensuring that subsequent messages are processed cleanly without interference from previous state.
     */
    public reset(): void { this.frames = []; }
}
export namespace MessageAssembler {
    export type EventMap = {
        message: [message: Message];
        error: [error: Error];
    }
}
export default MessageAssembler;
