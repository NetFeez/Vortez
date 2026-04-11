/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Add the vhtml template compiler to the Vortez.
 * @license Apache-2.0
 */

export const VARIABLE = /\{\{\s*?(?<name>\w+)(?:\s*\|\|\s*(?<quote>["'])(?<default>.*?)\k<quote>)?\s*\}\}/g;
export const VARIABLE_TAG = /<vortez-var\s+name=["'](?<name>\w+)["'](?:\s+default=["'](?<default>.*?)["'])?\s*(?:\/>|>(?<content>.*?)<\/vortez-var>)/g;
export const EACH_BLOCK = /<vortez-each\s+name=["'](?<name>\w+)["'](?:\s+value=["'](?<valueName>\w+)["'])?(?:\s+key=["'](?<keyName>\w+)["'])?\s*>(?<loop>[^]+?)<\/vortez-each>/g;
export const IF_BLOCK = /<vortez-if\s+name=["'](?<name>\w+)["'](?:\s+condition=["'](?<condition>==|!=)["']\s+expected=["'](?<expected>.*?)["'])?\s*>(?<content>[^]+?)<\/vortez-if>/g;

export class Compiler {
	/**
	 * Compile a template.
	 * This internal method takes the raw template content and the data object
	 * and performs the actual compilation, replacing variables and processing
	 * object/array blocks according to the defined syntax.
	 *
	 * @example `Template.compile('Hello, ${name}!', { name: 'Alice' });`
	 * @param content - The content of the template.
	 * @param data - The data used to compile the template.
	 * @returns The compiled template.
	 * @throws Error if key and value names are equal in object blocks.
	 */
	public static compile(content: string, data: Compiler.Data): string {
        content = Compiler.compileEachBlocks(content, data);
        content = Compiler.compileIfBlocks(content, data);
		content = Compiler.compileVariables(content, data);
		return content;
	}
    /**
     * Compile all the variables in the template content using the provided data object.
     * @param content - The raw template content containing variable placeholders.
     * @param data - The data object used for variable substitution.
     * @returns The template content with all variables replaced by their corresponding values from the data object.
     */
    private static compileVariables(content: string, data: Compiler.Data): string {
        content = content.replace(VARIABLE, (text, ...args) => {
            const groups: Compiler.VariableGroups = args.pop();
			const { name, default: defaultValue } = groups;
			return name && name in data ? data[name] : defaultValue || text;
		});
        content = content.replace(VARIABLE_TAG, (text, ...args) => {
            const groups: Compiler.VariableGroups & { content?: string } = args.pop();
            const { name, default: defaultValue, content: tagContent } = groups;
            return name && name in data ? data[name] : defaultValue || tagContent || text;
        });
        return content;
    }
    /**
     * Finds the index of the closing tag corresponding to a given opening tag in the template content, accounting for nested tags of the same type.
     * @param content - The raw template content containing the tags.
     * @param openTag - The opening tag to match (e.g., '<vortez-each').
     * @param closeTag - The closing tag to match (e.g., '</vortez-each>').
     * @param startIndex - The index in the content where the search should begin (typically right after the opening tag).
     * @returns The index of the closing tag that matches the opening tag, or -1 if no matching closing tag is found.
     */
    private static findClosingTag(content: string, openTag: string, closeTag: string, startIndex: number): number {
        let depth = 0;
        const tagRegex = new RegExp(`${openTag}|${closeTag}`, 'g');
        tagRegex.lastIndex = startIndex;

        let match;
        while ((match = tagRegex.exec(content)) !== null) {
            if (match[0].startsWith(openTag.substring(0, 3))) depth++;
            if (match[0] === closeTag) depth--;
            if (depth === 0) return match.index;
        }
        return -1;
    }
    /**
     * Compile all the if/else blocks in the template content using the provided data object.
     * @param content - The raw template content containing if/else block placeholders.
     * @param data - The data object used for block processing.
     * @returns The template content with all if/else blocks processed and replaced by their corresponding generated content based on the data object.
     */
    public static compileEachBlocks(content: string, data: Compiler.Data): string {
        const openTagMatch = /<vortez-each\s+name=["'](?<name>\w+)["']/.exec(content);
        if (!openTagMatch) return content;

        const startIdx = openTagMatch.index;
        const endHeaderIdx = content.indexOf('>', startIdx);
        const closingIdx = this.findClosingTag(content, '<vortez-each', '</vortez-each>', startIdx);

        if (closingIdx === -1) return `<p>the block is not closed: ${content.substring(startIdx, startIdx + 30)}...</p>`;

        const fullBlock = content.substring(startIdx, closingIdx + 14);
        const innerLoop = content.substring(endHeaderIdx + 1, closingIdx);
        
        const header = content.substring(startIdx, endHeaderIdx);
        const name = openTagMatch.groups?.name!;
        const valueName = /value=["'](?<v>\w+)["']/.exec(header)?.groups?.v || 'value';
        const keyName = /key=["'](?<k>\w+)["']/.exec(header)?.groups?.k || 'key';

        const iterable = data[name];
        let result = "";

        if (!iterable) return `<p>the iterable "${name}" is not defined</p>`;
        if (keyName === valueName) return `<p>the key and value names must be different in block: ${fullBlock}</p>`;

        if (iterable instanceof Object) {
            result = Object.entries(iterable).map(([k, v]) => {
                const context = { ...data, [keyName]: k, [valueName]: v };
                return this.compile(innerLoop, context);
            }).join('');
        }

        return this.compileEachBlocks(content.replace(fullBlock, result), data);
    }

    public static compileIfBlocks(content: string, data: Compiler.Data): string {
        const openTagMatch = /<vortez-if\s+name=["'](?<name>\w+)["']/.exec(content);
        if (!openTagMatch) return content;

        const startIdx = openTagMatch.index;
        const endHeaderIdx = content.indexOf('>', startIdx);
        const closingIdx = this.findClosingTag(content, '<vortez-if', '</vortez-if>', startIdx);

        if (closingIdx === -1) return `<p>the block is not closed: ${content.substring(startIdx, startIdx + 30)}...</p>`;

        const fullBlock = content.substring(startIdx, closingIdx + 12);
        const innerContent = content.substring(endHeaderIdx + 1, closingIdx);
        
        const header = content.substring(startIdx, endHeaderIdx);
        const name = openTagMatch.groups?.name!;
        const condition = /condition=["'](?<c>==|!=)["']/.exec(header)?.groups?.c;
        const expected = /expected=["'](?<e>.*?)["']/.exec(header)?.groups?.e;

        const [ifPart, elsePart] = innerContent.split(/<vortez-else\s*?\/>/);
        const value = data[name];
        let isTrue = false;

        if (condition && expected !== undefined) {
            const resExpected = expected.includes('{{') ? this.compileVariables(expected, data) : expected;
            isTrue = (condition === '==') ? String(value) === String(resExpected) : String(value) !== String(resExpected);
        } else isTrue = !!value;

        const compiledPart = this.compile(isTrue ? ifPart : (elsePart || ""), data);

        return this.compileIfBlocks(content.replace(fullBlock, compiledPart), data);
    }
}
export namespace Compiler {
    export interface VariableGroups {
        name: string;
        default?: string;
    }
    export interface EachBlockGroups {
        name: string;
        keyName?: string;
        valueName?: string;
        loop: string;
    }
    export interface IfBlockGroups {
        name: string;
        condition?: '==' | '!=';
        expected?: string;
        content: string;
    }
	export interface Data {
		[key: string]: any
	}
}
export default Compiler;