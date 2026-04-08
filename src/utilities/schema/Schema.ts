/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides a comprehensive schema validation and processing system, allowing developers to define complex data structures.
 * @license Apache-2.0
 */

import type Utilities from '../Utilities.js';

import _SchemaError from './SchemaError.js';
import _JSONSchema from './JSONSchema.js';
import _SchemaIntrospection from './SchemaIntrospection.js';
import _SchemaStructureValidator from './SchemaStructureValidator.js';

export { SchemaError } from './SchemaError.js';
export { JSONSchema } from './JSONSchema.js';
export { SchemaIntrospection } from './SchemaIntrospection.js';
export { SchemaStructureValidator } from './SchemaStructureValidator.js';

export class Schema<const S extends Schema.Schema> {
    constructor(
        public readonly schema: S
    ) { this.validateStructure(); }
    /**
     * Get the inferred type of the schema.
     * 
     * ⚠️ IMPORTANT: This getter returns an EMPTY object. It is designed ONLY for type inference.
     * 
     * Usage: Use with `typeof` to extract the inferred type:
     * ```typescript
     * type infered = typeof schemaInstance.infer;
     * ```
     * 
     * DO NOT use the returned value at runtime - it's always an empty object.
     * This is purely a TypeScript type utility.
     * 
     * @returns An empty object with the inferred type
     */
    public get infer(): Schema.Infer<this['schema']> {
        return {} as Schema.Infer<this['schema']>;
    }
    /**
     * get the infered schema to process as an object
     * is only to be used for testing purposes
     * this method only returns an empty object with the respective infered type
     * this method is not able to be used out of development
     * @returns the infered schema
     */
    public get inferToProcess(): Schema.InferToProcess<this['schema']> {
        return {} as Schema.InferToProcess<this['schema']>;
    }
    /**
     * get the json schema as an object
     * @returns the json schema
     */
    public get jsonSchema(): Schema.JSONSchema.schema { return this.toJsonSchema(); }
    /**
     * get the json schema as a JSON string
     * @returns the json schema as a string
     */
    public get jsonSchemaJSON(): string { return JSON.stringify(this.jsonSchema); }
    /**
     * get the list of unique keys
     * @returns the list of unique keys
     */
    public get uniques(): string[] { return this.listUniques(); }
    /**
     * Validates the overall structure of the schema.
     * @param schema Optional partial schema to validate, defaults to the full schema.
     * @param parentKey The key path to the current schema, used for error reporting.
     */
    protected validateStructure(schema?: Schema.Schema, parentKey?: string) {
        const useSchema = schema ?? this.schema;
        Schema.SchemaStructureValidator.validateStructure(useSchema, parentKey);
    }
    /**
     * Validates a single property within the schema.
     * @param prop The property to validate.
     * @param key The key of the property, used for error reporting.
     */
    protected validateProperty(prop: Schema.property, key: string): void {
        Schema.SchemaStructureValidator.validateProperty(prop, key);
    }
    /**
     * Validates the default value of a property.
     * @param prop The property to validate.
     * @param key The key of the property, used for error reporting.
    */
    protected validateDefaultValue(prop: Schema.property, key: string) {
        Schema.SchemaStructureValidator.validateDefaultValue(prop, key);
    }
    /**
     * Validates a string property.
     * @param prop The string property definition.
     * @param key The key of the property, used for error reporting.
     */
    protected validateStringProperty(prop: Schema.Property.String, key: string): void {
        Schema.SchemaStructureValidator.validateStringProperty(prop, key);
    }
    /**
     * Validates a number property.
     * @param prop The number property definition.
     * @param key The key of the property, used for error reporting.
     */
    protected validateNumberProperty(prop: Schema.Property.Number, key: string): void {
        Schema.SchemaStructureValidator.validateNumberProperty(prop, key);
    }
    /**
     * process the provided data
     * @param data the data to process
     * @param partial if the data is partial
     * @returns the processed data
     * @throws schemaError if the data is not valid
     */
    public processData(data: Schema.Infer<this['schema']>, partial?: boolean): Schema.Infer<this['schema']>;
    public processData(data: Schema.InferToProcess<this['schema']>, partial?: boolean): Schema.Infer<this['schema']>;
    public processData(data: any, partial: boolean = false): Schema.Infer<this['schema']> {
        const result: any = {};
        const iterable = partial ? data : this.schema;
        for (const key in iterable) {
            if (!this.isKeyOf(this.schema, key)) throw new Schema.SchemaError(`Unknown property ${String(key)}`);
            const prop = this.schema[key];
            const value = this.isKeyOf(data, key) ? data[key] : undefined;
            result[key] = this.processProperty(value, prop, key, partial);
            if (result[key] === undefined) delete result[key];
        }
        return result;
    }
    /**
     * process the provided data as partial, meaning that it will only validate the provided properties and ignore the rest.
     * this is useful for validating data that is only meant to update a document, where only a subset of the properties are provided.
     * @param data the data to process
     * @returns the processed data
     * @throws schemaError if the data is not valid
     */
    public processPartialData(
        data: Partial<Schema.FlattenToProcess<this['schema']>> & Partial<Schema.InferToProcess<this['schema']>> & Schema.Document,
    ): Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document;
    public processPartialData(
        data: Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document,
    ): Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document;
    public processPartialData(data: any): Partial<Schema.Flatten<this['schema']>> & Partial<Schema.Infer<this['schema']>> & Schema.Document {
        const result: any = {};
        let currentProp: Schema.property;
        for (const key in data) {
            const value = this.isKeyOf(data, key) ? data[key] : undefined;
            const subKeys = key.split('.');
            const firstKey = subKeys.shift();
            if (!firstKey || !(firstKey in this.schema)) throw new Schema.SchemaError(`Unknown property ${firstKey}`);
            currentProp = this.schema[firstKey];
            if (subKeys.length === 0) result[key] = this.processProperty(value, currentProp, key);
            else {
                if (currentProp.type !== 'object') throw new Schema.SchemaError(`Property ${key} is not an object`);
                let objectProp = currentProp;
                let usedKeys: string[] = []
                for (const subKey of subKeys) {
                    usedKeys.push(subKey);
                    if (!(subKey in objectProp.schema)) throw new Schema.SchemaError(`Unknown property ${firstKey}.${usedKeys.join('.')}`);
                    currentProp = objectProp.schema[subKey];
                    if (currentProp.type === 'object') objectProp = currentProp;
                }
                result[key] = this.processProperty(value, currentProp, key);
            }
            if (result[key] === undefined) delete result[key];
        }
        return result;
    }
    /**
     * process a property
     * @param data the data to process
     * @param prop the property to process
     * @param key the key of the property
     * @param partial if the data is partial
     * @returns the processed data
     * @throws schemaError if the data is not valid
     */
    protected processProperty(data: any, prop: Schema.property, key: string, partial: boolean = false): any {
        if (data === undefined || data === null) {
            if ('default' in prop) return prop.default;
            if (prop.nullable && prop.nullable === true) return null;
            if (prop.required && prop.required === true) throw new Schema.SchemaError(`Property ${key} is required but not provided`);
            else return undefined;
        }
        switch (prop.type) {
            case 'string': this.validateString(data, prop, key); return data;
            case 'number': this.validateNumber(data, prop, key); return data;
            case 'boolean': this.validateBoolean(data, prop, key); return data;
            case 'array': this.validateArray(data, prop, key); return this.processArray(data, prop, key);
            case 'object': this.validateObject(data, prop, key, partial); return this.processObject(data, prop, key, partial);
            default: throw new Schema.SchemaError(`Unknown type in property ${key}`);
        }
    }
    /**
     * validate a array
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
     */
    protected processArray(value: any[], prop: Schema.Property.Array, key: string): any {
        try { return value.map((item, index) =>  this.processProperty(item, prop.property, `${key}[${index}]`)); }
        catch (error) { throw new Schema.SchemaError(`Property ${key} is not valid: ${error}`); }
    }
    /**
     * validate a object
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @returns the data
     * @throws schemaError if the data is not valid
     */
    protected processObject(value: any, prop: Schema.Property.Object, key: string, partial: boolean = false): any {
        const handler = new Schema(prop.schema);
        try { return handler.processData(value, partial); }
        catch (error) { throw new Schema.SchemaError(`Property ${key} is not valid: ${error}`); }
    }
    /**
     * validate a string
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateString(value: string, prop: Schema.Property.String, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'string') throw new Schema.SchemaError(`Property ${key} must be a string`);
        if (prop.enum !== undefined && !prop.enum.includes(value)) {
            throw new Schema.SchemaError(`Property ${key} must be one of: ${prop.enum.join(', ')}`);
        }
        if (prop.minLength !== undefined && value.length < prop.minLength) {
            throw new Schema.SchemaError(`Property ${key} must have a minimum length of ${prop.minLength}`);
        }
        if (prop.maxLength !== undefined && value.length > prop.maxLength) {
            throw new Schema.SchemaError(`Property ${key} must have a maximum length of ${prop.maxLength}`);
        }
        if (prop.pattern && !prop.pattern.test(value)) {
            throw new Schema.SchemaError(`Property ${key} must match the pattern ${prop.pattern}`);
        }
    }
    /**
     * validate a number
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateNumber(value: number, prop: Schema.Property.Number, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'number') throw new Schema.SchemaError(`Property ${key} must be a number`);
        if (prop.minimum !== undefined && value < prop.minimum) {
            throw new Schema.SchemaError(`Property ${key} must be greater than or equal to ${prop.minimum}`);
        }
        if (prop.maximum !== undefined && value > prop.maximum) {
            throw new Schema.SchemaError(`Property ${key} must be less than or equal to ${prop.maximum}`);
        }
    }
    /**
     * validate a boolean
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateBoolean(value: boolean, prop: Schema.Property.Boolean, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'boolean') throw new Schema.SchemaError(`Property ${key} must be a boolean`);
    }
    /**
     * validate a object
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
    */
    protected validateObject(value: any, prop: Schema.Property.Object, key: string, partial = true) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Schema.SchemaError(`Property ${key} must be an object`);
        }
        this.validateStructure(prop.schema, key);
    }
    /**
     * validate a array
     * @param value the value to validate
     * @param prop the property to validate
     * @param key the key of the property
     * @throws schemaError if the data is not valid
     */
    protected validateArray(value: any, prop: Schema.Property.Array, key: string) {
        if (value == null && prop.nullable === true) return;
        if (!Array.isArray(value)) throw new Schema.SchemaError(`Property ${key} must be an array`);
        if (prop.minimum !== undefined && value.length < prop.minimum) {
            throw new Schema.SchemaError(`Property ${key} must have at least ${prop.minimum} items`);
        }
        if (prop.maximum !== undefined && value.length > prop.maximum) {
            throw new Schema.SchemaError(`Property ${key} must have at most ${prop.maximum} items`);
        }
    }
    /**
     * generate a list of unique keys
     * @param doc the schema to validate
     * @param parentKey the parent key of the schema
     * @returns a list of unique keys
    */
    protected listUniques(doc?: Schema.Schema, parentKey?: string): string[] {
        const useDoc = doc ?? this.schema;
        return Schema.SchemaIntrospection.listUniques(useDoc, parentKey);
    }
    /**
     * convert a schema to a JSON schema
     * @param schema the schema to convert
     * @returns the JSON schema
    */
    protected toJsonSchema(schema?: Schema.Schema): Schema.JSONSchema.schema {
        const useSchema = schema ?? this.schema;
        return Schema.SchemaIntrospection.toJsonSchema(useSchema);
    }
    /**
     * -- TYPE GUARD --
     * verify if the key is in the schema
     * @param doc the object to verify
     * @param key the key to verify
     * @returns true if the key is in the schema
     */
    private isKeyOf<T extends Object>(
        doc: T,
        key: any
    ): key is keyof T { return key in doc; }
}

