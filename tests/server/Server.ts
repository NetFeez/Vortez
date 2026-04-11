/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests HTTP server components including cookies, sessions, body parsing, responses, routing, and WebSockets.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';
import { promises as FS } from 'fs';

import { Config, Router, ServerError, Utilities } from '../../build/Vortez.js';
import Request from '../../build/server/Request.js';
import Response from '../../build/server/Response.js';
import Cookie from '../../build/server/Cookie.js';
import Session from '../../build/server/Session.js';
import BodyParser from '../../build/server/BodyParser.js';
import Websocket from '../../build/server/websocket/Websocket.js';

import Helpers from '../support/Helpers.js';
import TestSuite from '../support/TestSuite.js';
import SuiteTracker from '../support/SuiteTracker.js';

const createIncomingMessage = Helpers.createIncomingMessage;
const createMockHttpResponse = Helpers.createMockHttpResponse;
const createResponse = Helpers.createResponse;
const createWebsocketConnection = Helpers.createWebsocketConnection;
const assets = Helpers.assets;
const ensureTempDir = Helpers.ensureTempDir;
const buildTempPath = Helpers.buildTempPath;

export class Server extends TestSuite {
    public readonly name = 'Server';
    private readonly tracker = new SuiteTracker('SERVER');

    private testCookieSessionAndRequest(): void {
        try {
            function isTokenSetter(entry: string): boolean { return entry.startsWith('token=xyz'); }
            function isThemeDeleteSetter(entry: string): boolean { return entry.startsWith('theme=None'); }

            const cookie = new Cookie('theme=dark; Session=abc123');
            assert.equal(cookie.get('theme'), 'dark');
            assert.equal(cookie.get('Session'), 'abc123');

            cookie.set('token', 'xyz', { httpOnly: true, path: '/' });
            cookie.delete('theme');
            assert.ok(cookie.getSetters().some(isTokenSetter));
            assert.ok(cookie.getSetters().some(isThemeDeleteSetter));

            const session = Session.get(new Cookie());
            session.set('user', 'Ada');
            assert.equal(session.get('user'), 'Ada');

            const request = new Request(createIncomingMessage({
                method: 'POST',
                url: '/users/list?limit=10&sort=asc',
                headers: { cookie: 'theme=dark', 'x-forwarded-for': '10.0.0.1' },
            }));
            assert.equal(request.method, 'POST');
            assert.equal(request.url, '/users/list');
            assert.equal(request.ip, '10.0.0.1');
            assert.equal(request.searchParams.limit, '10');
            assert.equal(request.cookies.get('theme'), 'dark');

            const headRequest = new Request(createIncomingMessage({
                method: 'HEAD',
                url: '/status',
            }));
            assert.equal(headRequest.method, 'HEAD');

            const customMethodRequest = new Request(createIncomingMessage({
                method: 'PURGE',
                url: '/cache',
            }));
            assert.equal(customMethodRequest.method, 'PURGE');

            this.tracker.logTestResult('Cookie/Session/Request - Basics', true);
        } catch (error) {
            this.tracker.logTestResult('Cookie/Session/Request - Basics', false, error);
        }
    }

