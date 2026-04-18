/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description WebSocket frame codec for Vortez.
 * @license Apache-2.0
 */
import CRYPTO from 'crypto';

export class Codec {
    /**
     * Decodes a WebSocket frame's payload using the provided information about the frame.
     * 
     * @param data - The complete WebSocket frame data to decode.
     * @param bytesInfo - The number of bytes used for the frame's header and extended payload length.
     * @param maskKeys - The masking keys if the frame is masked, or null if it is not masked.
     * @return A Buffer containing the decoded payload data.
     * 
     * Note: The `decode` method is designed for server use and expects the data to be unmasked.
     * For **client-side** decoding, use `clientDecode` which can handle masked frames as per the WebSocket protocol requirements.
     */
    public static decode(data: Buffer, bytesInfo: number, maskKeys?: Buffer | null): Buffer {
        return Codec.decodePayload(data, bytesInfo, maskKeys ?? null);
    }
    /**
     * Encodes a WebSocket frame with the given data and opcode.
     * 
     * By default, it encodes as a binary frame **(opcode 0x2)** without masking, suitable **for server-to-client** communication.
     * For **client-to-server** communication, use `clientEncode` which applies masking as required by the WebSocket protocol.
     * 
     * @param data - The payload data to encode.
     * @param opCode - The opcode for the frame.
     * @return A Buffer containing the encoded WebSocket frame.
     * 
     * Note: The `encode` method is intended for server use and does not apply masking, while `clientEncode` should be used for **client-side** encoding to ensure compliance with the WebSocket protocol.
     * |OpCode|Description|
     * |:-----|:------------|
     * | 0x0  | Continuation frame |
     * | 0x1  | Text frame |
     * | 0x2  | Binary frame |
     * | 0x8  | Connection close frame |
     * | 0x9  | Ping frame |
     * | 0xA  | Pong frame |

     */
    public static encode(data: Buffer, opCode: number = 0x2): Buffer {
        return Codec.buildFrame(data, opCode, false, true);
    }
    /**
     * Encodes a WebSocket message into multiple frames when the payload is too large or when fragmentation is desired.
     *
     * The first frame keeps the provided opcode and the rest use opcode `0x0` continuation frames.
     * The last frame is marked with FIN = 1.
     *
     * @param data - The payload data to encode.
     * @param opCode - The opcode for the first frame.
     * @param fragmentSize - The maximum payload size per frame.
     * @return An array of encoded frames ready to be written in order.
     */
    public static encodeFragments(data: Buffer, opCode: number = 0x2, fragmentSize: number = 16384): Buffer[] {
        return Codec.buildFragments(data, opCode, false, fragmentSize);
    }
    /**
     * Encodes a WebSocket frame for **client-to-server** communication, applying masking as required by the WebSocket protocol.
     * This method should be used when encoding frames on the client side, as it ensures that the payload is masked with a random 4-byte key, which is a requirement for frames sent from clients to servers.
     * 
     * @param data - The payload data to encode.
     * @param opCode - The opcode for the frame.
     * @return A Buffer containing the encoded WebSocket frame with masking applied.
     * 
     * Note: The `clientEncode` method is specifically designed for client-side use and applies masking to the payload, which is mandatory for frames sent from clients to servers according to the WebSocket protocol. For server-side encoding, use the `encode` method which does not apply masking.
     * |OpCode|Description|
     * |:-----|:------------|
     * | 0x0  | Continuation frame |
     * | 0x1  | Text frame |
     * | 0x2  | Binary frame |
     * | 0x8  | Connection close frame |
     * | 0x9  | Ping frame |
     * | 0xA  | Pong frame |
     */
    public static clientEncode(data: Buffer, opCode: number = 0x2): Buffer {
        return Codec.buildFrame(data, opCode, true, true);
    }
    /**
     * Encodes a client WebSocket message into multiple masked frames.
     *
     * @param data - The payload data to encode.
     * @param opCode - The opcode for the first frame.
     * @param fragmentSize - The maximum payload size per frame.
     * @return An array of masked frames ready to be written in order.
     */
    public static clientEncodeFragments(data: Buffer, opCode: number = 0x2, fragmentSize: number = 16384): Buffer[] {
        return Codec.buildFragments(data, opCode, true, fragmentSize);
    }
    /**
     * Builds a WebSocket frame with the specified data, opcode, and masking option.
     * This method is a helper function used by both `encode` and `clientEncode` to construct the WebSocket frame according to the protocol specifications.
     * It handles the framing of the data, including setting the appropriate header fields based on the opcode and masking requirements.
     * 
     * @param data - The payload data to include in the frame.
     * @param opCode - The opcode for the frame, indicating the type of frame being sent.
     * @param mask - A boolean indicating whether to apply masking to the payload (true for client-to-server frames, false for server-to-client frames).
     * @return A Buffer containing the complete WebSocket frame ready for transmission.
     * 
     * Note: The `buildFrame` method is an internal helper function and is not intended for direct use outside of the `Codec` class. It is responsible for constructing the WebSocket frame according to the protocol specifications, including handling the framing of the data and applying masking when required.
     * |OpCode|Description|
     * |:-----|:------------|
     * | 0x0  | Continuation frame |
     * | 0x1  | Text frame |
     * | 0x2  | Binary frame |
     * | 0x8  | Connection close frame |
     * | 0x9  | Ping frame |
     * | 0xA  | Pong frame |
     */
    private static buildFrame(data: Buffer, opCode: number, mask: boolean, fin: boolean): Buffer {
        const header: number[] = [(fin ? 0x80 : 0x00) | (opCode & 0x0f)];
        const length = data.length;
        let maskKey: Buffer | null = null;

        if (length <= 125) {
            header.push((mask ? 0x80 : 0x00) | length);
        } else if (length <= 65535) {
            header.push((mask ? 0x80 : 0x00) | 126, (length >> 8) & 255, length & 255);
        } else {
            header.push((mask ? 0x80 : 0x00) | 127);
            const extendedLength = BigInt(length);

            for (let shift = 56n; shift >= 0n; shift -= 8n) {
                header.push(Number((extendedLength >> shift) & 0xffn));
            }
        }

        const payload = mask ? Codec.applyMask(data, maskKey = CRYPTO.randomBytes(4)) : data;
        return Buffer.concat(maskKey ? [Buffer.from(header), maskKey, payload] : [Buffer.from(header), payload]);
    }
    /**
     * Splits a payload into protocol-compliant WebSocket fragments.
     *
     * @param data - The payload data to fragment.
     * @param opCode - The opcode for the first frame.
     * @param mask - Whether the frames should be masked.
     * @param fragmentSize - The maximum payload size per frame.
     * @return An array of encoded frames.
     */
    private static buildFragments(data: Buffer, opCode: number, mask: boolean, fragmentSize: number): Buffer[] {
        if (fragmentSize < 1) throw new RangeError('fragmentSize must be greater than 0');
        if (data.length === 0) return [Codec.buildFrame(data, opCode, mask, true)];

        const frames: Buffer[] = [];

        for (let offset = 0, index = 0; offset < data.length; offset += fragmentSize, index++) {
            const chunk = data.subarray(offset, offset + fragmentSize);
            const isFirst = index === 0;
            const isLast = offset + fragmentSize >= data.length;
            const frameOpCode = isFirst ? opCode : 0x0;

            frames.push(Codec.buildFrame(chunk, frameOpCode, mask, isLast));
        }

        return frames;
    }
    /**
     * Applies a masking key to the given data using the XOR operation, as required by the WebSocket protocol for client-to-server frames.
     * This method takes the payload data and the masking key, and returns a new Buffer containing the masked data.
     * The masking is performed by XORing each byte of the payload with the corresponding byte of the masking key, which is repeated as necessary.
     * 
     * @param data - The payload data to be masked.
     * @param maskKey - The 4-byte masking key to apply to the data.
     * @return A Buffer containing the masked payload data.
     * 
     * Note: The `applyMask` method is an internal helper function used by the `buildFrame` method when encoding client-to-server frames. It is responsible for applying the masking to the payload data according to the WebSocket protocol specifications.
     */
    private static applyMask(data: Buffer, maskKey: Buffer): Buffer {
        const masked = Buffer.allocUnsafe(data.length);

        for (let index = 0; index < data.length; index++) {
            masked[index] = data[index] ^ maskKey[index % 4];
        }

        return masked;
    }
    /**
     * Decodes the payload of a WebSocket frame, applying the masking key if the frame is masked.
     * This method takes the complete frame data, the number of bytes used for the header and extended payload length, and the masking keys if applicable.
     * It returns a Buffer containing the decoded payload data, which is obtained by applying the XOR operation with the masking keys if the frame is masked, or by simply slicing the data if it is not masked.
     * 
     * @param data - The complete WebSocket frame data to decode.
     */
    private static decodePayload(data: Buffer, bytesInfo: number, maskKeys: Buffer | null): Buffer {
        if (!maskKeys) return data.subarray(bytesInfo);

        const payload = Buffer.allocUnsafe(data.length - bytesInfo);

        for (let index = bytesInfo, payloadIndex = 0; index < data.length; index++, payloadIndex++) {
            payload[payloadIndex] = data[index] ^ maskKeys[payloadIndex % 4];
        }

        return payload;
    }
}

export default Codec;