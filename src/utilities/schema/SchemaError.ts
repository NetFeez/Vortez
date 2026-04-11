/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Defines a custom error class for handling schema-related errors in the schema validation and processing system.
 * @license Apache-2.0
 */

export class SchemaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'schemaError';
    }
}
export namespace SchemaError {}
export default SchemaError;