/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides helper functions for mocked HTTP and WebSocket test flows.
 * @license Apache-2.0
 */
import { PassThrough } from 'stream';
import { EventEmitter } from 'events';
import PATH from 'path';
import { promises as FSP } from 'fs';
import FS from 'fs';
import { fileURLToPath } from 'url';
import type HTTP from 'http';

import Request from '../../build/server/Request.js';
import Response from '../../build/server/Response.js';

export class Helpers {
    public static readonly tempRoot = 'tests/.tmp/suite';
    public static readonly assets = 'tests/assets';
    /** Creates a mock incoming HTTP request. */
    public static createIncomingMessage(options: Helpers.IncomingMessageOptions = {}): Helpers.MockIncomingMessage {
        const {
            method = 'GET',
            url = '/',
            headers = {},
            remoteAddress = '127.0.0.1',
        } = options;

        const stream = new PassThrough();
        const request = stream as unknown as Helpers.WritableIncoming;
        request.method = method;
        request.url = url;
        request.headers = headers;
        request.socket = { remoteAddress } as unknown as Helpers.WritableIncoming['socket'];
        return request as Helpers.MockIncomingMessage;
    }
    /** Creates a mock HTTP response object. */
    public static createMockHttpResponse(): Helpers.MockHttpResponse {
        const headers: Record<string, string | number | string[]> = {};
        const events = new EventEmitter();
        const response: Helpers.MockHttpResponse = {
            statusCode: 0,
            headersSent: false,
            writableEnded: false,
            writable: true,
            destroyed: false,
            headers,
            body: '',
            setHeader(name, value) {
                headers[String(name).toLowerCase()] = value;
            },
            writeHead(status, responseHeaders = {}) {
                this.statusCode = status;
                this.headersSent = true;
                for (const [name, value] of Object.entries(responseHeaders)) {
                    headers[String(name).toLowerCase()] = value;
                }
            },
            end(data = '', encoding = 'utf8') {
                if (this.destroyed || this.writableEnded) return;
                if (Buffer.isBuffer(data)) this.body += data.toString(encoding);
                else this.body += typeof data === 'string' ? data : String(data);
                this.writableEnded = true;
                this.writable = false;
                this.emit('finish');
                this.emit('close');
            },
            write(data) {
                if (this.destroyed || this.writableEnded) return false;
                this.body += Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
                return true;
            },
            destroy(error?: Error) {
                if (this.destroyed) return this;
                this.destroyed = true;
                this.writable = false;
                if (error) this.emit('error', error);
                this.emit('close');
                return this;
            },
            on(event, listener) {
                events.on(event, listener);
                return this;
            },
            once(event, listener) {
                events.once(event, listener);
                return this;
            },
            emit(event, ...args) {
                return events.emit(event, ...args);
            },
            removeListener(event, listener) {
                events.removeListener(event, listener);
                return this;
            },
        };

        return response;
    }
    /** Creates a Request/Response pair for tests. */
    public static createResponse(
        request: Request | Helpers.MockIncomingMessage = Helpers.createIncomingMessage(),
        templates: Helpers.Templates = {
            folder: `${Helpers.assets}/template.vhtml`,
            error: `${Helpers.assets}/error.vhtml`,
        },
    ) {
        const requestObject = request instanceof Request ? request : new Request(request);
        const rawResponse = Helpers.createMockHttpResponse();
        const response = new Response(
            requestObject,
            rawResponse as unknown as HTTP.ServerResponse<HTTP.IncomingMessage>,
            templates,
        );
        return { request: requestObject, rawResponse, response };
    }
    /** Creates a mock WebSocket connection and captures writes/ends. */
    public static createWebsocketConnection() {
        const connection = new PassThrough();
        const writes: Array<string | Buffer> = [];
        const ends: Array<string | Buffer> = [];
        const originalWrite = connection.write.bind(connection);
        const originalEnd = connection.end.bind(connection);
        const mutableConnection = connection as unknown as {
            write(chunk: string | Buffer, encoding?: BufferEncoding, callback?: Helpers.ErrorCallback): boolean;
            end(chunk?: string | Buffer, encoding?: BufferEncoding, callback?: Helpers.EndCallback): PassThrough;
        };

        function invokeOriginalWrite(...args: unknown[]): boolean {
            return (originalWrite as unknown as Function)(...args) as boolean;
        }

        function invokeOriginalEnd(...args: unknown[]): PassThrough {
            return (originalEnd as unknown as Function)(...args) as PassThrough;
        }

        mutableConnection.write = function captureConnectionWrite(
            chunk: string | Buffer,
            encoding?: BufferEncoding,
            callback?: Helpers.ErrorCallback,
        ): boolean {
            writes.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : String(chunk));
            return invokeOriginalWrite(chunk, encoding ?? 'utf8', callback);
        };

