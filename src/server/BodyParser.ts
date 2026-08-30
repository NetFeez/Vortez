/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds the POST parser form of `Vortez`.
 * @license Apache-2.0
 */

import HTTP from 'http';

export class BodyParser {
    private static CRLF = Buffer.from('\r\n');
    private static HEADER_SEP = Buffer.from('\r\n\r\n');
    public static MAX_BODY_SIZE = 500 * 1024 * 1024;
    public constructor(
        protected readonly headers: HTTP.IncomingHttpHeaders,
        protected readonly httpRequest: HTTP.IncomingMessage
    ) {}
    /**
	 * Parses the HTTP request body based on its `Content-Type`.
	 * Supports JSON, plain text, URL-encoded forms, and multipart forms.
	 * @returns A structured object containing the parsed content and optional files.
	 */
    public async parse(): Promise<BodyParser.Body> {
        const contentType = this.headers['content-type'] || null;
        if (!contentType) return { mimeType: 'none', content: {}, files: null };
        const body = await this.extractBody();
        const [format, ...options] = contentType.trim().split(';');
        switch(format) {
			case 'text/plain': return this.processText(body);
			case 'application/json': return this.processJson(body);
			case 'application/x-www-form-urlencoded': return this.processUrlEncoded(body);
			case 'multipart/form-data': return this.processFormData(body, options);
			default: return { mimeType: 'unknown', content: body, files: null };
		}
    }
    /**
	 * Extracts the request body as a Buffer.
	 * @throws if the body stream fails.
	 * @returns The full request body as a Buffer.
	 */
    private async extractBody(): Promise<Buffer> {
        const chunks: any[] = [];
        const maxBodySize = BodyParser.MAX_BODY_SIZE;
        return new Promise((resolve, reject) => {
            this.httpRequest.on('end', () => resolve(Buffer.concat(chunks)));
            this.httpRequest.on('error', (error) => reject(Error('fail parsing request body', { cause: error })));
            this.httpRequest.on('data', (chunk) => {
                const size = chunks.reduce((total, current) => total + current.length, 0) + chunk.length;
                if (size > maxBodySize) return void this.httpRequest.destroy(Error(`Request body is too large (max ${Math.round(maxBodySize / 1024 / 1024)}MB)`));
                chunks.push(chunk);
            });
        });
    }
    /**
	 * Processes a `text/plain` body.
	 * @param body - The raw body buffer.
	 * @returns Object with MIME type, decoded text content, and no files.
	 */
    private processText(body: Buffer): BodyParser.Body.Mimes.Text {
        const text = body.toString('utf-8');
        return {
            mimeType: 'text/plain',
            content: text,
            files: null
        };
    }
    /**
	 * Processes an `application/json` body.
	 * @param body - The raw body buffer.
	 * @returns Object with MIME type, parsed JSON content, and no files.
	 * @throws If the JSON is invalid.
	 */
    private processJson(body: Buffer): BodyParser.Body.Mimes.Json {
        try {
            const text = body.toString('utf-8');
            return {
                mimeType: 'application/json',
                content: JSON.parse(text),
                files: null
            };
        } catch(error) { throw new Error('fail extracting json body', { cause: error }); }
    }
    /**
	 * Processes an `application/x-www-form-urlencoded` body.
	 * @param body - The raw body buffer.
	 * @returns Object with MIME type, key-value content, and no files.
	 */
    private processUrlEncoded(body: Buffer): BodyParser.Body.Mimes.UrlEncoded {
        const content: BodyParser.Body.VarList = {};
        const decoded = body.toString('latin1');
		const fragments = decoded.split('&');
		fragments.forEach((pair) => {
		    const [key, value] = pair.split('=');
		    const normalizedKey = this.safeDecodeURIComponent(key.replace(/\+/g, ' '));
		    content[normalizedKey] = this.safeDecodeURIComponent((value ?? '').replace(/\+/g, ' '));
		});
        return {
            mimeType: 'application/x-www-form-urlencoded',
            content: content,
            files: null
        }
    }
    /**
	 * Processes a `multipart/form-data` body.
	 * Extracts both field values and uploaded files.
	 * @param body - The raw body buffer.
	 * @param options - Header options (usually includes the boundary).
	 * @returns Object with MIME type, form fields, and files.
	 */
    private processFormData(body: Buffer, options: string[] = []): BodyParser.Body.Mimes.FormData {
        const content: BodyParser.Body.VarList = {};
        const files: BodyParser.Body.FileList = {};
        const boundary = options.join(';').replace(/.*boundary=(.*)/gi, (_: string, b: string) => b);
        const separator = Buffer.from('--' + (boundary !== '' ? boundary : this.inferBoundary(body) ?? ''));
        const parts = this.vSplitMultipart(body, separator);
        for (const part of parts) {
            const info = this.vParsePart(part);
            if (info == null) continue;
            if (info.fileName == null) { content[info.varName] = info.content.toString(); continue; }
            files[info.varName] = {
                name: info.fileName,
                size: info.content.length,
                mimeType: info.mimeType || 'unknown',
                content: info.content
            };
        }
        return { mimeType: 'multipart/form-data', content, files };
    }
    private vSplitMultipart(body: Buffer, separator: Buffer): Buffer[] {
        const parts: Buffer[] = [];
        let cursor = 0;
        const sepLen = separator.length;
        while (cursor < body.length) {
            const start = body.indexOf(separator, cursor);
            if (start === -1) break;
            const afterSep = start + sepLen;
            if (afterSep + 2 > body.length) break;
            if (body[afterSep] === 0x2D && body[afterSep + 1] === 0x2D) break;
            const contentStart = afterSep + 2;
            let next = body.indexOf(separator, contentStart);
            if (next === -1) next = body.length;
            else if (
                next >= 2 &&
                body[next - 2] === 0x0D &&
                body[next - 1] === 0x0A
            ) next -= 2;
            parts.push(body.subarray(contentStart, next));
            cursor = next;
        }
        return parts;
    }
    private vParsePart(part: Buffer): BodyParser.MultiPart.Info | null {
        const sepIdx = part.indexOf(BodyParser.HEADER_SEP);
        if (sepIdx === -1) return null;
        const headerStr = part.subarray(0, sepIdx).toString('ascii');
        const content = part.subarray(sepIdx + 4);
        const nameMatch = headerStr.match(/name="([^"]*)"/);
        const fileMatch = headerStr.match(/filename="([^"]*)"/);
        const typeMatch = headerStr.match(/Content-Type:\s*(.+)/i);
        if (!nameMatch) return null;
        return {
            varName: nameMatch[1],
            content,
            fileName: fileMatch?.[1] ?? null,
            mimeType: typeMatch?.[1]?.trim() ?? null
        };
    }
	/** 
	 * Tries to infer the boundary from the first line of the request body.
	 * @param body - The request body.
	 */
	private inferBoundary(body: Buffer): string | null {
		const result = body.toString('latin1').match(/^--([^\r\n]+)/);
		if (result == null) return null;
		return result[1];
	}
    /** 
	 * Safely decodes a URI component, returning the original value if decoding fails.
	 * @param value - The value to decode.
	 * @returns The decoded value or the original if decoding fails.
	 */
    private safeDecodeURIComponent(value: string): string {
        try { return decodeURIComponent(value); }
        catch { return value; }
    }
}
export namespace BodyParser {
	export namespace Body {
        export namespace Mimes {
            export interface Base {
                mimeType: string;
                content: any,
                files: FileList | null
            }
            export interface Json extends Base {
                mimeType: 'application/json';
                content: any;
                files: null;
            }
            export interface Text extends Base {
                mimeType: 'text/plain',
                content: string,
                files: null
            }
            export interface UrlEncoded extends Base{
                mimeType: 'application/x-www-form-urlencoded',
                content: Body.VarList
                files: null
            }
            export interface FormData extends Base {
                mimeType: 'multipart/form-data',
                content: Body.VarList,
                files: Body.FileList,
            }
            export interface None extends Base {
                mimeType: 'none',
                content: VarList,
                files: null
            }
            export interface Unknown extends Base {
                mimeType: 'unknown',
                content: Buffer,
                files: null
            }
        }
        export interface File {
            content: Buffer;
            name: string;
            size: number;
            mimeType: string;
        }
		export interface FileList {
			[name: string]: File | undefined;
		}
		export interface VarList {
			[name: string]: string | undefined;
		}
	}
    export namespace MultiPart {
        export interface Info {
            varName: string;
            fileName: string | null;
            mimeType: string | null;
            content: Buffer;
        }
    }
    export type Body = (
		Body.Mimes.Json |
        Body.Mimes.UrlEncoded |
        Body.Mimes.Text |
        Body.Mimes.Unknown |
        Body.Mimes.None |
        Body.Mimes.FormData
	);
}
export default BodyParser;