export namespace Schema {
    export import SchemaError = _SchemaError;
    export import JSONSchema = _JSONSchema;
    export import SchemaIntrospection = _SchemaIntrospection;
    export import SchemaStructureValidator = _SchemaStructureValidator;

    export type Infer<S extends Schema> = Schema.Infer.schema<S>;
    export type InferToProcess<S extends Schema> = Schema.Infer.schemaToProcess<S>;
    export type Flatten<S extends Schema.Schema> = (
        Utilities.Flatten.Object<Infer.schema<S>, 10>
    );
    export type FlattenToProcess<S extends Schema.Schema> = (
        Utilities.Flatten.Object<Infer.schemaToProcess<S>, 10>
    );
    export interface Document {
        [Key: string]: any;
    }
    export interface TypeMap {
        string: string;
        number: number;
        boolean: boolean;
        object: any;
        array: any[];
    }
    export namespace Helper {
        export type HasDefault<T> = T extends { default: any } ? true : false;
        export type IsRequired<T> = T extends { required: true } ? true : false;
        export type IsNullable<T> = T extends { nullable: true } ? true : false;
        export type DefaultValue<T> = T extends { default: infer D } ? D : never;
        export type Prettify<T> = { [K in keyof T]: T[K] } & {};
    }
    export namespace Property {
        interface Base<T extends keyof TypeMap> {
            type: T;
            required?: boolean;
            nullable?: boolean;
            unique?: boolean;
            default?: TypeMap[T] | null;
        }
        export interface String extends Base<'string'> {
            enum?: readonly string[];
            pattern?: RegExp;
            minLength?: number;
            maxLength?: number;
        }
        export interface Number extends Base<'number'> {
            minimum?: number;
            maximum?: number;
        }
        export interface Boolean extends Base<'boolean'> {}
        export interface Object extends Base<'object'> {
            schema: Schema;
        }
        export interface Array extends Base<'array'> {
            property: property;
            minimum?: number;
            maximum?: number;
        }
        export interface Map {
            string: String;
            number: Number;
            boolean: Boolean;
            object: Object;
            array: Array;
        }
    }
    export type property = Property.Map[keyof Property.Map];
    export interface Schema {
        [Key: string]: property;
    }
    export namespace Infer {
        export type Mode = 'partial' | 'process' | 'complete';

