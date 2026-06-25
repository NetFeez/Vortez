import { IncomingHttpHeaders, IncomingMessage } from 'http';

import vortez from '../../build/Vortez.js';
import { Socket } from 'dgram';


export class Request extends vortez.Request {
    public vBody: Request.body;
    public constructor(options: Request.Options) {
        let fakeReq = IncomingMessage.prototype;
        fakeReq.httpVersion = options.httpVersion || '1.1';
        fakeReq.method = options.method;
        fakeReq.headers = options.headers;
        fakeReq.url = options.url;
        fakeReq.socket = { remoteAddress: '127.0.0.1' } as any;
        super(fakeReq);
        this.vBody = options.body;
    }
    public get fkBody() { return this.vBody; }
}
export namespace Request {
    export interface body {
        payload: Buffer;
        size: number;
        mimetype?: string;
    }
    export interface Options {
        httpVersion?: string;
        method: string,
        headers: IncomingHttpHeaders,
        url: string,
        body: Request.body,
    }
}
export default Request;