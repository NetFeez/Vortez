/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds the response format to `Vortez`.
 * @license Apache-2.0
 */

import HTTP from 'http';
import FS from 'fs';
import PATH from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { File, Path } from '@netfeez/common-node';
import { Logger } from "@netfeez/vterm";

import Request from './Request.js';
import Template from '../Template/Template.js';
import Config from './config/Config.js';
import PathSecurity from './security/PathSecurity.js';

const logger = new Logger({ name: 'Response' });

export class Response {
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
	public static readonly acceptRangeFormats = [
		'svg', 'png', 'jpg', 'jpeg', 'mp3', 'wav', 'mp4'
	];
	private static readonly version = Response.loadVersion();
	/** Contains the request received by the server. */
	public request: Request;
	/** Contains the list of server response templates. */
	private templates: Config['data']['templates'];
	/** Contains the response to be sent by the server. */
	public httpResponse: HTTP.ServerResponse;
	private _isSended: boolean = false;
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
	public get isSent(): boolean { return this._isSended || this.httpResponse.writableEnded || this.httpResponse.headersSent; }
	/**
	 * Generates headers for supported file types.
	 * More types will be supported over time.
	 * @param extension - The file extension.
	 */
	public generateHeaders(extension: string): HTTP.OutgoingHttpHeaders {
		extension = extension.startsWith('.') ? extension.slice(1) : extension;
        extension = extension.toLowerCase();
		const headers: HTTP.OutgoingHttpHeaders = {};
		const type = Response.contentTypeMap[extension];
		if (type) headers['Content-Type'] = type ?? 'application/octet-stream';
		if (Response.acceptRangeFormats.includes(extension)) {
            headers['Accept-Ranges'] = 'bytes';
        }
		return headers;
	}
	/**
	 * Sends response headers.
	 * @param code - The HTTP status code.
	 * @param headers - The headers to send.
	 */
	private sendHeaders(code: number, headers: HTTP.OutgoingHttpHeaders): void {
		const cookieSetters = this.request.cookies.setters;
		if (cookieSetters.length > 0) headers['set-cookie'] = cookieSetters;
		this.httpResponse.writeHead(code, headers);
	}
	/**
	 * Sends data as a response.
	 * @param data - The data to be sent.
	 * @param encode - The encoding used for the response.
	 */
	public async send(data: Response.data, options: Response.options = {}): Promise<void>  {
		if (data instanceof Readable) return await this.sendReadable(data, options);

		const status = options.status ?? 200;
		const encode = options.encode || 'utf-8';
		const headers = options.headers || this.generateHeaders('txt');

		this.sendHeaders(status, headers);
		this._isSended = true;

		try { await this.httpResponse.end(data, encode); }
		catch (error) { logger.error(`&C1Error &C6sending data &C1${this.request.session.id}`, error); }
	}
	/**
	 * Sends a readable stream as a response.
	 * @param data - The readable stream to be sent.
	 * @param options - The response options.
	 * @throws If an error occurs while sending the stream.
	 * @returns A promise that resolves when the stream has been sent.
	 * @remarks This method is used for sending large data, such as files or templates, without loading them entirely into memory.
	 * It handles backpressure and ensures efficient streaming of data to the client.
	 */
	private async sendReadable(data: Readable, options: Response.options): Promise<void> {
		const status = options.status ?? 200;
		const headers = options.headers || this.generateHeaders('txt');

		this.sendHeaders(status, headers);
		this._isSended = true;

		try { await pipeline(data, this.httpResponse); }
		catch (error) {
			if (this.isClientAbortError(error)) return;
			logger.error(`&C1error &C6sending stream &C1${this.request.session.id}`, error);
		}
	}
	/**
	 * Sends a file as a response.
	 * @param path - The file path to send.
	 * @param options - The response options.
	 * @throws If the file does not exist or is not accessible.
	 */
	public async sendFile(path: string, options: Response.options = {}): Promise<void>  {
		path = Path.normalize(path);
        try {
            const details = await FS.promises.stat(path);
            if (!details.isFile()) return await this.sendError(500, '[Response Error] - Provided path is not a file.');
            if (!this.request.headers.range) {
                const stream = FS.createReadStream(path);
				const headers = this.generateHeaders(PATH.extname(path));
				headers['content-length'] = details.size.toString();
				await this.send(stream, { status: 200, headers });
            } else {
				const rangeHeader = this.request.headers.range;
				const info = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
				if (!info) return await this.sendError(416, 'Requested range exceeds file size');

				const [, startString, endString] = info;
				let start: number;
				let end: number;

				if (startString && endString) {
					start = Number(startString);
					end = Number(endString);
				} else if (startString) {
					start = Number(startString);
					const maxSize = start + 1024 * 1000;
					end = maxSize >= details.size ? details.size - 1 : maxSize;
				} else if (endString) {
					const suffixSize = Number(endString);
					if (!Number.isInteger(suffixSize) || suffixSize <= 0) {
						return await this.sendError(416, 'Requested range exceeds file size');
					}
					start = Math.max(details.size - suffixSize, 0);
					end = details.size - 1;
				} else return await this.sendError(416, 'Requested range exceeds file size');

				if (
					!Number.isInteger(start) ||
					!Number.isInteger(end) ||
					start < 0 ||
					end < start ||
					start >= details.size ||
					end >= details.size
				) return await this.sendError(416, 'Requested range exceeds file size');
				
				const size = end - start + 1;
				const stream = FS.createReadStream(path, { start, end });
				const headers = this.generateHeaders(PATH.extname(path));
				headers['content-length'] = size.toString();
				headers['content-range'] = `bytes ${start}-${end}/${details.size}`;
				await this.send(stream, { status: 206, headers });
            }
		} catch(error) { await this.catchError(error, 'sending file'); }
	}
	/**
	 * Sends the listing of a folder as a response.
	 * @param base - The routing rule base path.
	 * @param plus - The relative path received in the request.
	 * @throws If the folder does not exist or is invalid.
	 */
	public async sendFolder(base: string, plus: string = ''): Promise<void> {
		const basePath = Path.resolve(base || Path.rootDir);
		const path = await PathSecurity.resolveInsideBase(basePath, plus);

		if (!path) {
			logger.warn(`&C2[Vortez Security] &C3Intento de Path Traversal bloqueado:`);
			logger.warn(` &C3- IP: &C6${this.request.ip}`);
			logger.warn(` &C3- Session ID: &C6${this.request.session.id}`);
			logger.warn(` &C3- URL: &C6${this.request.url}`);
			logger.warn(` &C3- Base: &C6${basePath}`);
			logger.warn(` &C3- Intento: &C6${plus}`);
			return void await this.sendError(403, 'Forbidden: Outside of sandbox');
		}
		
        try {
			if (!await File.exists(path)) return void await this.sendError(404, 'The requested URL was not found');
            const details = await FS.promises.stat(path);
            if (details.isFile()) return await this.sendFile(path);
			if (!details.isDirectory()) return await this.sendError(404, 'The requested URL was not found');
            const folder = await FS.promises.readdir(path);
            if (this.templates.folder) {
                await this.sendTemplate(this.templates.folder, {
                    Url: this.request.url,
                    folder
                });
            } else {
				await this.sendTemplate(Path.module('global/template/folder.vhtml'), {
                    Url: this.request.url,
                    folder
                });
            }
		} catch(error) { await this.catchError(error, 'sending folder');}
	}
	/**
	 * Sends a `.vhtml` template as a response.
	 * @param path - The template file path.
	 * @param data - The data to compile the template with.
	 * @param options - The response options.
	 * @throws If the template cannot be loaded.
	 */
	public async sendTemplate(path: string, data: object, options: Response.options = {}): Promise<void> {
		path = Path.normalize(path);
        try {
            const template = await Template.stream(path, data);
			const status = options.status ?? 200;
			const headers = options.headers || this.generateHeaders('html');
			await this.send(template, { status, headers, encode: options.encode });
		} catch(error) { await this.catchError(error, 'sending template'); }
	}
	/**
	 * Sends data in JSON format.
	 * @param data - The data to send.
	 * @param options - The response options.
	 */
	public async sendJson(data: any, options: Response.options = {}): Promise<void> {
		try {
			const json = JSON.stringify(data);
			const status = options.status ?? 200;
			const headers = options.headers || this.generateHeaders('json');
			await this.send(json, { status, headers });
		} catch(error) { await this.catchError(error, 'sending JSON');	 }
    }
	/**
	 * Sends an error as a response.
	 * @param status - The HTTP status code of the error.
	 * @param message - The error message.
	 */
	public async sendError(status: number, message: string): Promise<void> {
        try {
            if (this.templates.error) return await this.sendTemplate(this.templates.error, { status, message }, { status });
            else await this.sendTemplate(Path.module('global/template/error.vhtml'), { status, message }, { status });
        } catch(error) {
			logger.error(`error sending error: ${this.request.session.id}`, error);
			await this.sendPlainError(status, message);
		}
	}
	/**
	 * Sends a minimal plain-text error response without using templates.
	 * @param status - The HTTP status code of the error.
	 * @param message - The error message.
	 */
	private async sendPlainError(status: number, message: string): Promise<void> {
		if (this.isSent) return;
		try {
			const headers = this.generateHeaders('txt');
			this.sendHeaders(status, headers);
			this._isSended = true;
			await this.httpResponse.end(`Error: ${status} -> ${message}`, 'utf-8');
		} catch (error) { logger.error(`error sending plain error: ${this.request.session.id}`, error); }
	}
	/**
	 * Handles errors that occur during file sending operations.
	 * @param error - The error that occurred.
	 * @param doing - A description of the operation being performed when the error occurred (e.g., "sending file", "sending folder").
	 * @returns A promise that resolves when the error response has been sent.
	 * @remarks This method logs the error and sends an appropriate error response to the client based on the type of error encountered.
	 * It uses the `getErrorStatus` and `getErrorMessage` methods to determine the correct HTTP status code and error message to send in the response.
	 */
	private async catchError(error: unknown, doing: string): Promise<void> {
		if (this.isClientAbortError(error)) return;
		logger.error(`&C1Error &C6${doing} &C1${this.request.session.id}`, error);
		if (this.isSent) return;
		const status = Response.getErrorStatus(error);
		const message = Response.getErrorMessage(status);
		await this.sendError(status, message);
	}
	/**
	 * Determines the appropriate HTTP status code based on a filesystem error.
	 * @param error - The error object to evaluate.
	 * @returns The corresponding HTTP status code for the error.
	 * @remarks This method checks for common filesystem error codes such as 'ENOENT' (file not found), 'ENOTDIR' (not a directory), 'EACCES' (permission denied), and 'EPERM' (operation not permitted).
	 * It returns 404 for not found errors, 403 for permission errors, and defaults to 500 for other types of errors.
	 */
	private static getErrorStatus(error: unknown): number {
		if (!(error instanceof Error)) return 500;
		if (!('code' in error) || typeof error.code !== 'string') return 500;
		if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return 404;
		if (error.code === 'EACCES' || error.code === 'EPERM') return 403;
		return 500;
	}
	/**
	 * Returns a user-friendly error message based on the HTTP status code.
	 * @param status - The HTTP status code for which to get the error message.
	 * @returns A string containing the error message corresponding to the provided status code.
	 * @remarks This method provides specific messages for common error codes such as 403 (Forbidden) and 404 (Not Found), while returning a generic message for other unexpected errors.
	 */
	private static getErrorMessage(status: number): string {
		switch (status) {
			case 403: return 'Access denied to requested resource';
			case 404: return 'The requested URL was not found';
			default: return 'An unexpected error occurred';
		}
	 }

	private isClientAbortError(error: unknown): boolean {
		if (!(error instanceof Error)) return false;
		if ('code' in error && typeof error.code === 'string') {
			return error.code === 'ERR_STREAM_PREMATURE_CLOSE' || error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.code === 'ABORT_ERR';
		}
		return error.name === 'AbortError';
	}
	/**
	 * Loads the server version from the environment variable or `package.json` file.
	 * @returns The server version as a string.
	 * @remarks This method first checks for the `npm_package_version` environment variable, which is automatically set by npm when running scripts.
	 * If it's not available, it attempts to read the `package.json` file to extract the version.
	 * If both methods fail, it returns 'unknown'.
	 */
	private static loadVersion(): string {
		const envVersion = process.env.npm_package_version;
		if (envVersion) return envVersion;

		try {
			const packagePath = Path.module('package.json');
			const raw = FS.readFileSync(packagePath, 'utf8');
			const data = JSON.parse(raw) as { version?: string };
			if (typeof data.version === 'string' && data.version.length > 0) return data.version;
		} catch {}

		return 'unknown';
	}
}

export namespace Response {
	export interface options {
		status?: number;
		headers?: HTTP.OutgoingHttpHeaders; 
		encode?: BufferEncoding;
	}
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