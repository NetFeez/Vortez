/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds the response format to `Vortez`.
 * @license Apache-2.0
 */

import { CLIENT } from '../support/symbols.js';

import HTTP from 'node:http';
import FS from 'node:fs';
import PATH from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { File, Path } from '@netfeez/common-node';
import { Logger } from "@netfeez/vterm";

import Request from './Request.js';
import Template from '../Template/Template.js';
import Config from './config/Config.js';
import PathSecurity from './security/PathSecurity.js';
import ServerError from './ServerError.js';

const logger = new Logger({ name: 'Response' });

export class Response {
    public readonly [CLIENT.HTTP] = true;

    /** The version of the Vortez server. */
    private static readonly version = Response.loadVersion();

	public static readonly ContentTypeMap: Response.ContentTypeMap = {
		'html': 'text/html',
		'js':   'text/javascript',
		'css':  'text/css',
		'json': 'application/json',
		'xml':  'application/xml',
		'txt':  'text/plain',
		'svg':  'image/svg+xml',
		'png':  'image/png',
		'jpg':  'image/jpeg',
		'jpeg': 'image/jpeg',
		'mp3':  'audio/mpeg',
		'wav':  'audio/x-wav',
		'mp4':  'video/mp4',
	};

	/** Contains the response to be sent by the server. */
	public httpResponse: HTTP.ServerResponse;

	/** Contains the HTTP status code of the response. */
	private vStatus: number = 200;

	/** Contains the headers of the response. */
	private vHeaders: HTTP.OutgoingHttpHeaders = {};

	/** Contains the encoding used for the response. */
	private vEncode: BufferEncoding = 'utf-8';

    /** Indicates whether byte range requests are enabled. */
    private vAcceptRange: boolean = false;

	/** Indicates whether the response has been sent. */
	private vIsSent: boolean = false;

	/**
	 * Creates the `NetFeez-Labs/Server` response format.
	 * @param request - The request received by the server.
	 * @param httpResponse - The response to be sent by the server.
	 * @param templates - The list of server response templates.
	 */
	public constructor(httpResponse: HTTP.ServerResponse) {
		this.httpResponse = httpResponse;
		this.httpResponse.setHeader('X-Powered-By', 'Vortez');
		this.httpResponse.setHeader('X-Version', Response.version);
	}

	/** Checks if the response has been sent. */
	public get isSent(): boolean {
		return this.vIsSent || this.httpResponse.writableEnded;
	}

    /** Checks if the response headers have been sent. */
    public get isHeadersSent(): boolean {
        return this.httpResponse.headersSent;
    }

	/**
	 * Sets the HTTP status code of the response.
	 * @param code - The HTTP status code.
	 * @returns The current response instance.
	 */
	public status(code: number): this {
        if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot set status after headers are sent.'); return this; }
		this.vStatus = code;
		return this;
	}

	/**
	 * Sets a response header.
	 * @param name - The name of the header.
	 * @param value - The value of the header.
	 * @returns The current response instance.
	 */
	public header<Name extends keyof HTTP.OutgoingHttpHeaders>(name: Name, value: HTTP.OutgoingHttpHeaders[Name]): this {
		if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot set header after headers are sent.'); return this; }
		this.vHeaders[name] = value;
		return this;
	}

	/**
	 * Sets multiple response headers.
	 * @param headers - The headers to add to the response.
	 * @returns The current response instance.
	 */
	public headers(headers: HTTP.OutgoingHttpHeaders): this {
		if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot set headers after headers are sent.'); return this; }
		Object.assign(this.vHeaders, headers);
		return this;
	}

	/**
	 * Sets a cookie in the response.
	 * @param name - The name of the cookie.
	 * @param value - The value of the cookie. If `null`, the cookie will be deleted.
	 * @param options - Optional cookie settings.
	 * @returns The current response instance.
	 * @remarks Value can be `null` to delete the cookie. Options can include `domain`, `expires`, `httpOnly`, `path`, `sameSite`, `maxAge`, and `secure`.
	 */
	public cookie(name: string, value: string | null = null, options: Response.CookieOptions = {}): this {
		this.cookies({ name, value, options });
		return this;
	}

	/**
	 * Sets multiple cookies in the response.
	 * @param cookies - An array of cookie objects to set.
	 * @returns The current response instance.
	 * @remarks Each cookie object should have `name`, `value`, and optional `options`. value can be `null` to delete the cookie. Options can include `domain`, `expires`, `httpOnly`, `path`, `sameSite`, `maxAge`, and `secure`.
	 */
	public cookies(...cookies: Response.Cookie[]): this {
		if (!this.vHeaders['set-cookie']) this.vHeaders['set-cookie'] = [];
		if (!Array.isArray(this.vHeaders['set-cookie'])) this.vHeaders['set-cookie'] = [this.vHeaders['set-cookie']];
		for (const cookie of cookies) {
			const cookieString = this.cookieString(cookie.name, cookie.value, cookie.options ?? {});
			this.vHeaders['set-cookie'].push(cookieString);
		}
		return this;
	}

