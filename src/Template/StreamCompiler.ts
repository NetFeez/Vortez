/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Add the vhtml template stream compiler to the Vortez.
 * @license Apache-2.0
 */

import { Transform, TransformCallback } from 'stream';
import { Compiler } from './Compiler.js';

export class StreamCompiler extends Transform {
    private buffer: string = '';
    private data: Compiler.Data;

    constructor(data: Compiler.Data) { 
        super(); 
        this.data = data; 
    }

public override _transform(chunk: unknown, encoding: BufferEncoding, callback: TransformCallback) {
        if (typeof chunk === 'string') this.buffer += chunk;
        else if (Buffer.isBuffer(chunk)) this.buffer += chunk.toString('utf-8');
        else return callback(new Error('Invalid chunk type. Expected string or Buffer.'));
        
        const matches = Array.from(this.buffer.matchAll(/<(vortez-if|vortez-each)|<\/(vortez-if|vortez-each)>/g));
        
        let depth = 0;
        let lastBalancedIndex = -1;

        if (matches.length > 0) {
            for (const match of matches) {
                if (match[0].startsWith('</')) depth--;
                else depth++;
                if (depth === 0) lastBalancedIndex = match.index! + match[0].length;
            }
        } else {
            const lastVar = Math.max(
                this.buffer.lastIndexOf('}}'),
                this.buffer.lastIndexOf('/>')
            );
            if (lastVar !== -1) lastBalancedIndex = this.buffer.indexOf('>', lastVar) + 1 || lastVar + 2;
        }
        if (lastBalancedIndex !== -1) {
            const completePart = this.buffer.substring(0, lastBalancedIndex);
            this.buffer = this.buffer.substring(lastBalancedIndex);
            this.push(Compiler.compile(completePart, this.data));
        }

        callback();
    }

    public override _flush(callback: TransformCallback) {
        if (this.buffer.trim()) this.push(Compiler.compile(this.buffer, this.data));
        callback();
    }
}
export namespace StreamCompiler {}
export default StreamCompiler;