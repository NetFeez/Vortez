/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Adds the Request form of `Vortez`.
 * @license Apache-2.0
 */

import URI from 'node:url';
import HTTP from 'node:http';

import _BodyParser from './BodyParser.js';

export { BodyParser } from './BodyParser.js';

export class Request {
	/** Contains the request headers. */
	public headers: Request.Headers;

	/** Contains the request cookies. */
	public cookies: Request.Cookies;

	/** Contains the query string parameters sent. */
	public searchParams: Request.SearchParams;

	/** Contains the IP address of the requester. */
	public ip?: string | string[];

	/** Contains the request method. */
	public method: Request.Method;

	/** Contains the request body parser. */
	private parser: Request.BodyParser;

	/** Contains the request URL. */
	public url: string;

	/** The UrlRule parameters */
	public ruleParams: Request.RuleParams = {};

	/**
	 * Creates the request form for `NetFeez-Labs/Server`.
	 * @param httpRequest - The HTTP request received by the server.
	 * @param options - Optional settings for the request.
	 */
	public constructor(
		/** The HTTP request received by the server. */
		public httpRequest: HTTP.IncomingMessage,
		options: Request.Options = {}
	) {
		this.ip = this.extractIp(httpRequest, options.allowForwardedIP);
		this.url = this.normalizeUrl(httpRequest.url || '/');
		this.method = this.normalizeMethod(httpRequest.method || 'GET');
		this.searchParams = this.extractSearchParams(httpRequest.url || '/');
        this.headers = { ...httpRequest.headers };
		this.cookies = this.extractCookies(httpRequest);
		this.parser = new Request.BodyParser(this.headers, this.httpRequest);
	}

	public get body(): Promise<Request.BodyParser.Body> { return this.parser.parse(); }

	/**
	 * Extracts cookies from the HTTP request headers.
	 * @param request - The HTTP request from which to extract cookies.
	 * @returns An object containing the extracted cookies as key-value pairs.
	 */
	public extractCookies(request: HTTP.IncomingMessage): Request.Cookies {
		const cookies: Request.Cookies = {};
		const cookieHeader = request.headers['cookie'] || '';
		const cookiePairs = cookieHeader.split(';');
		for (const pair of cookiePairs) {
			const [name, ...valueParts] = pair.split('=');
			cookies[name.trim()] = valueParts.join('=').trim();
		}
		return cookies;
	}

	/**
	 * Extracts the IP address from the request, considering the "X-Forwarded-For" header if allowed.
	 * @param request - The HTTP request from which to extract the IP address.
	 * @param allowForwardedIP - Whether to consider the "X-Forwarded-For" header for extracting the IP address. Defaults to false.
	 * @returns The extracted IP address as a string, or an array of strings if multiple IPs are found.
	 */
	public extractIp(request: HTTP.IncomingMessage, allowForwardedIP: boolean = false): string | string[] {
		const ips: string[] = [];
		if (allowForwardedIP) {
			const forwardedFor = request.headers['x-forwarded-for'] || [];
			if (forwardedFor) {
				const forwardedList = typeof forwardedFor === 'string'
					? forwardedFor.split(',').map(ip => ip.trim())
					: forwardedFor.map(ip => ip.trim());
				ips.push(...forwardedList);
			}
		}
		const remoteAddress = request.socket.remoteAddress;
		if (remoteAddress && !ips.includes(remoteAddress)) ips.push(remoteAddress);
		return ips.length > 1 ? ips : ips[0];
	}

	/**
	 * Normalizes the HTTP method to uppercase and ensures it is a valid method.
	 * @param method - The HTTP method to normalize.
	 * @returns The normalized HTTP method.
	 */
	private normalizeMethod(method: string): Request.Method {
		method = method.trim().toUpperCase();
		return method.length > 0 ? method : 'GET';
	}

	/**
	 * Extracts the search parameters from the given URL.
	 * @param Url - The URL from which to extract search parameters.
	 * @returns An object containing the search parameters as key-value pairs.
	 */
	private extractSearchParams(Url: string): Request.SearchParams {
		let UrlObject = new URI.URL(`http://x.x${Url}`);
		const searchParams: Request.SearchParams = {};
		UrlObject.searchParams.forEach((value, name) => searchParams[name] = value);
		return searchParams;
	}

	/**
	 * Normalizes the URL by removing query parameters, decoding it, and ensuring it has a leading slash.
	 * @param url - The URL to normalize.
	 * @returns The normalized URL.
	 */
	private normalizeUrl(url: string): string {
		url = url.split('?')[0];
		url = decodeURI(url.endsWith('/') ? url : url + '/');
		url = url.length > 1 && url.endsWith('/') ? url.slice(0, -1) : url;
		url = url.startsWith('/') ? url : '/' + url;
		return url;
	}
}

export namespace Request {
	export import BodyParser = _BodyParser;

	export interface Options {
		allowForwardedIP?: boolean;
	}
    export interface Document {
        [name: string]: string | undefined;
    }
    export interface RuleParams extends Document {
		$surplus?: string;
	}
	export interface Headers extends HTTP.IncomingHttpHeaders {}
	export interface Cookies extends Document {};
	export interface SearchParams extends Document {};

	export type KnownMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'ALL';
	export type Method = KnownMethod | (string & {});
}

export default Request;