    private async testBodyParser(): Promise<void> {
        try {
            const jsonStream = createIncomingMessage({ method: 'POST', headers: { 'content-type': 'application/json' } });
            const jsonRequest = new Request(jsonStream);
            const jsonPromise = jsonRequest.post;
            jsonStream.end('{"name":"vortez","count":3}');
            const jsonBody = await jsonPromise;
            assert.equal(jsonBody.mimeType, 'application/json');
            assert.deepEqual(jsonBody.content, { name: 'vortez', count: 3 });

            const textStream = createIncomingMessage({ method: 'POST', headers: { 'content-type': 'text/plain' } });
            const textParser = new BodyParser(textStream.headers, textStream);
            const textPromise = textParser.parse();
            textStream.end('hello world');
            const textBody = await textPromise;
            assert.equal(textBody.mimeType, 'text/plain');
            assert.equal(textBody.content, 'hello world');

            const formStream = createIncomingMessage({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
            const formParser = new BodyParser(formStream.headers, formStream);
            const formPromise = formParser.parse();
            formStream.end('name=Ada&role=admin');
            const formBody = await formPromise;
            assert.equal(formBody.mimeType, 'application/x-www-form-urlencoded');
            assert.deepEqual(formBody.content, { name: 'Ada', role: 'admin' });

            const looseFormStream = createIncomingMessage({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } });
            const looseFormParser = new BodyParser(looseFormStream.headers, looseFormStream);
            const looseFormPromise = looseFormParser.parse();
            looseFormStream.end('term=hello+world&flag');
            const looseFormBody = await looseFormPromise;
            assert.equal(looseFormBody.mimeType, 'application/x-www-form-urlencoded');
            assert.deepEqual(looseFormBody.content, { term: 'hello world', flag: '' });

            const boundary = 'vortez-boundary';
            const multipartBody = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="title"',
                '',
                'Hello',
                `--${boundary}`,
                'Content-Disposition: form-data; name="file"; filename="note.txt"',
                'Content-Type: text/plain',
                '',
                'File body',
                `--${boundary}--`,
                '',
            ].join('\r\n');
            const multipartStream = createIncomingMessage({
                method: 'POST',
                headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
            });
            const multipartParser = new BodyParser(multipartStream.headers, multipartStream);
            const multipartPromise = multipartParser.parse();
            multipartStream.end(multipartBody, 'latin1');
            const multipart = await multipartPromise;
            assert.equal(multipart.mimeType, 'multipart/form-data');
            assert.equal(multipart.content.title, 'Hello');
            assert.ok(multipart.files);
            const uploadedFile = multipart.files.file;
            assert.ok(uploadedFile);
            if (uploadedFile) assert.equal(uploadedFile.name, 'note.txt');

            const noneStream = createIncomingMessage({ method: 'POST' });
            const noneParser = new BodyParser(noneStream.headers, noneStream);
            const none = await noneParser.parse();
            assert.equal(none.mimeType, 'none');

            this.tracker.logTestResult('BodyParser - Formats', true);
        } catch (error) {
            this.tracker.logTestResult('BodyParser - Formats', false, error);
        }
    }

