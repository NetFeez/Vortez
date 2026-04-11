/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests schema validation including required fields, boundaries, nested objects, enums, and JSON Schema mapping.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';

import _Schema from '../../../build/utilities/schema/Schema.js';
import SchemaError from '../../../build/utilities/schema/SchemaError.js';

import TestSuite from '../../support/TestSuite.js';
import SuiteTracker from '../../support/SuiteTracker.js';

export class Schema extends TestSuite {
    public readonly name = 'Schema';
    private readonly tracker = new SuiteTracker('SCHEMA');
    /** Tests the processing of data with default values. */
    private testProcessDataWithDefaults(): void {
        try {
            const schema = new _Schema({
                host: { type: 'string', required: true, minLength: 1 },
                port: { type: 'number', minimum: 0, maximum: 65535, default: 80 },
                ssl: {
                    type: 'object',
                    nullable: true,
                    default: null,
                    schema: {
                        pubKey: { type: 'string', required: true },
                        privKey: { type: 'string', required: true }
                    }
                }
            });

            const data = schema.processData({ host: 'localhost' });
            assert.equal(data.host, 'localhost');
            assert.equal(data.port, 80);
            assert.equal(data.ssl, null);
            this.tracker.logTestResult('processData - Applies defaults', true);
        } catch (error) {
            this.tracker.logTestResult('processData - Applies defaults', false, error);
        }
    }
    /** Tests the failure of required field validation. */
    private testRequiredFieldFailure(): void {
        try {
            const schema = new _Schema({ host: { type: 'string', required: true } });
            try {
                const invalidData = {} as unknown as typeof schema.inferToProcess;
                schema.processData(invalidData);
                this.tracker.logTestResult('required - Missing required key fails', false, new Error('Should have thrown'));
            } catch (error) {
                assert.ok(error instanceof SchemaError);
                this.tracker.logTestResult('required - Missing required key fails', true);
            }
        } catch (error) {
            this.tracker.logTestResult('required - Missing required key fails', false, error);
        }
    }
    /** Tests the enforcement of zero boundaries for string and number properties. */
    private testZeroBoundaries(): void {
        try {
            const stringSchema = new _Schema({ emptyOnly: { type: 'string', required: true, maxLength: 0, minLength: 0 } });
            const numberSchema = new _Schema({ count: { type: 'number', required: true, minimum: 0, maximum: 0 } });
            const validString = stringSchema.processData({ emptyOnly: '' });
            const validNumber = numberSchema.processData({ count: 0 });
            assert.equal(validString.emptyOnly, '');
            assert.equal(validNumber.count, 0);
            function shouldRejectNonEmptyString(): void { stringSchema.processData({ emptyOnly: 'x' }); }
            function shouldRejectNegativeNumber(): void { numberSchema.processData({ count: -1 }); }
            assert.throws(shouldRejectNonEmptyString, SchemaError);
            assert.throws(shouldRejectNegativeNumber, SchemaError);
            this.tracker.logTestResult('limits - Zero boundaries enforced', true);
        } catch (error) {
            this.tracker.logTestResult('limits - Zero boundaries enforced', false, error);
        }
    }
    /** Tests the validation of array properties. */
    private testArrayValidation(): void {
        try {
            const schema = new _Schema({
                tags: {
                    type: 'array',
                    required: true,
                    minimum: 0,
                    maximum: 2,
                    property: { type: 'string', minLength: 1 }
                }
            });
            const valid = schema.processData({ tags: [] });
            assert.deepEqual(valid.tags, []);
            function shouldRejectLargeArray(): void { schema.processData({ tags: ['a', 'b', 'c'] }); }
            function shouldRejectInvalidItem(): void { schema.processData({ tags: [''] }); }
            assert.throws(shouldRejectLargeArray, SchemaError);
            assert.throws(shouldRejectInvalidItem, SchemaError);
            this.tracker.logTestResult('array - Limits and item validation', true);
        } catch (error) {
            this.tracker.logTestResult('array - Limits and item validation', false, error);
        }
    }
    /** Tests the processing of partial data with deep paths. */
    private testDeepPartialProcessing(): void {
        try {
            const schema = new _Schema({
                profile: {
                    type: 'object',
                    required: true,
                    schema: {
                        address: {
                            type: 'object',
                            required: true,
                            schema: {
                                zip: { type: 'number', required: true, minimum: 0 }
                            }
                        }
                    }
                }
            });

            const partial = schema.processPartialData({ 'profile.address.zip': 1200 });
            assert.equal(partial['profile.address.zip'], 1200);
            function shouldRejectUnknownPartialPath(): void { schema.processPartialData({ 'profile.address.missing': 1 }); }
            assert.throws(shouldRejectUnknownPartialPath, SchemaError);
            this.tracker.logTestResult('partial - Deep object path validation', true);
        } catch (error) {
            this.tracker.logTestResult('partial - Deep object path validation', false, error);
        }
    }
    /** Tests the rejection of unknown root keys in partial data. */
    private testPartialUnknownRootKey(): void {
        try {
            const schema = new _Schema({ host: { type: 'string', required: true } });
            const invalidData = { host: 'localhost', extra: 'x' } as unknown as typeof schema.inferToProcess;
            function shouldRejectUnknownRootKey(): void { schema.processData(invalidData, true); }
            assert.throws(shouldRejectUnknownRootKey, SchemaError);
            this.tracker.logTestResult('partial - Unknown root key rejected', true);
        } catch (error) {
            this.tracker.logTestResult('partial - Unknown root key rejected', false, error);
        }
    }
    /** Tests the rejection of array values for object properties. */
    private testObjectRejectsArrayValue(): void {
        try {
            const schema = new _Schema({
                profile: {
                    type: 'object',
                    required: true,
                    schema: { zip: { type: 'number', required: true } }
                }
            });
            const invalidData = { profile: [] } as unknown as typeof schema.inferToProcess;

            function shouldRejectArrayAsObject(): void { schema.processData(invalidData); }
            assert.throws(shouldRejectArrayAsObject, SchemaError);
            this.tracker.logTestResult('object - Arrays are rejected', true);
        } catch (error) {
            this.tracker.logTestResult('object - Arrays are rejected', false, error);
        }
    }
    /** Tests the JSON schema mapping for arrays. */
    private testJsonSchemaArrayMapping(): void {
        try {
            const schema = new _Schema({
                tags: {
                    type: 'array',
                    minimum: 1,
                    maximum: 3,
                    property: { type: 'string', minLength: 2 }
                }
            });

            const json = schema.jsonSchema;
            const tags = json.properties?.tags;
            const tagsItems = tags?.items;

            assert.equal(tags?.type, 'array');
            assert.equal(tags?.minItems, 1);
            assert.equal(tags?.maxItems, 3);
            assert.ok(tagsItems && !Array.isArray(tagsItems));
            assert.equal(tagsItems.type, 'string');
            assert.equal(tagsItems.minLength, 2);
            this.tracker.logTestResult('jsonSchema - Array mapping', true);
        } catch (error) {
            this.tracker.logTestResult('jsonSchema - Array mapping', false, error);
        }
    }
    /** Tests the validation of string enums. */
    private testStringEnumValidation(): void {
        try {
            const schema = new _Schema({ mode: { type: 'string', required: true, enum: ['A', 'B'] } });
            const valid = schema.processData({ mode: 'A' });
            assert.equal(valid.mode, 'A');
            const invalidData = { mode: 'C' } as unknown as typeof schema.inferToProcess;
            function shouldRejectInvalidEnumValue(): void { schema.processData(invalidData); }
            assert.throws(shouldRejectInvalidEnumValue, SchemaError);
            this.tracker.logTestResult('string - Enum validation', true);
        } catch (error) {
            this.tracker.logTestResult('string - Enum validation', false, error);
        }
    }
    /** Tests the JSON schema mapping for string enums. */
    private testJsonSchemaStringEnumMapping(): void {
        try {
            const schema = new _Schema({ mode: { type: 'string', enum: ['A', 'B'] } });
            const json = schema.jsonSchema;
            const mode = json.properties?.mode;
            assert.equal(mode?.type, 'string');
            assert.deepEqual(mode?.enum, ['A', 'B']);
            this.tracker.logTestResult('jsonSchema - String enum mapping', true);
        } catch (error) {
            this.tracker.logTestResult('jsonSchema - String enum mapping', false, error);
        }
    }
    /** Tests the collection of unique keys from the schema. */
    private testUniqueKeyCollection(): void {
        try {
            const schema = new _Schema({
                username: { type: 'string', unique: true },
                profile: {
                    type: 'object',
                    schema: {
                        email: { type: 'string', unique: true },
                        country: { type: 'string' }
                    }
                }
            });

            const uniques = schema.uniques.sort();
            assert.deepEqual(uniques, ['profile.email', 'username']);
            this.tracker.logTestResult('uniques - Nested keys collected', true);
        } catch (error) {
            this.tracker.logTestResult('uniques - Nested keys collected', false, error);
        }
    }
    /** Tests the rejection of invalid schema definitions. */
    private testInvalidSchemaDefinition(): void {
        try {
            const invalidPattern = 'not-a-regexp' as unknown as RegExp;
            function shouldRejectInvalidSchemaDefinition(): void {
                new _Schema({ name: { type: 'string', pattern: invalidPattern } });
            }
            assert.throws(shouldRejectInvalidSchemaDefinition, SchemaError);
            this.tracker.logTestResult('schema - Invalid definition rejected', true);
        } catch (error) {
            this.tracker.logTestResult('schema - Invalid definition rejected', false, error);
        }
    }

    /**
     * Runs the schema test suite.
     * @returns Aggregated suite counters.
     */
    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Schema Test Suite ===\n');
        this.testProcessDataWithDefaults();
        this.testRequiredFieldFailure();
        this.testZeroBoundaries();
        this.testArrayValidation();
        this.testDeepPartialProcessing();
        this.testPartialUnknownRootKey();
        this.testObjectRejectsArrayValue();
        this.testJsonSchemaArrayMapping();
        this.testStringEnumValidation();
        this.testJsonSchemaStringEnumMapping();
        this.testUniqueKeyCollection();
        this.testInvalidSchemaDefinition();
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Schema {}

export default Schema;
