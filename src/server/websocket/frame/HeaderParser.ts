import Header from "./Header.js";

export class HeaderParser {
    /**
     * Reads the first complete frame header from a buffer and returns it.
     * @throws `RangeError` If the buffer does not contain a complete frame header.
     * 
     * Note: This method does not validate the frame header beyond checking for completeness.
     * It assumes that the buffer starts with a valid frame header.
     */
    public static header(buffer: Buffer): Header {
        if (buffer.length < 2) throw new RangeError('Frame header requires at least 2 bytes');
        const fin = this.fin(buffer);
        const rsv = this.rsv(buffer);
        const opCode = this.opCode(buffer);
        const mask = this.mask(buffer);
        let size: number | bigint = this.payloadLen(buffer);
        let maskKeys: Buffer | null = null;
        let headerSize = 2;

        if (size === 0x7e) {
            if (buffer.length < 4) throw new RangeError('Frame requires 2 bytes for extended size');
            size = buffer.readUint16BE(2);
            headerSize = mask ? 8 : 4;
            if (buffer.length < headerSize) throw new RangeError('Frame header is incomplete');
            maskKeys = mask ? this.maskKeys(buffer, mask, 4) : null;
        } else if (size === 0x7f) {
            if (buffer.length < 10) throw new RangeError('Frame requires 8 bytes for extended size');
            size = buffer.readBigUint64BE(2);
            headerSize = mask ? 14 : 10;
            if (buffer.length < headerSize) throw new RangeError('Frame header is incomplete');
            maskKeys = mask ? this.maskKeys(buffer, mask, 10) : null;
        } else {
            headerSize = mask ? 6 : 2;
            if (buffer.length < headerSize) throw new RangeError('Frame header is incomplete');
            maskKeys = mask ? this.maskKeys(buffer, mask, 2) : null;
        }
        return new Header({ fin, rsv, opcode: opCode, mask, size, maskKeys, headerSize });
    }
    /**
     * Extracts the FIN bit from the first byte of the frame header.
     * 
     * @param buffer - The buffer containing the frame header (must be at least 1 byte long).
     * @returns - `true` if the FIN bit is set, otherwise `false`.
     */
    public static fin(buffer: Buffer): boolean {
        return Boolean((buffer[0] >>> 0x7) & 0x01);
    }
    public static rsv(buffer: Buffer): Header.Rsv {
        return [
            Boolean((buffer[0] >>> 0x6) & 0x01),
            Boolean((buffer[0] >>> 0x5) & 0x01),
            Boolean((buffer[0] >>> 0x4) & 0x01)
        ];
    }
    /**
     * Extracts the OpCode from the first byte of the frame header.
     * 
     * @param buffer - The buffer containing the frame header (must be at least 1 byte long).
     * @returns - The OpCode as a number (0-15).
     * 
     * @remarks The OpCode is located in the least significant 4 bits of the first byte of the frame header.
     */
    public static opCode(buffer: Buffer): number {
        return buffer[0] & 0x0f;
    }
    /**
     * Extracts the Mask bit from the second byte of the frame header.
     * 
     * @param buffer - The buffer containing the frame header (must be at least 2 bytes long).
     * @returns - `true` if the Mask bit is set, otherwise `false`.
     * 
     * @remarks The Mask bit is located in the most significant bit (bit 7) of the second byte of the frame header.
     */
    public static mask(buffer: Buffer): boolean {
        return Boolean((buffer[1] >>> 0x7) & 0x01);
    }
    /**
     * Extracts the Payload Length from the second byte of the frame header.
     * 
     * @param buffer - The buffer containing the frame header (must be at least 2 bytes long).
     * @returns - The Payload Length as a number (0-125) or bigint (for extended payload lengths).
     */
    public static payloadLen(buffer: Buffer): number | bigint {
        return buffer[1] & 0x7f;
    }
    /**
     * Extracts the Masking Keys from the frame header if the Mask bit is set.
     * 
     * @param buffer - The buffer containing the frame header (must be long enough to contain the masking keys if the Mask bit is set).
     * @param mask - A boolean indicating whether the Mask bit is set.
     * @param offset - The byte offset in the buffer where the masking keys start (typically 2 for non-extended payloads, 4 for 16-bit extended payloads, and 10 for 64-bit extended payloads).
     * @returns - A Buffer containing the 4 bytes of masking keys if the Mask bit is set, otherwise `null`.
      * 
      * @remarks The masking keys are located immediately after the payload length field in the frame header if the Mask bit is set. The offset parameter should be calculated based on the presence of extended payload length fields.
      * For example, if the payload length is 126 (indicating a 16-bit extended payload length), the masking keys would start at byte offset 4. If the payload length is 127 (indicating a 64-bit extended payload length), the masking keys would start at byte offset 10.
      */
    public static maskKeys(buffer: Buffer, mask: boolean, offset: number): Buffer | null {
        return mask ? buffer.subarray(offset, offset + 4) : null;
    }
}
export namespace HeaderParser {}
export default HeaderParser;