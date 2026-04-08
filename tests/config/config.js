// @ts-check
import { strict as assert } from 'assert';
import { promises as FSP } from 'fs';

import { Logger } from '../../build/Vortez.js';
import { Config } from '../../build/server/config/Config.js';
import { Loader } from '../../build/server/config/Loader.js';
import { SchemaError } from '../../build/utilities/schema/SchemaError.js';

const logger = new Logger({ prefix: 'CONFIG' });

let testsPassed = 0;
let testsFailed = 0;

const TMP_DIR = 'tests/.tmp/config-suite';
const CONFIG_PATH = `${TMP_DIR}/config.json`;
const BAD_CONFIG_PATH = `${TMP_DIR}/bad.json`;

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

async function resetTmpDir() {
    await FSP.rm(TMP_DIR, { recursive: true, force: true });
    await FSP.mkdir(TMP_DIR, { recursive: true });
}

/**
 * Ensures constructor applies default values for missing config keys.
 */
function testDefaultConfigValues() {
    try {
        const config = new Config({});

        assert.equal(config.get('host'), 'localhost');
        assert.equal(config.get('port'), 80);
        assert.equal(config.get('ssl'), null);
        assert.equal(config.get('templates.folder'), './global/Template/Folder.vhtml');
        assert.equal(config.get('templates.error'), './global/Template/Error.vhtml');
        assert.equal(config.get('routing.algorithm'), 'FIFO');
        assert.equal(config.get('logger.showAll'), false);
        assert.equal(config.get('logger.server.show'), true);
        assert.equal(config.get('logger.server.save'), true);

        logTestResult('constructor - Applies defaults', true);
    } catch (error) {
        logTestResult('constructor - Applies defaults', false, error);
    }
}

/**
 * Ensures nested object defaults are filled when object is partially provided.
 */
function testNestedSslDefaultPort() {
    try {
        const config = new Config({
            ssl: {
                cert: 'cert-path',
                key: 'key-path'
            }
        });

        assert.equal(config.get('ssl.cert'), 'cert-path');
        assert.equal(config.get('ssl.key'), 'key-path');
        assert.equal(config.get('ssl.port'), 443);

        logTestResult('constructor - Nested defaults inside ssl', true);
    } catch (error) {
        logTestResult('constructor - Nested defaults inside ssl', false, error);
    }
}

/**
 * Ensures enum constraints are validated.
 */
function testRoutingEnumValidation() {
    try {
        assert.throws(
            // @ts-expect-error Runtime validation test with invalid enum on purpose.
            () => new Config({ routing: { algorithm: 'BreadthFirst' } }),
            SchemaError
        );

        logTestResult('validation - Reject invalid routing algorithm', true);
    } catch (error) {
        logTestResult('validation - Reject invalid routing algorithm', false, error);
    }
}

/**
 * Ensures get/set use flattened dot-path keys.
 */
function testGetSetFlattenedPaths() {
    try {
        const config = new Config({});

        config.set('host', '127.0.0.1');
        config.set('routing.algorithm', 'Tree');
        config.set('logger.server.show', false);

        assert.equal(config.get('host'), '127.0.0.1');
        assert.equal(config.get('routing.algorithm'), 'Tree');
        assert.equal(config.get('logger.server.show'), false);

        logTestResult('api - Get/Set flattened paths', true);
    } catch (error) {
        logTestResult('api - Get/Set flattened paths', false, error);
    }
}

/**
 * Ensures save writes nested JSON and creates missing folders.
 */
async function testSaveCreatesFileAndNestedData() {
    try {
        await resetTmpDir();

        const config = new Config({});
        config.set('host', '0.0.0.0');
        config.set('logger.request.save', false);
        await config.save(CONFIG_PATH);

        const content = await FSP.readFile(CONFIG_PATH, 'utf8');
        const data = JSON.parse(content);

        assert.equal(data.host, '0.0.0.0');
        assert.equal(data.logger.request.save, false);

        logTestResult('save - Writes file and nested json', true);
    } catch (error) {
        logTestResult('save - Writes file and nested json', false, error);
    }
}

/**
 * Ensures Loader creates a new file when it does not exist.
 */
async function testLoaderCreatesMissingFile() {
    try {
        await resetTmpDir();

        const loaded = await Loader.load(CONFIG_PATH);

        assert.ok(loaded instanceof Config);
        assert.equal(loaded.get('host'), 'localhost');

        const content = await FSP.readFile(CONFIG_PATH, 'utf8');
        const data = JSON.parse(content);
        assert.equal(data.port, 80);

        logTestResult('loader - Creates missing file with defaults', true);
    } catch (error) {
        logTestResult('loader - Creates missing file with defaults', false, error);
    }
}

/**
 * Ensures Loader reads and validates existing config files.
 */
async function testLoaderReadsExistingFile() {
    try {
        await resetTmpDir();

        await FSP.writeFile(
            CONFIG_PATH,
            JSON.stringify({ host: 'example.com', routing: { algorithm: 'Tree' } }, null, 4),
            'utf8'
        );

        const loaded = await Loader.load(CONFIG_PATH);

        assert.equal(loaded.get('host'), 'example.com');
        assert.equal(loaded.get('routing.algorithm'), 'Tree');

        logTestResult('loader - Loads existing file', true);
    } catch (error) {
        logTestResult('loader - Loads existing file', false, error);
    }
}

/**
 * Ensures Loader throws when the file contains invalid JSON.
 */
async function testLoaderRejectsInvalidJson() {
    try {
        await resetTmpDir();
        await FSP.writeFile(BAD_CONFIG_PATH, '{ "host": "localhost", ', 'utf8');

        await assert.rejects(() => Loader.load(BAD_CONFIG_PATH));

        logTestResult('loader - Rejects invalid json file', true);
    } catch (error) {
        logTestResult('loader - Rejects invalid json file', false, error);
    }
}

async function runTests() {
    logger.log('\n&C6=== Config Test Suite ===\n');

    testDefaultConfigValues();
    testNestedSslDefaultPort();
    testRoutingEnumValidation();
    testGetSetFlattenedPaths();

    await testSaveCreatesFileAndNestedData();
    await testLoaderCreatesMissingFile();
    await testLoaderReadsExistingFile();
    await testLoaderRejectsInvalidJson();

    await FSP.rm(TMP_DIR, { recursive: true, force: true });

    logger.log('\n&C6=== Results ===');
    logger.log(`&C2✓ Passed: ${testsPassed}`);
    logger.log(`&C1✗ Failed: ${testsFailed}`);
    logger.log(`&C3Total: ${testsPassed + testsFailed}\n`);

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