        mutableConnection.end = function captureConnectionEnd(
            chunk?: string | Buffer,
            encoding?: BufferEncoding,
            callback?: Helpers.EndCallback,
        ): PassThrough {
            if (chunk !== undefined) ends.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : String(chunk));
            if (chunk === undefined) return invokeOriginalEnd(callback);
            return invokeOriginalEnd(chunk, encoding ?? 'utf8', callback);
        };

        return { connection, writes, ends };
    }
    /**
     * Ensures that the temporary directory for tests exists and is empty by removing it if it already exists and then recreating it. This is useful for providing a clean slate for tests that need to write temporary files, ensuring that previous test runs do not interfere with current tests due to leftover files or directories.
     * @returns A promise that resolves when the temporary directory has been ensured.
     */
    public static async ensureTempDir(): Promise<void> {
        await FSP.rm(Helpers.tempRoot, { recursive: true, force: true });
        await FSP.mkdir(Helpers.tempRoot, { recursive: true });
    }
    /**
     * Builds a file path within the temporary directory for tests, allowing for easy generation of paths for temporary files used in tests. This is useful for keeping test-related files organized within a designated temporary directory and avoiding conflicts with other files.
     * @param name - The name of the file to create a path for within the temporary directory.
     * @returns The full file path within the temporary directory for the specified file name.
     */
    public static buildTempPath(name: string): string {
        return PATH.join(Helpers.tempRoot, name);
    }
    /**
     * Loads the package version dynamically from package.json.
     * @returns The version string from package.json, or 'unknown' if it cannot be determined.
     */
    public static loadPackageVersion(): string {
        try {
            const currentFile = fileURLToPath(import.meta.url);
            const currentDir = PATH.dirname(currentFile);
            const packagePath = PATH.resolve(currentDir, '../../package.json');
            const raw = FS.readFileSync(packagePath, 'utf8');
            const data = JSON.parse(raw) as { version?: string };
            if (typeof data.version === 'string' && data.version.length > 0) return data.version;
        } catch {}
        return 'unknown';
    }
}

export namespace Helpers {
    export interface MockHttpResponse {
        statusCode: number;
        headersSent: boolean;
        writableEnded: boolean;
        writable: boolean;
        destroyed: boolean;
        headers: Record<string, string | number | string[]>;
        body: string;
        setHeader(name: string, value: string | number | string[]): void;
        writeHead(status: number, responseHeaders?: Record<string, string | number | string[]>): void;
        end(data?: string | Buffer, encoding?: BufferEncoding): void;
        write(data: string | Buffer): boolean;
        destroy(error?: Error): MockHttpResponse;
        on(event: string, listener: (...args: any[]) => void): MockHttpResponse;
        once(event: string, listener: (...args: any[]) => void): MockHttpResponse;
        emit(event: string, ...args: any[]): boolean;
        removeListener(event: string, listener: (...args: any[]) => void): MockHttpResponse;
    }

    export interface IncomingMessageOptions {
        method?: string;
        url?: string;
        headers?: Record<string, string>;
        remoteAddress?: string;
    }

    export interface Templates {
        folder: string;
        error: string;
    }

    export type WritableIncoming = HTTP.IncomingMessage & {
        method: string;
        url: string;
        headers: HTTP.IncomingHttpHeaders;
        socket: { remoteAddress: string };
    };

    export type MockIncomingMessage = HTTP.IncomingMessage & PassThrough;

    export interface ErrorCallback {
        (error?: Error | null): void;
    }

    export interface EndCallback {
        (): void;
    }
}

export default Helpers;