    private async testResponse(): Promise<void> {
        try {
            const { rawResponse, response } = createResponse();
            const html = response.generateHeaders('html');
            const png = response.generateHeaders('png');
            assert.equal(html['Content-Type'], 'text/html');
            assert.equal(png['Content-Type'], 'image/png');
            assert.equal(png['Accept-Ranges'], 'bytes');
            assert.equal(rawResponse.headers['x-version'], Helpers.loadPackageVersion());

            response.sendJson({ ok: true });
            assert.equal(rawResponse.statusCode, 200);
            assert.equal(rawResponse.headers['content-type'], 'application/json');
            assert.equal(rawResponse.body, '{"ok":true}');

            const textResponse = createResponse().response;
            textResponse.send('plain text', { status: 201 });
            assert.equal(textResponse.httpResponse.statusCode, 201);

            const errorResponse = createResponse(undefined, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            }).response;
            await errorResponse.sendError(404, 'missing');
            const errorHttpResponse = errorResponse.httpResponse as unknown as { body?: string };
            assert.ok((errorHttpResponse.body || '').includes('<h1>404</h1>'));

            this.tracker.logTestResult('Response - Headers/send/error', true);
        } catch (error) {
            this.tracker.logTestResult('Response - Headers/send/error', false, error);
        }
    }
    /** Tests the folder listing functionality of the router. */
    private async testAddFolderListing(): Promise<void> {
        try {
            await ensureTempDir();
            const folderRoot = buildTempPath('folder-listing');
            const nestedFolder = `${folderRoot}/subfolder`;
            await FS.mkdir(nestedFolder, { recursive: true });
            await FS.writeFile(`${folderRoot}/alpha.txt`, 'alpha', 'utf8');
            await FS.writeFile(`${folderRoot}/beta.txt`, 'beta', 'utf8');

            const folderRouter = new Router(new Config({}));
            folderRouter.addFolder('/files', folderRoot);

            const request = new Request(createIncomingMessage({ url: '/files/' }));
            const { rawResponse, response } = createResponse(request, {
                folder: 'global/template/folder.vhtml',
                error: 'global/template/error.vhtml',
            });

            let sendTemplatePromise: Promise<void> | undefined;
            const originalSendTemplate = response.sendTemplate.bind(response);
            (response as Response & { sendTemplate: typeof response.sendTemplate }).sendTemplate = (
                ...args: Parameters<typeof response.sendTemplate>
            ): Promise<void> => {
                sendTemplatePromise = originalSendTemplate(...args);
                return sendTemplatePromise;
            };

            assert.equal(folderRouter.routeRequest(request, response), true);
            await this.waitForHttpResponseEnd(rawResponse);
            await sendTemplatePromise;

            assert.equal(rawResponse.statusCode, 200);
            assert.ok(rawResponse.body.includes('Folder: /files'));
            assert.ok(rawResponse.body.includes('alpha.txt'));
            assert.ok(rawResponse.body.includes('beta.txt'));
            assert.ok(rawResponse.body.includes('subfolder'));

            this.tracker.logTestResult('Router/addFolder - Folder listing', true);
        } catch (error) {
            this.tracker.logTestResult('Router/addFolder - Folder listing', false, error);
        }
    }
    /** Tests that folder traversal is blocked when accessing files outside the allowed directory. */
    private async testAddFolderTraversalBlocked(): Promise<void> {
        try {
            await ensureTempDir();
            const folderRoot = buildTempPath('folder-traversal');
            await FS.mkdir(folderRoot, { recursive: true });
            await FS.writeFile(`${folderRoot}/alpha.txt`, 'alpha', 'utf8');

            const folderRouter = new Router(new Config({}));
            folderRouter.addFolder('/files', folderRoot);

            const traversalRequest = new Request(createIncomingMessage({ url: '/files/../../../secret.txt' }));
            const { rawResponse: traversalRaw, response: traversalResponse } = createResponse(traversalRequest, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            });
            assert.equal(folderRouter.routeRequest(traversalRequest, traversalResponse), true);
            await this.waitForHttpResponseEnd(traversalRaw);
            assert.equal(traversalRaw.statusCode, 403);
            assert.ok(traversalRaw.body.includes('Forbidden'));

            this.tracker.logTestResult('Router/addFolder - Traversal blocked', true);
        } catch (error) {
            this.tracker.logTestResult('Router/addFolder - Traversal blocked', false, error);
        }
    }

    private async testResponseFileRanges(): Promise<void> {
        try {
            await ensureTempDir();
            const source = buildTempPath('range.txt');
            await FS.writeFile(source, '0123456789', 'utf8');

            interface PartialSendOptions {
                status?: number;
                headers?: Record<string, string | number | string[] | undefined>;
            }
            interface PartialResponseSender {
                send(data: unknown, options?: PartialSendOptions): void;
            }

            const partialRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/range.txt',
                headers: { range: 'bytes=0-3' },
            }));
            const partialResponse = createResponse(partialRequest).response;
            const captured: { status?: number, headers?: Record<string, string | number | string[] | undefined> } = {};
            function captureSend(
                data: unknown,
                options: PartialSendOptions = {},
            ): void {
                captured.status = options.status;
                captured.headers = options.headers;
                if (data && typeof data === 'object' && 'destroy' in data && typeof data.destroy === 'function') data.destroy();
            }

            (partialResponse as unknown as PartialResponseSender).send = captureSend;

            await partialResponse.sendFile(source);
            assert.equal(captured.status, 206);
            assert.equal(captured.headers?.['content-range'], 'bytes 0-3/10');
            assert.equal(captured.headers?.['content-length'], '4');

            const suffixRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/range.txt',
                headers: { range: 'bytes=-3' },
            }));
            const suffixResponse = createResponse(suffixRequest).response;
            const suffixCaptured: { status?: number, headers?: Record<string, string | number | string[] | undefined> } = {};
            (suffixResponse as unknown as PartialResponseSender).send = function captureSuffix(
                data: unknown,
                options: PartialSendOptions = {},
            ): void {
                suffixCaptured.status = options.status;
                suffixCaptured.headers = options.headers;
                if (data && typeof data === 'object' && 'destroy' in data && typeof data.destroy === 'function') data.destroy();
            };

            await suffixResponse.sendFile(source);
            assert.equal(suffixCaptured.status, 206);
            assert.equal(suffixCaptured.headers?.['content-range'], 'bytes 7-9/10');
            assert.equal(suffixCaptured.headers?.['content-length'], '3');

            const invalidRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/range.txt',
                headers: { range: 'bytes=50-60' },
            }));
            const { rawResponse: invalidRaw, response: invalidResponse } = createResponse(invalidRequest, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            });
            await invalidResponse.sendFile(source);
            assert.equal(invalidRaw.statusCode, 416);
            assert.ok(invalidRaw.body.includes('Requested range exceeds file size'));

            const missingFileRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/missing.txt',
            }));
            const { rawResponse: missingFileRaw, response: missingFileResponse } = createResponse(missingFileRequest, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            });
            await missingFileResponse.sendFile(buildTempPath('does-not-exist.txt'));
            assert.equal(missingFileRaw.statusCode, 404);
            assert.ok(missingFileRaw.body.includes('The requested URL was not found'));

            const startAtSizeRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/range.txt',
                headers: { range: 'bytes=10-10' },
            }));
            const { rawResponse: startAtSizeRaw, response: startAtSizeResponse } = createResponse(startAtSizeRequest, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            });
            await startAtSizeResponse.sendFile(source);
            assert.equal(startAtSizeRaw.statusCode, 416);

            const invertedRangeRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/file/range.txt',
                headers: { range: 'bytes=6-3' },
            }));
            const { rawResponse: invertedRangeRaw, response: invertedRangeResponse } = createResponse(invertedRangeRequest, {
                folder: `${assets}/template.vhtml`,
                error: `${assets}/error.vhtml`,
            });
            await invertedRangeResponse.sendFile(source);
            assert.equal(invertedRangeRaw.statusCode, 416);

            this.tracker.logTestResult('Response - File ranges 206/416', true);
        } catch (error) {
            this.tracker.logTestResult('Response - File ranges 206/416', false, error);
        }
    }

    private async waitForNextTick(): Promise<void> {
        await new Promise<void>(function resolveOnTick(resolve): void {
            setImmediate(resolve);
        });
    }

    /**
     * Waits for mocked HTTP responses to finish writing.
     * @param response - Mock response with completion flags.
     * @param tries - Maximum polling attempts.
     * @param sleepMs - Delay between polling attempts in milliseconds.
     */
    private async waitForHttpResponseEnd(
        response: { writableEnded: boolean; headersSent: boolean },
        tries: number = 10,
        sleepMs: number = 200,
    ): Promise<void> {
        for (let attempt = 0; attempt < tries; attempt++) {
            if (response.writableEnded || response.headersSent) return;
            await Utilities.Time.sleep(sleepMs);
            await this.waitForNextTick();
        }
        throw new Error('Timed out waiting for HTTP response to finish');
    }

    /**
     * Builds a masked client frame to emulate browser-originated websocket payloads.
     * @param message - Text payload to encode.
     * @param options - Frame flags and opcode.
     * @returns Encoded websocket frame buffer.
     */
    private createClientFrame(message: string, options: { fin?: boolean; opcode?: number } = {}): Buffer {
        const fin = options.fin ?? true;
        const opcode = options.opcode ?? 0x1;
        const payload = Buffer.from(message, 'utf8');
        const maskKey = Buffer.from([0x01, 0x02, 0x03, 0x04]);
        const header = Buffer.from([
            (fin ? 0x80 : 0x00) | opcode,
            0x80 | payload.length,
            ...maskKey,
        ]);
        const masked = Buffer.alloc(payload.length);
        for (let index = 0; index < payload.length; index++) {
            masked[index] = payload[index] ^ maskKey[index % 4];
        }
        return Buffer.concat([header, masked]);
    }

    /**
     * Validates HTTP router and websocket behavior, including middleware, routing, and handshake flows.
     */
    private async testRouterAndWebsocket(): Promise<void> {
        try {
            interface NextCallback {
                (): void | Promise<void>;
            }

            const router = new Router(new Config({}));
            const child = new Router(new Config({}));

            function sendMountedUser(request: Request, response: Response): void {
                response.sendJson({ id: request.ruleParams.id });
            }
            child.addAction('GET', '/users/$id', sendMountedUser);
            router.mount(child, '/api');

            const request = new Request(createIncomingMessage({ url: '/api/users/42' }));
            const { rawResponse, response } = createResponse(request);
            assert.equal(router.routeRequest(request, response), true);
            assert.equal(rawResponse.body, '{"id":"42"}');

            const ruleRouter = new Router(new Config({}));
            function sendDocSection(request: Request, response: Response): void {
                response.sendJson({
                    section: request.ruleParams.section ?? null,
                    surplus: request.ruleParams.$surplus ?? null,
                });
            }
            function sendAssetSurplus(request: Request, response: Response): void {
                response.sendJson({ surplus: request.ruleParams.$surplus ?? null });
            }
            ruleRouter.addAction('GET', '/docs/$?section', sendDocSection);
            ruleRouter.addAction('GET', '/assets/*', sendAssetSurplus);

            const optionalRequest = new Request(createIncomingMessage({ url: '/docs/api' }));
            const { rawResponse: optionalRaw, response: optionalResponse } = createResponse(optionalRequest);
            assert.equal(ruleRouter.routeRequest(optionalRequest, optionalResponse), true);
            assert.equal(optionalRaw.body, '{"section":"api","surplus":null}');

            const wildcardRequest = new Request(createIncomingMessage({ url: '/assets/js/app.js' }));
            const { rawResponse: wildcardRaw, response: wildcardResponse } = createResponse(wildcardRequest);
            assert.equal(ruleRouter.routeRequest(wildcardRequest, wildcardResponse), true);
            assert.equal(wildcardRaw.body, '{"surplus":"/js/app.js"}');

            const events: string[] = [];
            const lateMiddleware = new Router.HttpMiddleware();
            function pushBefore(): void { events.push('before'); }
            function pushMiddleware(_req: Request, _res: Response, next: NextCallback): void | Promise<void> {
                events.push('middleware');
                next();
            }
            function pushAfter(): void { events.push('after'); }
            router.addAction('GET', '/before', pushBefore);
            lateMiddleware.use(pushMiddleware);
            router.use(lateMiddleware);
            router.addAction('GET', '/after', pushAfter);
            router.routeRequest(new Request(createIncomingMessage({ url: '/before' })), createResponse().response);
            router.routeRequest(new Request(createIncomingMessage({ url: '/after' })), createResponse().response);
            assert.deepEqual(events, ['before', 'middleware', 'after']);

            const errorRouter = new Router(new Config({}));
            const errorEvents: string[] = [];
            async function handleBoomError(error: unknown, _request: Request, response: Response, _next: NextCallback): Promise<void> {
                errorEvents.push(error instanceof Error ? error.message : String(error));
                response.sendJson({ error: errorEvents[0] }, { status: 503 });
            }
            errorRouter.httpMiddleware.useError(handleBoomError);
            function throwBoom(): never {
                throw new Error('boom');
            }
            errorRouter.addAction('GET', '/boom', throwBoom);
            const boomRequest = new Request(createIncomingMessage({ url: '/boom' }));
            const { rawResponse: boomRaw, response: boomResponse } = createResponse(boomRequest);
            assert.equal(errorRouter.routeRequest(boomRequest, boomResponse), true);
            await this.waitForNextTick();
            assert.deepEqual(errorEvents, ['boom']);
            assert.equal(boomRaw.statusCode, 503);
            assert.equal(boomRaw.body, '{"error":"boom"}');

            const treeRouter = new Router(new Config({}), [], { algorithm: 'Tree' });
            const treeHits: string[] = [];
            function sendSearchParam(request: Request, response: Response): void {
                treeHits.push(`param:${request.ruleParams.term}`);
                response.sendJson({ route: 'param', term: request.ruleParams.term });
            }
            function sendSearchLatest(_request: Request, response: Response): void {
                treeHits.push('static');
                response.sendJson({ route: 'static' });
            }
            treeRouter.addAction('GET', '/search/$term', sendSearchParam);
            treeRouter.addAction('GET', '/search/latest', sendSearchLatest);
            const treeRequest = new Request(createIncomingMessage({ url: '/search/latest' }));
            const { rawResponse: treeRaw, response: treeResponse } = createResponse(treeRequest);
            assert.equal(treeRouter.routeRequest(treeRequest, treeResponse), true);
            assert.deepEqual(treeHits, ['static']);
            assert.equal(treeRaw.body, '{"route":"static"}');

            const routerFactory = new Router(new Config({}), [], { algorithm: 'Tree' });
            assert.ok(routerFactory.createRouter().algorithm instanceof Router.Tree);
            const invalidAlgorithm = 'Invalid' as unknown as keyof Router.AlgorithmMap;
            assert.ok(Router.getAlgorithm(invalidAlgorithm) instanceof Router.FIFO);

            const wsRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/ws',
                headers: { 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==' },
            }));
            const { connection, writes, ends } = createWebsocketConnection();
            const client = new Websocket(wsRequest, connection);
            client.accept();
            client.sendJson({ ok: true });
            client.reject(400, 'bad');
            assert.ok(typeof writes[0] === 'string' && writes[0].includes('101 Switching Protocols'));
            assert.equal(ends.length, 1);

            const payloadWrites = writes.filter((entry) => Buffer.isBuffer(entry)) as Buffer[];
            assert.ok(payloadWrites.length >= 1);
            assert.equal(payloadWrites[0][0], 0x81);
            assert.equal(payloadWrites[0][1], 0x0b);
            assert.equal(payloadWrites[0].subarray(2).toString('utf8'), '{"ok":true}');

            const binaryConnection = createWebsocketConnection();
            const binaryClient = new Websocket(wsRequest, binaryConnection.connection);
            binaryClient.accept();
            binaryClient.send(Buffer.from([0xde, 0xad, 0xbe, 0xef]));
            const binaryFrame = binaryConnection.writes.find((entry): entry is Buffer => Buffer.isBuffer(entry));
            assert.ok(binaryFrame);
            if (binaryFrame) {
                assert.equal(binaryFrame[0], 0x82);
                assert.equal(binaryFrame[1], 0x04);
                assert.deepEqual(Array.from(binaryFrame.subarray(2)), [0xde, 0xad, 0xbe, 0xef]);
            }

            const receivedMessages: string[] = [];
            const framedConnection = createWebsocketConnection();
            const framedClient = new Websocket(wsRequest, framedConnection.connection);
            framedClient.on('message', (data) => {
                receivedMessages.push(data.toString('utf8'));
            });
            framedConnection.connection.write(this.createClientFrame('hello ', { fin: false, opcode: 0x1 }));
            framedConnection.connection.write(this.createClientFrame('world', { fin: true, opcode: 0x0 }));
            await this.waitForNextTick();
            assert.deepEqual(receivedMessages, ['hello world']);

            const missingKeyRequest = new Request(createIncomingMessage({ method: 'GET', url: '/ws' }));
            const missingKeyClient = new Websocket(missingKeyRequest, createWebsocketConnection().connection);
            assert.throws(() => missingKeyClient.accept(), /Missing Sec-WebSocket-Key header/);

            const wsRouter = new Router(new Config({}));
            let receivedName: string | null = null;
            function handleChatSocket(incoming: Request, socket: Websocket): void {
                receivedName = incoming.ruleParams.name ?? null;
                socket.sendJson({ name: receivedName });
            }
            wsRouter.addWebsocket('/chat/$name', handleChatSocket);
            const chatRequest = new Request(createIncomingMessage({
                method: 'GET',
                url: '/chat/ada',
                headers: { 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==' },
            }));
            const routed = wsRouter.routeWebSocket(chatRequest, new Websocket(chatRequest, createWebsocketConnection().connection));
            assert.equal(routed, true);
            assert.equal(receivedName, 'ada');

            const managerRouter = new Router(new Config({}));
            const notFoundHttpRequest = createIncomingMessage({ method: 'GET', url: '/not-found/' });
            const notFoundHttpResponse = createMockHttpResponse();
            await managerRouter.requestManager(
                notFoundHttpRequest,
                notFoundHttpResponse as unknown as import('http').ServerResponse,
            );
            assert.equal(notFoundHttpResponse.statusCode, 404);
            assert.ok(notFoundHttpResponse.body.includes('No route for: GET -> /not-found'));

            const { connection: noRouteConnection, writes: noRouteWrites, ends: noRouteEnds } = createWebsocketConnection();
            const notFoundWsRequest = createIncomingMessage({
                method: 'GET',
                url: '/ws/not-found',
                headers: { 'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==' },
            });
            managerRouter.upgradeManager(notFoundWsRequest, noRouteConnection);
            assert.ok(typeof noRouteWrites[0] === 'string' && noRouteWrites[0].includes('HTTP/1.1 404 No route for: GET -> /ws/not-found'));
            assert.equal(noRouteEnds.length, 1);

            const baseHttpMiddleware = new Router.HttpMiddleware();
            function baseMiddleware(): void { }
            baseHttpMiddleware.use(baseMiddleware);
            const clonedHttpMiddleware = baseHttpMiddleware.clone();
            function laterMiddleware(): void { }
            baseHttpMiddleware.use(laterMiddleware);
            assert.deepEqual(clonedHttpMiddleware.middlewareNames, ['baseMiddleware']);

            const baseWsMiddleware = new Router.WsMiddleware();
            function baseWs(): void { }
            baseWsMiddleware.use(baseWs);
            const clonedWsMiddleware = baseWsMiddleware.clone();
            function laterWs(): void { }
            baseWsMiddleware.use(laterWs);
            assert.deepEqual(clonedWsMiddleware.middlewareNames, ['baseWs']);

            this.tracker.logTestResult('Router/Websocket - Routing and handshake', true);
        } catch (error) {
            this.tracker.logTestResult('Router/Websocket - Routing and handshake', false, error);
        }
    }

    /**
     * Runs the server test suite.
     * @returns Aggregated suite counters.
     */
    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Server Test Suite ===\n');
        this.testCookieSessionAndRequest();
        await this.testBodyParser();
        await this.testResponse();
        await this.testAddFolderListing();
        await this.testAddFolderTraversalBlocked();
        await this.testResponseFileRanges();
        await this.testRouterAndWebsocket();
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Server { }

export default Server;
