/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides type definitions for JSON Schema, a powerful tool for validating and describing the structure of JSON data.
 * @license Apache-2.0
 */

export namespace JSONSchema {
    export type schemeArray = schemeTypes[];
    export type schemaObject = {
        [key: string]: schemeTypes;
    };

    export interface SchemaTypeMap {
        string: string
        number: number
        boolean: boolean
        object: schemaObject
        array: schemeArray
        null: null
    }

    export type schemaNames = keyof SchemaTypeMap;
    export type schemeTypes = SchemaTypeMap[schemaNames];

    export type schemaVersion = string;

    export type schema = {
        title?: string;
        description?: string;
        multipleOf?: number;
        maximum?: number;
        exclusiveMaximum?: boolean;
        minimum?: number;
        exclusiveMinimum?: boolean;
        maxLength?: number;
        minLength?: number;
        pattern?: string;
        additionalItems?: schema;
        items?: schema | schema[];
        maxItems?: number;
        minItems?: number;
        uniqueItems?: boolean;
        maxProperties?: number;
        minProperties?: number;
        required?: string[];
        properties?: {
            [key: string]: schema;
        };
        additionalProperties?: boolean | schema;
        patternProperties?: {
            [key: string]: schema;
        };
        dependencies?: {
            [key: string]: string[] | schema;
        };
        enum?: schemeTypes[];
        type?: schemaNames | schemaNames[];
        allOf?: schema[];
        anyOf?: schema[];
        oneOf?: schema[];
        not?: schema;
        extends?: string | string[];
        // the commented properties is not available on mongoDB.
        // $ref?: string;
        // $schema?: string;
        // default: JSONSchema.schemeTypes;
        // definition?: string;
        // format?: string;
        // id?: string;
    };
}

/**
 * provide the type definition of a json schema
 * @param schema the json schema to validate
 */
export function schema(schema: JSONSchema.schema) { return schema; }
export const JSONSchema = { schema };
export default JSONSchema;