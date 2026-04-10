/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds the response format to `Vortez`.
 * @license Apache-2.0
 */

import HTTP from 'http';
import FS from 'fs';
import PATH from 'path';

import Request from './Request.js';
import Logger from '../logger/Logger.js';
import Utilities from '../utilities/Utilities.js';
import Template from '../Template.js';
import Config from './config/Config.js';
import PathSecurity from './security/PathSecurity.js';

const logger = new Logger({ prefix: 'Response' });

export class Response {
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
	public get isSended(): boolean { return this._isSended || this.httpResponse.writableEnded || this.httpResponse.headersSent; }
	/**
	 * Generates headers for supported file types.
	 * More types will be supported over time.
	 * @param extension - The file extension.
	 */
	public generateHeaders(extension: string): HTTP.OutgoingHttpHeaders {
		extension = extension.startsWith('.') ? extension.slice(1) : extension;
        extension = extension.toLowerCase();
		const headers: HTTP.OutgoingHttpHeaders = {};
		const contentTypeMap: Response.contentTypeMap = {
            'html': 'text/html',
            'js': 'text/javascript',
            'css': 'text/css',
            'json': 'application/json',
            'xml': 'application/xml',
            'txt': 'text/plain',
            'svg': 'image/svg+xml',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'mp3': 'audio/mpeg',
            'wav': 'audio/x-wav',
            'mp4': 'video/mp4',
        };
		const acceptRangeFormats = [
			'svg', 'png', 'jpg', 'jpeg', 'mp3', 'wav', 'mp4'
		];
		const type = contentTypeMap[extension];
		if (type) headers['Content-Type'] = type;
		if (acceptRangeFormats.includes(extension)) {
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
		const cookieSetters = this.request.cookies.getSetters();
		if (cookieSetters.length > 0) headers['set-cookie'] = cookieSetters;
		this.httpResponse.writeHead(code, headers);
	}
	/**
	 * Sends data as a response.
	 * @param data - The data to be sent.
	 * @param encode - The encoding used for the response.
	 */
	public send(data: Response.data, options: Response.options = {}): void  {
		this._isSended = true;
		const status = options.status ?? 200;
		const encode = options.encode || 'utf-8';
		const headers = options.headers || this.generateHeaders('txt');
		this.sendHeaders(status, headers);
		if (data instanceof FS.ReadStream) return void data.pipe(this.httpResponse);
		this.httpResponse.end(data, encode);
	}
	/**
	 * Sends a file as a response.
	 * @param path - The file path to send.
	 * @param options - The response options.
	 * @throws If the file does not exist or is not accessible.
	 */
	public async sendFile(path: string, options: Response.options = {}): Promise<void>  {
		path = Utilities.Path.normalize(path);
        try {
            const details = await FS.promises.stat(path);
            if (!details.isFile()) return this.sendError(500, '[Response Error] - Provided path is not a file.');
            if (!this.request.headers.range) {
                const stream = FS.createReadStream(path);
				const headers = this.generateHeaders(PATH.extname(path));
				headers['content-length'] = details.size.toString();
				this.send(stream, { status: 200, headers });
            } else {
				const rangeHeader = this.request.headers.range;
				const info = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader);
				if (!info) return this.sendError(416, 'Requested range exceeds file size');

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
						return this.sendError(416, 'Requested range exceeds file size');
					}
					start = Math.max(details.size - suffixSize, 0);
					end = details.size - 1;
				} else return this.sendError(416, 'Requested range exceeds file size');

				if (
					!Number.isInteger(start) ||
					!Number.isInteger(end) ||
					start < 0 ||
					end < start ||
					start >= details.size ||
					end >= details.size
				) return this.sendError(416, 'Requested range exceeds file size');
				
				const size = end - start + 1;
				const stream = FS.createReadStream(path, { start, end });
				const headers = this.generateHeaders(PATH.extname(path));
				headers['content-length'] = size.toString();
				headers['content-range'] = `bytes ${start}-${end}/${details.size}`;
				this.send(stream, { status: 206, headers });
            }
        } catch(error) {
			const status = this.getFsErrorStatus(error);
			const message = status === 404
				? 'The requested URL was not found'
				: status === 403
					? 'Access denied to requested resource'
					: error instanceof Error
						? error.message
						: '[Response Error] - File does not exist.';
			await this.sendError(status, message);
			logger.error(`error sending file ${this.request.session.id}`, error);
		}
	}
	/**
	 * Sends the listing of a folder as a response.
	 * @param base - The routing rule base path.
	 * @param plus - The relative path received in the request.
	 * @throws If the folder does not exist or is invalid.
	 */
	public async sendFolder(base: string, plus: string = ''): Promise<void> {
		const basePath = Utilities.Path.resolve(base || Utilities.Path.rootDir);
		const path = await PathSecurity.resolveInsideBase(basePath, plus);

		if (!path) {
			logger.warn(`&C2[Vortez Security] &C3Intento de Path Traversal bloqueado:`);
			logger.warn(` &C3- IP: &C6${this.request.ip}`);
			logger.warn(` &C3- Session ID: &C6${this.request.session.id}`);
			logger.warn(` &C3- URL: &C6${this.request.url}`);
			logger.warn(` &C3- Base: &C6${basePath}`);
			logger.warn(` &C3- Intento: &C6${plus}`);
			return void this.sendError(403, 'Forbidden: Outside of sandbox');
		}
		
        try {
			if (!await Utilities.fileExists(path)) return void this.sendError(404, 'The requested URL was not found');
            const details = await FS.promises.stat(path);
            if (details.isFile()) return this.sendFile(path);
			if (!details.isDirectory()) return this.sendError(404, 'The requested URL was not found');
            const folder = await FS.promises.readdir(path);
            if (this.templates.folder) {
                this.sendTemplate(this.templates.folder, {
                    Url: this.request.url,
                    folder
                });
            } else {
				this.sendTemplate(Utilities.Path.module('global/template/folder.vhtml'), {
                    Url: this.request.url,
                    folder
                });
            }
        } catch(error) {
			const status = this.getFsErrorStatus(error);
			const message = status === 404
				? 'The requested URL was not found'
				: status === 403
					? 'Access denied to requested resource'
					: error instanceof Error
						? error.message
						: '[Response Error] - File/Directory does not exist.';
			await this.sendError(status, message);
			logger.error(`error sending folder ${this.request.session.id}`, error);
		}
	}
	/**
	 * Sends a `.vhtml` template as a response.
	 * @param path - The template file path.
	 * @param data - The data to compile the template with.
	 * @param options - The response options.
	 * @throws If the template cannot be loaded.
	 */
	public async sendTemplate(path: string, data: object, options: Response.options = {}): Promise<void> {
		path = Utilities.Path.normalize(path);
        try {
            const template = await Template.load(path, data);
			const status = options.status ?? 200;
			const headers = options.headers || this.generateHeaders('html');
			this.send(template, { status, headers });
        } catch(error) {
			const status = this.getFsErrorStatus(error);
			const message = status === 404
				? 'Template not found'
				: status === 403
					? 'Access denied to template resource'
					: error instanceof Error
						? error.message
						: '[Response Error] - Template does not exist.';
			await this.sendError(status, message);
			logger.error(`error sending template ${this.request.session.id}`, error);
		}
	}
	/**
	 * Sends data in JSON format.
	 * @param data - The data to send.
	 * @param options - The response options.
	 */
	public sendJson(data: any, options: Response.options = {}): void {
		try {
			const json = JSON.stringify(data);
			const status = options.status ?? 200;
			const headers = options.headers || this.generateHeaders('json');
			this.send(json, { status, headers });
		} catch(error) {
			this.sendError(500, error instanceof Error ? error.message : '[Response Error] - Data cannot be converted to JSON.');
			logger.error(`error sending json ${this.request.session.id}`, error);
		}
    }
	/**
	 * Sends an error as a response.
	 * @param status - The HTTP status code of the error.
	 * @param message - The error message.
	 */
	public async sendError(status: number, message: string): Promise<void> {
        try {
            if (this.templates.error) {
                const template = await Template.load(this.templates.error, {
                    status, message
                });
				const headers = this.generateHeaders('html');
                this.send(template, { status: status, headers });
            } else {
				const template = await Template.load(Utilities.Path.module('global/template/error.vhtml'), {
                    status, message
                });
				const headers = this.generateHeaders('html');
                this.send(template, { status: status, headers });
            }
        } catch(error) {
			const headers = this.generateHeaders('txt');
            this.send(`Error: ${status} -> ${message}`, { status: status, headers });
			logger.error(`error sending error: ${this.request.session.id}`, error);
		}
	}

	private getFsErrorStatus(error: unknown): number {
		if (!(error instanceof Error)) return 500;
		const withCode = error as Error & { code?: string };
		if (withCode.code === 'ENOENT' || withCode.code === 'ENOTDIR') return 404;
		if (withCode.code === 'EACCES' || withCode.code === 'EPERM') return 403;
		return 500;
	}

	private static loadVersion(): string {
		const envVersion = process.env.npm_package_version;
		if (envVersion) return envVersion;

		try {
			const packagePath = Utilities.Path.module('package.json');
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
	export type data = string | Buffer | FS.ReadStream;
    export type Extensions = (
        'HTML' | 'JS' | 'CSS' | 'JSON' | 'XML' | 'TXT' |
        'SVG' | 'PNG' | 'JPG' | 'JPEG' | 'MP3' | 'WAV' | 'MP4'
    );
}

export default Response;