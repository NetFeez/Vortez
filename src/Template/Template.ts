/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Add the vhtml template engine to the Vortez.
 * @license Apache-2.0
 */

import { promises as FSP, createReadStream } from 'fs';
import { Readable } from 'stream';

import Utilities from '../utilities/Utilities.js';
import Compiler from './Compiler.js';
import { StreamCompiler } from './StreamCompiler.js';

export class Template {
    /**
     * Load and compile a template.
     * This method reads a template file from the specified path,
     * checks if it's a valid file, and then compiles its content
     * using the provided data object.
     *
     * @example `Template.load('./templates/myTemplate.html', { username: 'John Doe' });`
     * @param path - The path to the template file.
     * @param data - The data used to compile the template.
     * @returns The compiled template.
     * @throws Error if the path is not a file.
     * @throws Error if the file does not exist.
     */
    public static async load(path: string, data: Compiler.Data): Promise<string> {
        path = Utilities.Path.normalize(path);
		if (!Utilities.File.exists(path)) throw new Error('template file does not exist');
        const details = await FSP.stat(path);
        if (!details.isFile()) throw new Error('the path is not a template file');
        const template = await FSP.readFile(path);
        return Compiler.compile(template.toString('utf-8'), data);
    }
    /**
     * Load and compile a template using streams.
     * Ideal for large files or serving directly to a response.
     * @example `Template.stream('./views/index.vhtml', data).pipe(res);`
     * @param path - The path to the template file.
     * @param data - The data used to compile the template.
     * @returns A Readable stream with the compiled content.
     */
    public static async stream(path: string, data: Compiler.Data): Promise<Readable> {
        path = Utilities.Path.normalize(path);
		if (!Utilities.File.exists(path)) throw new Error('template file does not exist');
		const details = await FSP.stat(path);

        if (!details.isFile()) throw new Error('the path is not a template file');
        const readStream = createReadStream(path);
        const compiler = new StreamCompiler(data);

        readStream.on('error', (err) => compiler.emit('error', err));

        return readStream.pipe(compiler);
    }
	/**
	 * Compile a template string with the provided data.
	 * @param content - The template content to compile.
	 * @param data - The data used to compile the template.
	 * @returns The compiled template.
	 */
	public static compile(content: string, data: Compiler.Data): string {
		return Compiler.compile(content, data);
	}
	/**
	 * Compile a template from a stream with the provided data.
	 * @param stream - The Readable stream containing the template content.
	 * @param data - The data used to compile the template.
	 * @returns A StreamCompiler instance that can be piped to a Writable stream.
	 */
	public static compileStream(stream: Readable, data: Compiler.Data): StreamCompiler {
		const compiler = new StreamCompiler(data);
		stream.on('error', (err) => compiler.emit('error', err));
		stream.pipe(compiler);
		return compiler;
	}
}
export namespace Template {}
export default Template;