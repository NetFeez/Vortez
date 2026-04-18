import HeaderParser from "./HeaderParser.js";

export class Header implements Header.Header {
    public fin: boolean;
    public rsv: Header.Rsv;
    public opcode: number;
    public mask: boolean;
    public size: number | bigint;
    public maskKeys: Buffer | null;
    public headerSize: number;
    public constructor(data: Header.Header) {
        this.fin = data.fin;
        this.rsv = data.rsv;
        this.opcode = data.opcode;
        this.mask = data.mask;
        this.size = data.size;
        this.maskKeys = data.maskKeys;
        this.headerSize = data.headerSize;
    }
    /**
     * Reads the first complete frame header from a buffer and returns it.
     * @throws `RangeError` If the buffer does not contain a complete frame header.
     * 
     * Note: This method does not validate the frame header beyond checking for completeness.
     * It assumes that the buffer starts with a valid frame header.
     */
    public static fromBuffer(buffer: Buffer): Header {
        return HeaderParser.header(buffer);
    }
}
export namespace Header {
    export type Rsv = [rsv1: boolean, rsv2: boolean, rsv3: boolean];
    export interface Header {
        fin: boolean;
        rsv: Rsv;
        opcode: number;
        mask: boolean;
        size: number | bigint;
        maskKeys: Buffer | null;
        headerSize: number;
    }
}
export default Header;