// @ts-check
import { strict as assert } from 'assert';

import { Logger } from '../../build/Vortez.js';
import { Schema } from '../../build/utilities/schema/Schema.js';
import { SchemaError } from '../../build/utilities/schema/SchemaError.js';

const logger = new Logger({ prefix: 'SCHEMA' });

let testsPassed = 0;
let testsFailed = 0;

const x = new Schema({
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
const y = x.processData({ host: 'localhost' });

/**
 * Logs test results.
 * @param { string } testName The test name.
 * @param { boolean } passed Whether the test passed.
 * @param { unknown | null } error Optional error object for failures.
 */
function logTestResult(testName, passed, error = null) {
    if (passed) {
        logger.log(`&C2✓ ${testName}`);
        testsPassed++;
    } else {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`&C1✗ ${testName}${error ? ': ' + message : ''}`);
        testsFailed++;
    }
}

/**
 * Ensures processData applies defaults and keeps valid values.
 */
function testProcessDataWithDefaults() {
    try {
        const schema = new Schema({
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

        logTestResult('processData - Applies defaults', true);
    } catch (error) {
        logTestResult('processData - Applies defaults', false, error);
    }
}

/**
 * Ensures required keys fail when not provided.
 */
function testRequiredFieldFailure() {
    try {
        const schema = new Schema({
            host: { type: 'string', required: true }
        });

        try {
            // @ts-expect-error Runtime validation test with missing required key on purpose.
            schema.processData({});
            logTestResult('required - Missing required key fails', false, new Error('Should have thrown'));
        } catch (error) {
            assert.ok(error instanceof SchemaError);
            logTestResult('required - Missing required key fails', true);
        }
    } catch (error) {
        logTestResult('required - Missing required key fails', false, error);
    }
}

/**
 * Covers edge cases where numeric/string limits are 0.
 */
function testZeroBoundaries() {
    try {
        const stringSchema = new Schema({
            emptyOnly: { type: 'string', required: true, maxLength: 0, minLength: 0 }
        });
        const numberSchema = new Schema({
            count: { type: 'number', required: true, minimum: 0, maximum: 0 }
        });

        const validString = stringSchema.processData({ emptyOnly: '' });
        const validNumber = numberSchema.processData({ count: 0 });

        assert.equal(validString.emptyOnly, '');
        assert.equal(validNumber.count, 0);

        assert.throws(() => stringSchema.processData({ emptyOnly: 'x' }), SchemaError);
        assert.throws(() => numberSchema.processData({ count: -1 }), SchemaError);

        logTestResult('limits - Zero boundaries enforced', true);
    } catch (error) {
        logTestResult('limits - Zero boundaries enforced', false, error);
    }
}

/**
 * Ensures array size validation and element validation work together.
 */
function testArrayValidation() {
    try {
        const schema = new Schema({
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

        assert.throws(() => schema.processData({ tags: ['a', 'b', 'c'] }), SchemaError);
        assert.throws(() => schema.processData({ tags: [''] }), SchemaError);

        logTestResult('array - Limits and item validation', true);
    } catch (error) {
        logTestResult('array - Limits and item validation', false, error);
    }
}

/**
 * Ensures deep dot-path updates in processPartialData work.
 */
function testDeepPartialProcessing() {
    try {
        const schema = new Schema({
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

        assert.throws(() => schema.processPartialData({ 'profile.address.missing': 1 }), SchemaError);

        logTestResult('partial - Deep object path validation', true);
    } catch (error) {
        logTestResult('partial - Deep object path validation', false, error);
    }
}

/**
 * Ensures processData in partial mode rejects unknown root keys.
 */
function testPartialUnknownRootKey() {
    try {
        const schema = new Schema({
            host: { type: 'string', required: true }
        });

        assert.throws(
            // @ts-expect-error Runtime validation test with unknown key on purpose.
            () => schema.processData({ host: 'localhost', extra: 'x' }, true),
            SchemaError
        );

        logTestResult('partial - Unknown root key rejected', true);
    } catch (error) {
        logTestResult('partial - Unknown root key rejected', false, error);
    }
}

/**
 * Ensures object properties reject arrays as invalid object values.
 */
function testObjectRejectsArrayValue() {
    try {
        const schema = new Schema({
            profile: {
                type: 'object',
                required: true,
                schema: {
                    zip: { type: 'number', required: true }
                }
            }
        });

        assert.throws(
            // @ts-expect-error Runtime validation test with invalid object value on purpose.
            () => schema.processData({ profile: [] }),
            SchemaError
        );

        logTestResult('object - Arrays are rejected', true);
    } catch (error) {
        logTestResult('object - Arrays are rejected', false, error);
    }
}

/**
 * Ensures JSON Schema output maps arrays with items/minItems/maxItems.
 */
function testJsonSchemaArrayMapping() {
    try {
        const schema = new Schema({
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

        logTestResult('jsonSchema - Array mapping', true);
    } catch (error) {
        logTestResult('jsonSchema - Array mapping', false, error);
    }
}

/**
 * Ensures string enum validation accepts only allowed values.
 */
function testStringEnumValidation() {
    try {
        const schema = new Schema({
            mode: { type: 'string', required: true, enum: ['A', 'B'] }
        });

        const valid = schema.processData({ mode: 'A' });
        assert.equal(valid.mode, 'A');

        assert.throws(() => schema.processData({ mode: 'C' }), SchemaError);

        logTestResult('string - Enum validation', true);
    } catch (error) {
        logTestResult('string - Enum validation', false, error);
    }
}

/**
 * Ensures JSON Schema output contains enum for string properties.
 */
function testJsonSchemaStringEnumMapping() {
    try {
        const schema = new Schema({
            mode: { type: 'string', enum: ['A', 'B'] }
        });

        const json = schema.jsonSchema;
        const mode = json.properties?.mode;

        assert.equal(mode?.type, 'string');
        assert.deepEqual(mode?.enum, ['A', 'B']);

        logTestResult('jsonSchema - String enum mapping', true);
    } catch (error) {
        logTestResult('jsonSchema - String enum mapping', false, error);
    }
}

/**
 * Ensures nested unique keys are listed with dot notation.
 */
function testUniqueKeyCollection() {
    try {
        const schema = new Schema({
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

        logTestResult('uniques - Nested keys collected', true);
    } catch (error) {
        logTestResult('uniques - Nested keys collected', false, error);
    }
}

/**
 * Ensures invalid schema definitions fail at construction time.
 */
function testInvalidSchemaDefinition() {
    try {
        assert.throws(() => {
            // @ts-ignore Runtime validation test with invalid shape on purpose.
            new Schema({ name: { type: 'string', pattern: 'not-a-regexp' } });
        }, SchemaError);

        logTestResult('schema - Invalid definition rejected', true);
    } catch (error) {
        logTestResult('schema - Invalid definition rejected', false, error);
    }
}

function runTests() {
    logger.log('\n&C6=== Schema Test Suite ===\n');

    testProcessDataWithDefaults();
    testRequiredFieldFailure();
    testZeroBoundaries();
    testArrayValidation();
    testDeepPartialProcessing();
    testPartialUnknownRootKey();
    testObjectRejectsArrayValue();
    testJsonSchemaArrayMapping();
    testStringEnumValidation();
    testJsonSchemaStringEnumMapping();
    testUniqueKeyCollection();
    testInvalidSchemaDefinition();

    logger.log('\n&C6=== Results ===');
    logger.log(`&C2✓ Passed: ${testsPassed}`);
    logger.log(`&C1✗ Failed: ${testsFailed}`);
    logger.log(`&C3Total: ${testsPassed + testsFailed}\n`);

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