	/**
	 * Sets the encoding used for the response.
	 * @param encode - The encoding used for the response.
	 * @returns The current response instance.
	 */
	public encode(encode: BufferEncoding): this {
        if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot set encoding after headers are sent.'); return this; }
		this.vEncode = encode;
		return this;
	}

	/**
	 * Sets the content type using a supported file extension.
	 * @param extension - The file extension.
	 * @returns The current response instance.
	 */
	public type(extension: string): this {
        if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot set content type after headers are sent.'); return this; }
        const headers = Response.generateHeaders(extension);
		return this.headers(headers);
	}

    /**
     * Enables byte range requests for the response.
     * @returns The current response instance.
     */
    public acceptRange(): this {
        if (this.isHeadersSent) { logger.warn('[Response Warning] - Cannot enable byte range after headers are sent.'); return this; }
	    this.vAcceptRange = true;
        return this.header('Accept-Ranges', 'bytes');
    }

	/** Sends response headers. */
	private sendHeaders(): this {
        if (this.isHeadersSent) { logger.warn('[Response Warning] - Headers have already been sent.'); return this; }
		const headers: HTTP.OutgoingHttpHeaders = { ...this.vHeaders };
		this.httpResponse.writeHead(this.vStatus, headers);
        return this;
	}

	/**
	 * Sends data as a response.
	 * @param data - The data to be sent.
	 */
	public async send(data: Response.data): Promise<void> {
		if (this.isSent) return logger.warn('[Response Warning] - Response has already been sent.');
		if (data instanceof Readable) return await this.sendReadable(data);
		if (!this.isHeadersSent) {
            if (!('content-type' in this.vHeaders || 'Content-Type' in this.vHeaders)) this.type('txt');
            this.sendHeaders();
        }
		this.vIsSent = true;
		try { await this.httpResponse.end(data, this.vEncode); }
        catch (error) {
			if (this.isClientAbortError(error)) return;
			throw error;
		}
	}

	/**
	 * Sends a readable stream as a response.
	 * @param data - The readable stream to be sent.
	 * @throws If an error occurs while sending the stream.
	 * @returns A promise that resolves when the stream has been sent.
	 * @remarks This method is used for sending large data, such as files, without loading them entirely into memory.
	 * It handles backpressure and ensures efficient streaming of data to the client.
	 */
	private async sendReadable(data: Readable): Promise<void> {
		if (this.isSent) return;
		if (!this.isHeadersSent) {
            if (!('content-type' in this.vHeaders || 'Content-Type' in this.vHeaders)) this.type('txt');
            this.sendHeaders();
		}
		this.vIsSent = true;
		try { await pipeline(data, this.httpResponse); }
        catch (error) {
			if (this.isClientAbortError(error)) return;
			throw error;
		}
	}

	/**
     * Sends a file as a response.
     * @param path - The file path to send.
     * @param range - Optional custom range object or string range.
     * @throws If the file does not exist or is not accessible.
     */
    public async sendFile(path: string, range?: Partial<Response.Range> | string): Promise<void> {
        path = Path.normalize(path);
        const details = await FS.promises.stat(path);
        if (!details.isFile()) throw new ServerError(500, '[Response Error] - Provided path is not a file.');
        this.type(PATH.extname(path));
        if (this.vAcceptRange && range) {
            const stream = this.createRangeStream(details.size, range, path);
            return await this.send(stream);
        }
        return await this
            .header('Content-Length', details.size.toString())
            .send(FS.createReadStream(path));
    }

	/**
	 * Sends a `.vhtml` template as a response.
	 * @param path - The template file path.
	 * @param data - The data to compile the template with.
	 * @throws If the template cannot be loaded.
	 */
	public async sendTemplate(path: string, data: object): Promise<void> {
		path = Path.normalize(path);
		const template = await Template.stream(path, data);
		return await this
			.type('html')
			.send(template);
	}

	/**
	 * Sends data in JSON format.
	 * @param data - The data to send.
	 */
	public async sendJson(data: any): Promise<void> {
		const json = JSON.stringify(data);
		return await this
			.type('json')
			.send(json);
	}

	/**
	 * Sends an error as a response.
	 * @param status - The HTTP status code of the error.
	 * @param message - The error message.
	 * @throws A `ServerError` with the provided status and message.
	 */
	public async sendError(status: number, message: string): Promise<void> {
		throw new ServerError(status, message);
	}

	/**
	 * Creates a cookie string for the given parameters.
	 * @param name - The name of the cookie.
	 * @param value - The value of the cookie.
	 * @param options - The cookie options.
	 * @returns The cookie string.
	 */
	private cookieString(name: string, value: string | null, options: Response.CookieOptions): string {
		if (value === null) {
			const { domain, path } = options;
			return `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0${domain ? `; Domain=${domain}` : ''}${path ? `; Path=${path}` : ''}`;
		} else {
			const { domain, expires, httpOnly, maxAge, path, sameSite, secure } = options;
			let setter = `${name}=${value}`;
			if (domain)   setter += `; Domain=${domain}`;
			if (expires)  setter += `; Expires=${expires.toUTCString()}`;
			if (httpOnly) setter += '; HttpOnly';
			if (maxAge)   setter += `; Max-Age=${maxAge}`;
			if (path)     setter += `; Path=${path}`;
			if (sameSite) setter += `; SameSite=${sameSite}`;
			if (secure)   setter += '; Secure';
			return setter;
		}
	}