        type ObjectByMode<S extends Schema.Schema, M extends Mode> = (
            M extends 'process'
                ? schemaToProcess<S>
                : M extends 'partial'
                    ? schemaPartial<S>
                    : schema<S>
        );

        export type propertyType<P extends Schema.property, M extends Mode = 'complete'> = (
            P extends Property.String
                ? P extends { enum: readonly (infer E extends string)[] }
                    ? E
                    : string
                :
            P extends Property.Number  ? number  :
            P extends Property.Boolean ? boolean :
            P extends Property.Object
            ? ( ObjectByMode<P['schema'], M> )
            : P extends Property.Array
                ? propertyType<P['property'], M>[]
                :never
        );

        type OptionalPropertyValue<P extends Schema.property, M extends Mode> = (
            Helper.IsNullable<P> extends true
                ? propertyType<P, M> | null
                : propertyType<P, M> | undefined
        );

        type DefaultedPropertyValue<P extends Schema.property, M extends Mode> = (
            Helper.DefaultValue<P> extends null
                ? propertyType<P, M> | null
                : propertyType<P, M>
        );

        type RequiredPropertyValue<P extends Schema.property, M extends Mode> = (
            Helper.IsNullable<P> extends true
                ? propertyType<P, M> | null
                : propertyType<P, M>
        );

