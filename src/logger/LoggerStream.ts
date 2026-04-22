import { createWriteStream, WriteStream } from "node:fs";
import FS from "node:fs/promises";

import { Events } from "@netfeez/common";

import { Path } from "../utilities/Utilities.js";
import LoggerError from "./LoggerError.js";

export class LoggerStream extends Events<LoggerStream.EventMap> {
    protected vQueue: string[] = [];

    protected path: string;
    
    protected vStream: WriteStream | null = null;
    protected vIsWriting: boolean = false;

    public constructor(path: string) { super();
        this.path = Path.normalize(path);
    }
    /**
     * Checks if the writable stream is initialized and ready for writing, returning a boolean value indicating the stream's readiness status. This method ensures that the stream is not only created but also writable before allowing any write operations to proceed, providing a safeguard against potential errors when attempting to write to an uninitialized or non-writable stream.
     * @return A boolean value indicating whether the writable stream is initialized and ready for writing. Returns true if the stream is ready, and false otherwise.
     */
    public isReady(): this is { vStream: WriteStream } { 
        return !!this.vStream && this.vStream.writable; 
    }
    /**
     * Asynchronously initializes the writable stream for logging, ensuring that the stream is created and ready for writing before any data is flushed from the internal queue.
     * If the stream is already initialized and ready, it simply returns the existing stream instance.
     * This method handles the creation of the writable stream using the `create` static method, and it emits a 'startup' event once the stream is successfully initialized.
     * After emitting the event, it calls the `flush` method to ensure that any queued data is written to the stream promptly.
     * By using this method, developers can ensure that the logging stream is properly set up and ready for use before attempting to write any log data, providing a robust and efficient mechanism for managing log streams in various applications.
     */
    protected async startup(): Promise<WriteStream> {
        if (this.isReady()) return this.vStream;
        this.vStream = await LoggerStream.create(this.path);
        this.emit('startup', this.vStream);
        await this.flush();
        return this.vStream;
    }
    /**
     * Asynchronously pushes a chunk of data to the internal queue and initiates the flushing process if not already in progress, ensuring that data is written to the stream efficiently while preventing concurrent flush operations.
     * This method adds the provided chunk of data to the internal queue and checks if a flush operation is currently active. If a flush is already in progress, it simply returns without initiating another flush, allowing the existing flush operation to handle the queued data.
     * If no flush is active, it calls the `flush` method to start processing the queued data and writing it to the stream.
     * This design ensures that data is written to the stream in an orderly manner while avoiding potential issues with concurrent writes, making it a robust solution for managing asynchronous data writing to streams.
     * @param chunk - The string data to be added to the internal queue for writing to the stream.
     * @returns A promise that resolves when the chunk has been added to the queue and any necessary flushing has been initiated, or simply returns if a flush is already in progress.
     */
    public async push(chunk: string): Promise<void> {
        this.vQueue.push(chunk);
        this.emit('push', chunk);
        if (this.vIsWriting) return;
        await this.flush();
    }
    /**
     * Asynchronously flushes the internal queue of data chunks to the writable stream, ensuring that only one flush operation is active at a time to prevent concurrent writes.
     * This method checks if a flush operation is already in progress or if the queue is empty before proceeding, and it also ensures that the stream is ready before attempting to write.
     * If the stream is not ready, it initiates the startup process to create the stream and then continues with flushing the queued data. Any errors encountered during the flush process are emitted as 'error' events, allowing for robust error handling while maintaining efficient data writing to the stream.
     */
    protected async flush(): Promise<void> {
        if (this.vIsWriting) return;
        if (this.vQueue.length === 0) return;
        if (!this.isReady()) return void await this.startup();
        this.vIsWriting = true;
        try {
            while (this.vQueue.length > 0) {
                const chunk = this.vQueue.shift()!;
                await this.write(chunk);
            }
        } catch (error) {
            if (error instanceof LoggerError) throw error;
            this.emit('error', new LoggerError(LoggerError.Codes.UNKNOWN_ERROR, `An unknown error occurred while flushing the queue for file ${this.path}`, { cause: error instanceof Error ? error : undefined }));
        } finally {
            this.vIsWriting = false;
            this.emit('flush', this.vQueue.length);
            if (this.vQueue.length > 0) await this.flush();
        }
    }
    /**
     * Writes a chunk of data to the stream asynchronously, ensuring that any errors encountered during the write operation are properly emitted as 'error' events.
     * This method returns a promise that resolves once the write operation is complete, allowing for efficient handling of asynchronous writes while maintaining robust error handling and event emission for any issues that may arise during the writing process.
     * @param chunk - The string data to be written to the stream.
     * @returns A promise that resolves when the write operation is complete, or emits an 'error' event if an error occurs during the write process.
     */
    private write(chunk: string): Promise<void> {
        return new Promise((resolve) => {
            this.vStream!.write(chunk, 'utf-8', (error) => {
                if (error) this.emit('error', new LoggerError(LoggerError.Codes.WRITE_ERROR, `An unknown error occurred while writing to file ${this.path}`, { cause: error instanceof Error ? error : undefined }));
                resolve();
            });
        });
    }
    /**
     * Asynchronously creates a writable stream for the specified file path, ensuring that the necessary directory structure exists before attempting to create the stream.
     * This method handles potential errors that may arise during directory creation or stream initialization, providing informative error messages to aid in debugging.
     * By using this method, developers can easily create writable streams for logging or other purposes without worrying about the underlying file system operations, making it a convenient utility for managing file-based streams in various applications.
     * @param path - The file path for which to create the writable stream.
     * @returns A promise that resolves to a WriteStream instance for the specified file path.
     * @throws An error if the stream creation fails due to issues with directory creation or stream initialization, including details about the error and its cause.
     */
    public static async create(path: string): Promise<WriteStream> {
        const folder = Path.dirname(path);
        try {
            await FS.mkdir(folder, { recursive: true });
            return createWriteStream(path, { encoding: 'utf-8' });
        } catch (error) {
            if (error instanceof Error && 'code' in error) {
                const code = error.code === 'EACCES'
                    ? LoggerError.Codes.PERMISSION_DENIED
                    : LoggerError.Codes.UNKNOWN_ERROR;
                throw new LoggerError(code, `Failed to create Stream for file ${path}`, { cause: error });
            } else {
                throw new LoggerError(LoggerError.Codes.UNKNOWN_ERROR, `An unknown error occurred while creating Stream for file ${path}`, { cause: error instanceof Error ? error : undefined });
            }
        }
    }
}
export namespace LoggerStream {
    export type EventMap = {
        startup: [stream: WriteStream];
        error: [error: LoggerError];
        flush: [count: number];
        push: [chunk: string];
    }
}
export default LoggerStream;