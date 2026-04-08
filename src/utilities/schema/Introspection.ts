/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides utilities for schema introspection, including listing unique properties and converting custom schemas to JSON Schema format.
 * @license Apache-2.0
 */

import type { JSONSchema } from './JSONSchema.js';
import type { Schema } from './Schema.js';

export class Introspection {
    /**
     * Lists all unique properties in a schema, including nested unique properties, and returns their full paths.
     * @param doc The schema to list unique properties from
     * @param parentKey The parent key of the current schema, used for building full paths of nested properties
     * @returns An array of full paths to unique properties in the schema
     */
    public static listUniques(doc: Schema.Schema, parentKey?: string): string[] {
        const uniques: string[] = [];
        for (const key in doc) {
            const prop = doc[key];
            if (key !== '_id' && prop.unique) uniques.push(parentKey ? `${parentKey}.${key}` : key);
            if (prop.type === 'object') {
                uniques.push(...this.listUniques(prop.schema, parentKey ? `${parentKey}.${key}` : key));
            }
        }
        return uniques;
    }
    /**
     * Converts a schema to a JSON Schema, used for validating data against the schema and generating documentation.
     * @param schema The schema to convert to JSON Schema
     * @returns The JSON Schema representation of the input schema
     */
    public static toJsonSchema(schema: Schema.Schema): JSONSchema.schema {
        const sch: JSONSchema.schema = {};
        sch.type = 'object';
        sch.properties = {};
        for (const key in schema) {
            const prop = schema[key];
            let subSch: JSONSchema.schema = {};
            subSch.type = prop.nullable ? [prop.type, 'null'] : prop.type;
            if (prop.required) {
                if (sch.required == null) sch.required = [];
                sch.required.push(key);
            }
            switch (prop.type) {
                case 'string': {
                    if (prop.enum !== undefined) subSch.enum = [...prop.enum];
                    if (prop.minLength !== undefined) subSch.minLength = prop.minLength;
                    if (prop.maxLength !== undefined) subSch.maxLength = prop.maxLength;
                    if (prop.pattern !== undefined) subSch.pattern = prop.pattern.source;
                    break;
                }
                case 'boolean': break;
                case 'number': {
                    if (prop.minimum !== undefined) subSch.minimum = prop.minimum;
                    if (prop.maximum !== undefined) subSch.maximum = prop.maximum;
                    break;
                }
                case 'array': {
                    if (prop.minimum !== undefined) subSch.minItems = prop.minimum;
                    if (prop.maximum !== undefined) subSch.maxItems = prop.maximum;

                    const itemContainer = this.toJsonSchema({ item: prop.property });
                    const itemSchema = itemContainer.properties?.item;
                    if (itemSchema) subSch.items = itemSchema;
                    break;
                }
                case 'object': {
                    subSch = this.toJsonSchema(prop.schema);
                    if (prop.nullable) subSch.type = ['object', 'null'];
                    break;
                }
            }
            sch.properties[key] = subSch;
        }
        return sch;
    }
}
export namespace Introspection {}
export default Introspection;