        export type property<P extends Schema.property, M extends Mode = 'complete'> = (
            Helper.HasDefault<P> extends true
                ? DefaultedPropertyValue<P, M>
                : Helper.IsRequired<P> extends true
                    ? RequiredPropertyValue<P, M>
                    : OptionalPropertyValue<P, M>
        );

        type RequiredKeys<S extends Schema> = {
            [K in keyof S]: Helper.IsRequired<S[K]> extends true
                ? K
                : Helper.HasDefault<S[K]> extends true
                    ? K
                    : never;
        }[keyof S];

        type OptionalKeys<S extends Schema> = Exclude<keyof S, RequiredKeys<S>>;

        type RequiredToProcessKeys<S extends Schema> = {
            [K in keyof S]: Helper.IsRequired<S[K]> extends true
                ? Helper.HasDefault<S[K]> extends false ? K : never
                : never;
        }[keyof S];

        type OptionalToProcessKeys<S extends Schema> = Exclude<keyof S, RequiredToProcessKeys<S>>;

        // export type schema<S extends Schema> = {
        //     [K in RequiredKeys<S>]: property<S[K]>;
        // } & {
        //     [K in OptionalKeys<S>]?: property<S[K]>;
        // };
        export type schema<S extends Schema> = Helper.Prettify<{
            [K in RequiredKeys<S>]: property<S[K]>;
        } & {
            [K in OptionalKeys<S>]?: property<S[K]>;
        }>;

        // export type schemaToProcess<S extends Schema> = ({
        //     [K in RequiredToProcessKeys<S>]: property<S[K], 'process'>;
        // } & {
        //     [K in OptionalToProcessKeys<S>]?: property<S[K], 'process'>;
        // });
        export type schemaToProcess<S extends Schema> = Helper.Prettify<{
            [K in RequiredToProcessKeys<S>]: property<S[K], 'process'>;
        } & {
            [K in OptionalToProcessKeys<S>]?: property<S[K], 'process'>;
        }>;

        // export type schemaPartial<S extends Schema> = {
        //     [K in keyof S]?: property<S[K], 'partial'>;
        // };
        export type schemaPartial<S extends Schema> = Helper.Prettify<{
            [K in keyof S]?: property<S[K], 'partial'>;
        }>;
        export type schemaBase<S extends Schema> = {
            [K in keyof S]: property<S[K]>
        };
    }
}
export default Schema;