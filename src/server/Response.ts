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

	public static readonly contentTypeMap: Response.contentTypeMap = {
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


	/** Contains the request received by the server. */
	public request: Request;

	/** Contains the list of server response templates. */
	private templates: Config['data']['templates'];

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
	public constructor(request: Request, httpResponse: HTTP.ServerResponse, templates: Config['data']['templates']) {
		this.request = request;
		this.templates = templates;
		this.httpResponse = httpResponse;

		this.httpResponse.setHeader('X-Powered-By', 'MyNetFeez-Labs Vortez');
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
        const cookieSetters = this.request.cookies.setters;
		if (cookieSetters.length > 0) headers['set-cookie'] = cookieSetters;
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
     * @throws If the file does not exist or is not accessible.
     */
    public async sendFile(path: string): Promise<void> {
        path = Path.normalize(path);
		if  (!File.exists(path)) {
			logger.warn(`&C2[Vortez Warning] File not found: &C6${path}`);
			throw new ServerError(404, 'The requested URL was not found');
        }
        const details = await FS.promises.stat(path);
        if (!details.isFile()) throw new ServerError(500, '[Response Error] - Provided path is not a file.');
        this.type(PATH.extname(path));
        if (this.vAcceptRange && this.request.headers.range) {
            const stream = this.createRangeStream(details.size, path);
            return await this.send(stream);
        }
        return await this
            .header('Content-Length', details.size.toString())
            .send(FS.createReadStream(path));
    }

	/**
	 * Sends the listing of a folder as a response.
	 * @param base - The routing rule base path.
	 * @param plus - The relative path received in the request.
	 * @throws If the folder does not exist or is invalid.
	 */
	public async sendFolder(base: string, plus: string = ''): Promise<void> {
		const basePath = Path.resolve(base);
		const path = await PathSecurity.resolveInsideBase(basePath, plus);
		if (!path) {
			logger.warn(`&C2[Vortez Security] Vortez has detected a potential Path Traversal attack:`);
			logger.warn(` &C3- IP: &C6${this.request.ip}`);
			logger.warn(` &C3- Session ID: &C6${this.request.session.id}`);
			logger.warn(` &C3- URL: &C6${this.request.url}`);
			logger.warn(` &C3- Base: &C6${basePath}`);
			logger.warn(` &C3- Intento: &C6${plus}`);
			throw new ServerError(403, 'Forbidden: Outside of sandbox');
		}
		if (!await File.exists(path)) throw new ServerError(404, 'The requested URL was not found');
		const details = await FS.promises.stat(path);
		if (details.isFile()) return await this.sendFile(path);
		if (!details.isDirectory()) throw new ServerError(404, 'The requested URL was not found');
		const folder = await FS.promises.readdir(path);
		const template = this.templates.folder ?? Path.relativeToMe(import.meta, '../../global/template/folder.vhtml');
		await this.sendTemplate(template, { Url: this.request.url, folder });
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
     * @param path - The file path of the resource.
     * @returns A readable stream for the requested range.
     * @throws If the requested range is invalid.
     */
    private createRangeStream(size: number, path: string): FS.ReadStream {
        const rangeHeader = this.request.headers.range;
        if (!rangeHeader) throw new ServerError(416, 'Requested range exceeds file size');
        const info = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
        if (!info) throw new ServerError(416, 'Requested range exceeds file size');
        const [, startString, endString] = info;
        let start: number;
        let end: number;
        if (startString && endString) {
            start = Number(startString);
            end = Number(endString);
        } else if (startString) {
            start = Number(startString);
            const maxSize = start + 1024 * 1000;
            end = maxSize >= size ? size - 1 : maxSize;
        } else if (endString) {
            const suffixSize = Number(endString);
            if (!Number.isInteger(suffixSize) || suffixSize <= 0) throw new ServerError(416, 'Requested range exceeds file size');
            start = Math.max(size - suffixSize, 0);
            end = size - 1;
        } else throw new ServerError(416, 'Requested range exceeds file size');

        if (
            !Number.isInteger(start) ||
            !Number.isInteger(end) ||
            start < 0 ||
            end < start ||
            start >= size ||
            end >= size
        ) throw new ServerError(416, 'Requested range exceeds file size');

        const length = end - start + 1;

        this.status(206)
            .header('Content-Length', length.toString())
            .header('Content-Range', `bytes ${start}-${end}/${size}`);

        return FS.createReadStream(path, { start, end });
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
		const type = Response.contentTypeMap[extension];
		return { 'Content-Type': type ?? 'application/octet-stream' };
	}
}

export namespace Response {
	export interface contentTypeMap {
		[key: string]: string | undefined;
	}

	export type data = string | Buffer | Readable | FS.ReadStream;

	export type Extensions = (
		'HTML' | 'JS' | 'CSS' | 'JSON' | 'XML' | 'TXT' |
		'SVG' | 'PNG' | 'JPG' | 'JPEG' | 'MP3' | 'WAV' | 'MP4'
	);
}

export default Response;