	/**
	 * Checks if the provided error is a client abort error.
	 * @param error - The error to check.
	 * @returns True if the error is a client abort error, false otherwise.
	 * @remarks This method checks for specific error codes and names that indicate a client has aborted the request.
	 * It is used to handle cases where the client disconnects before the server can complete sending the response.
	 */
	private isClientAbortError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		if ('code' in error && typeof error.code === 'string') return (
            error.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
            error.code === 'ECONNRESET' ||
            error.code === 'EPIPE' ||
            error.code === 'ABORT_ERR'
        );
		return error.name === 'AbortError';
	}

	/**
     * Applies the requested byte range to the response.
     * @param size - The total size of the resource.
     * @param range - Range object or raw range header string (e.g. "bytes=0-1023").
     * @param path - The file path of the resource.
     * @returns A readable stream for the requested range.
     * @throws If the requested range is invalid.
     */
    private createRangeStream(size: number, range: Partial<Response.Range> | string, path: string): FS.ReadStream {
        const { start, end } = this.normalizeRange(range, size);
        if (start < 0 || end < start || start >= size || end >= size) throw new ServerError(416, 'Requested range exceeds file size');
        const length = end - start + 1;
        this.status(206)
            .header('Content-Length', length.toString())
            .header('Content-Range', `bytes ${start}-${end}/${size}`);
        return FS.createReadStream(path, { start, end });
    }

	/**
	 * Normalizes a range object or string into a valid range with start and end values.
	 * @param range - The range object or string to normalize.
	 * @param totalSize - The total size of the resource.
	 * @returns A normalized range object with start and end values.
	 * @throws If the range is invalid or cannot be normalized.
	 * @remarks This method supports both string ranges (e.g., "bytes=0-1023") and partial range objects.
	 * It ensures that the start and end values are within valid bounds based on the total size of the resource.
	 */
	private normalizeRange(range: Partial<Response.Range> | string, totalSize: number): Response.Range {
        let start: number | undefined;
        let end: number | undefined;

        if (typeof range === 'string') {
            const matches = range.replace(/bytes=/i, '').trim().split('-');
            if (matches.length === 2) {
                start = matches[0] ? parseInt(matches[0], 10) : undefined;
                end = matches[1] ? parseInt(matches[1], 10) : undefined;
            }
        } else if (typeof range === 'object' && range !== null) {
            start = 'start' in range ? range.start : undefined;
            end = 'end' in range ? range.end : undefined;
        }

        if (start !== undefined && end === undefined) {
            end = totalSize - 1;
        } else if (start === undefined && end !== undefined) {
            start = Math.max(0, totalSize - end);
            end = totalSize - 1;
        }
        if (start === undefined || end === undefined || Number.isNaN(start) || Number.isNaN(end)) throw new ServerError(400, 'Invalid range');
        return { start, end };
    }

	/**
	 * Loads the server version from the environment variable or `package.json` file.
	 * @returns The server version as a string.
	 * @remarks This method first checks for the `npm_package_version` environment variable, which is automatically set by npm when running scripts.
	 * If it's not available, it attempts to read the `package.json` file to extract the version.
	 * If both fail, it returns 'unknown'.
	 */
	private static loadVersion(): string {
		const envVersion = process.env.npm_package_version;
		if (envVersion) return envVersion;
		try {
			const packagePath = Path.relativeToMe(import.meta, '../../package.json');
			const raw = FS.readFileSync(packagePath, 'utf8');
			const data: { version?: string } = JSON.parse(raw);

			if (typeof data.version === 'string' && data.version.length > 0) return data.version;
		} catch {}
		return 'unknown';
	}
    

	/**
	 * Generates headers for supported file types.
	 * More types will be supported over time.
	 * @param extension - The file extension.
	 */
	public static generateHeaders(extension: string): HTTP.OutgoingHttpHeaders {
		extension = extension.startsWith('.') ? extension.slice(1) : extension;
		extension = extension.toLowerCase();
		const type = Response.ContentTypeMap[extension];
		return { 'Content-Type': type ?? 'application/octet-stream' };
	}
}

export namespace Response {
	export interface Range {
		start: number;
		end: number;
	}
	export interface Cookie {
		name: string;
		value: string | null;
		options?: Response.CookieOptions;
	}
	export interface CookieOptions {
        domain?: string;
        expires?: Date;
        httpOnly?: boolean;
        path?: string;
        sameSite?: 'strict' | 'lax' | 'none';
        maxAge?: number;
        secure?: boolean;
	}

	export interface ContentTypeMap {
		[key: string]: string | undefined;
	}

	export type data = string | Buffer | Readable | FS.ReadStream;

	export type Extensions = (
		'HTML' | 'JS' | 'CSS' | 'JSON' | 'XML' | 'TXT' |
		'SVG' | 'PNG' | 'JPG' | 'JPEG' | 'MP3' | 'WAV' | 'MP4'
	);
}

export default Response;