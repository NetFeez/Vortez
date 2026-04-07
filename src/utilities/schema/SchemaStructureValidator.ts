/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Provides utilities for validating the structure of a schema, ensuring that property definitions are consistent and valid according to their types and constraints.
 * @license Apache-2.0
 */

import type { Schema } from './Schema.js';

import { SchemaError } from './SchemaError.js';

export class SchemaStructureValidator {
    /**
     * Validates the structure of a schema, used for validating the structure of a schema and nested objects.
     * @param schema The schema to validate
     * @param parentKey The parent key of the schema, used for error messages
     */
    public static validateStructure(schema: Schema.Schema, parentKey?: string) {
        for (const key in schema) {
            const prop = schema[key];
            this.validateProperty(prop, parentKey ? `${parentKey}.${key}` : key);
        }
    }
    /**
     * Validates a property definition, used for validating the structure of a schema and nested objects.
     * @param prop The property definition to validate
     * @param key The key of the property, used for error messages
     */
    public static validateProperty(prop: Schema.property, key: string): void {
        switch(prop.type) {
            case 'string': this.validateStringProperty(prop, key); break;
            case 'number': this.validateNumberProperty(prop, key); break;
            case 'boolean': break;
            case 'array': this.validateArrayProperty(prop, key); break;
            case 'object': this.validateObjectProperty(prop, key); break;
            default: throw new SchemaError(`Unknown type for property '${key}'`);
        }
        if ('default' in prop) this.validateDefaultValue(prop, key);
    }
    /**
     * Validates a default value against a property definition, used for validating default values.
     * @param prop The property definition to validate against
     * @param key The key of the property, used for error messages
     */
    public static validateDefaultValue(prop: Schema.property, key: string) {
        if (prop.default === undefined) {
            if (!prop.required) return;
            throw new SchemaError(`Property '${key}' default value cannot be undefined`)
        }
        if (prop.default === null) {
            if (prop.nullable) return;
            throw new SchemaError(`Property '${key}' default value cannot be null`);
        }
        switch (prop.type) {
            case 'string': this.validateString(prop.default, prop, key); break;
            case 'number': this.validateNumber(prop.default, prop, key); break;
            case 'boolean': this.validateBoolean(prop.default, prop, key); break;
            case 'array': this.validateArray(prop.default, prop, key); break;
            case 'object': this.validateObject(prop.default, prop, key); break;
            default: throw new SchemaError(`Unknown type for property '${key}'`);
        }
    }
    /**
     * Validates a string property definition, used for validating nested objects.
     * @param prop The string property definition to validate
     * @param key The key of the property, used for error messages
     */
    public static validateStringProperty(prop: Schema.Property.String, key: string): void {
        if (prop.maxLength !== undefined && prop.minLength !== undefined && prop.maxLength < prop.minLength) {
            throw new SchemaError(`Property '${key}' maxLength must be greater than or equal to minLength`);
        }
        if (prop.pattern !== undefined && !(prop.pattern instanceof RegExp)) {
            throw new SchemaError(`Property '${key}' pattern must be a RegExp`);
        }
    }
    /**
     * Validates a number property definition, used for validating nested objects.
     * @param prop The number property definition to validate
     * @param key The key of the property, used for error messages
     */
    public static validateNumberProperty(prop: Schema.Property.Number, key: string): void {
        if (prop.maximum !== undefined && prop.minimum !== undefined && prop.maximum < prop.minimum) {
            throw new SchemaError(`Property '${key}' maximum must be greater than or equal to minimum`);
        }
    }
    /**
     * Validates an array property definition, used for validating nested arrays.
     * @param prop The array property definition to validate
     * @param key The key of the property, used for error messages
     */
    public static validateArrayProperty(prop: Schema.Property.Array, key: string): void {
        if (prop.maximum !== undefined && prop.minimum !== undefined && prop.maximum < prop.minimum) {
            throw new SchemaError(`Property '${key}' maximum must be greater than or equal to minimum`);
        }
        this.validateProperty(prop.property, `${key}[]`);
    }
    /**
     * Validates an object property definition, used for validating nested objects.
     * @param prop The object property definition to validate
     * @param key The key of the property, used for error messages
     */
    public static validateObjectProperty(prop: Schema.Property.Object, key: string): void {
        this.validateStructure(prop.schema, key);
    }
    /**
     * Validates a string value against a string property definition, used for validating default values and nested objects.
     * @param value The value to validate
     * @param prop The string property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateString(value: string, prop: Schema.Property.String, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'string') throw new SchemaError(`Property ${key} must be a string`);
        if (prop.minLength !== undefined && value.length < prop.minLength) {
            throw new SchemaError(`Property ${key} must have a minimum length of ${prop.minLength}`);
        }
        if (prop.maxLength !== undefined && value.length > prop.maxLength) {
            throw new SchemaError(`Property ${key} must have a maximum length of ${prop.maxLength}`);
        }
        if (prop.pattern && !prop.pattern.test(value)) {
            throw new SchemaError(`Property ${key} must match the pattern ${prop.pattern}`);
        }
    }
    /**
     * Validates a number value against a number property definition, used for validating default values.
     * @param value The value to validate
     * @param prop The number property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateNumber(value: number, prop: Schema.Property.Number, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'number') throw new SchemaError(`Property ${key} must be a number`);
        if (prop.minimum !== undefined && value < prop.minimum) {
            throw new SchemaError(`Property ${key} must be greater than or equal to ${prop.minimum}`);
        }
        if (prop.maximum !== undefined && value > prop.maximum) {
            throw new SchemaError(`Property ${key} must be less than or equal to ${prop.maximum}`);
        }
    }
    /**
     * Validates a boolean value against a boolean property definition, used for validating default values.
     * @param value The value to validate
     * @param prop The boolean property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateBoolean(value: boolean, prop: Schema.Property.Boolean, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'boolean') throw new SchemaError(`Property ${key} must be a boolean`);
    }
    /**
     * Validates an object value against an object property definition, used for validating default values and nested objects.
     * @param value The value to validate
     * @param prop The object property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateObject(value: any, prop: Schema.Property.Object, key: string) {
        if (value == null && prop.nullable === true) return;
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new SchemaError(`Property ${key} must be an object`);
        }
        this.validateStructure(prop.schema, key);
    }
    /**
     * Validates an array value against an array property definition, used for validating default values and array items.
     * @param value The value to validate
     * @param prop The array property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateArray(value: any, prop: Schema.Property.Array, key: string) {
        if (value == null && prop.nullable === true) return;
        if (!Array.isArray(value)) throw new SchemaError(`Property ${key} must be an array`);
        if (prop.minimum !== undefined && value.length < prop.minimum) {
            throw new SchemaError(`Property ${key} must have at least ${prop.minimum} items`);
        }
        if (prop.maximum !== undefined && value.length > prop.maximum) {
            throw new SchemaError(`Property ${key} must have at most ${prop.maximum} items`);
        }
        value.forEach((item, index) => {
            this.validateValue(item, prop.property, `${key}[${index}]`);
        });
    }
    /**
     * Validates a value against a property definition, used for validating default values and array items.
     * @param value The value to validate
     * @param prop The property definition to validate against
     * @param key The key of the property, used for error messages
     */
    private static validateValue(value: any, prop: Schema.property, key: string) {
        switch (prop.type) {
            case 'string': this.validateString(value, prop, key); break;
            case 'number': this.validateNumber(value, prop, key); break;
            case 'boolean': this.validateBoolean(value, prop, key); break;
            case 'array': this.validateArray(value, prop, key); break;
            case 'object': this.validateObject(value, prop, key); break;
            default: throw new SchemaError(`Unknown type for property '${key}'`);
        }
    }
}
export namespace SchemaStructureValidator {}
export default SchemaStructureValidator;