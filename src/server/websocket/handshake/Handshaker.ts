import { Events } from '@netfeez/common';

import LoggerManager from '../../LoggerManager.js';

const logger = LoggerManager.getInstance().webSocket;

export class Handshaker extends Events<Handshaker.EventMap> {
    private vOverflow: Buffer = Buffer.alloc(0);
    private vStatus: Handshaker.Status = 'handshake';
    private vFinished = false;

    public get status(): Handshaker.Status { return this.vStatus; }
    public get finished(): boolean { return this.vFinished; }
    /**
     * consumes and returns the current overflow buffer, which contains any unprocessed data received during the handshake process.
     * After calling this getter, the internal overflow buffer is cleared, ensuring that subsequent calls will only return new data that has been added since the last retrieval.
     * This allows for efficient handling of any excess data that may have been received during the handshake, while also preventing duplicate processing of previously retrieved data.
     */
    public get overflow(): Buffer {
        const overflow = this.vOverflow;
        this.vOverflow = Buffer.alloc(0);
        return overflow;
    }
    /**
     * Adds data to the internal overflow buffer, which is used to store any extra data received during the handshake process that has not yet been processed. This method is typically called when a chunk of data is received that contains more than just the handshake response, allowing the excess data to be stored for later processing once the handshake is complete.
     * @param data - The buffer containing the data to be added to the overflow buffer. This data will be concatenated with any existing data in the overflow buffer, ensuring that all unprocessed data is retained until it can be handled appropriately after the handshake process is finished.
     */
    protected set overflow(data: Buffer) { this.vOverflow = Buffer.concat([this.vOverflow, data]); }
    /**
     * Marks the handshake process as finished by updating the internal status and emitting a 'finish' event with the final status of the handshake. This method should be called once the handshake process is complete, whether it was successful (status 'open') or failed (status 'closed').
     * @param status - The final status of the handshake, which should be either 'open' if the handshake was successful or 'closed' if it failed.
     * @param error - An optional error object if the handshake failed.
     */
    protected finish(status: Handshaker.Status, error?: Error): void {
        logger.debug(`[${this.constructor.name}] Handshaker finish called with status: ${status}, error: ${error?.message || 'none'}`);
        if (this.vFinished) return;
        this.vFinished = true;
        this.vStatus = status;
        setImmediate(() => this.emit('finish', status));
        if (error) { this.emit('error', error); }
    }
}

export namespace Handshaker {
    export type Status = 'handshake' | 'open' | 'closed';
    export type EventMap = {
        finish: [status: Status];
        error: [error: Error];
    }
}

export default Handshaker;
