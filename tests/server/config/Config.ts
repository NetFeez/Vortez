/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests Config constructor, schema validation, nested property management, and file persistence.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';
import { promises as FSP } from 'fs';

import { Config as _Config } from '../../../build/server/config/Config.js';
import { Loader } from '../../../build/server/config/Loader.js';
import { SchemaError } from '../../../build/utilities/schema/SchemaError.js';
import { Utilities } from '../../../build/Vortez.js';
import Helpers from '../../support/Helpers.js';
import TestSuite from '../../support/TestSuite.js';
import SuiteTracker from '../../support/SuiteTracker.js';

const TMP_DIR = Helpers.buildTempPath('config-suite');
const CONFIG_PATH = `${TMP_DIR}/config.json`;
const BAD_CONFIG_PATH = `${TMP_DIR}/bad.json`;

export class Config extends TestSuite {
    public readonly name = 'Config';
    private readonly tracker = new SuiteTracker('CONFIG');
    /** Resets the temporary directory for testing. */
    private async resetTmpDir(): Promise<void> {
        await FSP.rm(TMP_DIR, { recursive: true, force: true });
        await FSP.mkdir(TMP_DIR, { recursive: true });
    }
    /**
     * Tests that Config constructor applies default values for missing keys.
     * Verifies that schema-defined defaults are properly populated.
     */
    private testDefaultConfigValues(): void {
        try {
            const expectedFolderTemplate = Utilities.Path.normalize(`${Utilities.Path.moduleDir}/global/template/folder.vhtml`);
            const expectedErrorTemplate = Utilities.Path.normalize(`${Utilities.Path.moduleDir}/global/template/error.vhtml`);
            const config = new _Config({});
            assert.equal(config.get('host'), 'localhost');
            assert.equal(config.get('port'), 80);
            assert.equal(config.get('ssl'), null);
            assert.equal(config.get('templates.folder'), expectedFolderTemplate);
            assert.equal(config.get('templates.error'), expectedErrorTemplate);
            assert.equal(config.get('routing.algorithm'), 'FIFO');
            assert.equal(config.get('logger.showAll'), false);
            assert.equal(config.get('logger.server.show'), true);
            assert.equal(config.get('logger.server.save'), true);
            this.tracker.logTestResult('constructor - Applies defaults', true);
        } catch (error) {
            this.tracker.logTestResult('constructor - Applies defaults', false, error);
        }
    }
    /**
     * Tests that nested object defaults are applied when parent is partially provided.
     * Verifies that missing nested properties receive their default values.
     */
    private testNestedSslDefaultPort(): void {
        try {
            const config = new _Config({ ssl: { cert: 'cert-path', key: 'key-path' } });
            assert.equal(config.get('ssl.cert'), 'cert-path');
            assert.equal(config.get('ssl.key'), 'key-path');
            assert.equal(config.get('ssl.port'), 443);
            this.tracker.logTestResult('constructor - Nested defaults inside ssl', true);
        } catch (error) {
            this.tracker.logTestResult('constructor - Nested defaults inside ssl', false, error);
        }
    }
    /**
     * Tests that schema validation rejects invalid enum values.
     * Verifies that only allowed algorithm names are accepted for routing.
     */
    private testRoutingEnumValidation(): void {
        try {
            const invalidConfigInput = {
                routing: { algorithm: 'BreadthFirst' },
            } as unknown as ConstructorParameters<typeof _Config>[0];
            function shouldRejectInvalidRoutingAlgorithm(): void { new _Config(invalidConfigInput); }
            assert.throws(shouldRejectInvalidRoutingAlgorithm, SchemaError);
            this.tracker.logTestResult('validation - Reject invalid routing algorithm', true);
        } catch (error) {
            this.tracker.logTestResult('validation - Reject invalid routing algorithm', false, error);
        }
    }
    /** Tests that the config can get and set flattened paths. */
    private testGetSetFlattenedPaths(): void {
        try {
            const config = new _Config({});
            config.set('host', '127.0.0.1');
            config.set('routing.algorithm', 'Tree');
            config.set('logger.server.show', false);
            assert.equal(config.get('host'), '127.0.0.1');
            assert.equal(config.get('routing.algorithm'), 'Tree');
            assert.equal(config.get('logger.server.show'), false);
            assert.equal(config.data.host, '127.0.0.1');
            assert.equal(config.data.routing.algorithm, 'Tree');
            this.tracker.logTestResult('api - Get/Set flattened paths', true);
        } catch (error) {
            this.tracker.logTestResult('api - Get/Set flattened paths', false, error);
        }
    }
    /**
     * Tests that Config.save() writes nested JSON structure to file.
     * Verifies that flattened properties are properly reconstructed.
     */
    private async testSaveCreatesFileAndNestedData(): Promise<void> {
        try {
            await this.resetTmpDir();
            const config = new _Config({});
            config.set('host', '0.0.0.0');
            config.set('logger.request.save', false);
            await config.save(CONFIG_PATH);
            const content = await FSP.readFile(CONFIG_PATH, 'utf8');
            const data = JSON.parse(content);
            assert.equal(data.host, '0.0.0.0');
            assert.equal(data.logger.request.save, false);
            this.tracker.logTestResult('save - Writes file and nested json', true);
        } catch (error) {
            this.tracker.logTestResult('save - Writes file and nested json', false, error);
        }
    }
    /**
     * Tests that Loader creates config file with defaults if it doesn't exist.
     * Verifies auto-creation behavior on first load.
     */
    private async testLoaderCreatesMissingFile(): Promise<void> {
        try {
            await this.resetTmpDir();
            const loaded = await Loader.load(CONFIG_PATH);
            assert.ok(loaded instanceof _Config);
            assert.equal(loaded.get('host'), 'localhost');
            const content = await FSP.readFile(CONFIG_PATH, 'utf8');
            const data = JSON.parse(content);
            assert.equal(data.port, 80);
            this.tracker.logTestResult('loader - Creates missing file with defaults', true);
        } catch (error) {
            this.tracker.logTestResult('loader - Creates missing file with defaults', false, error);
        }
    }
    /** Tests that Loader reads existing config files. */
    private async testLoaderReadsExistingFile(): Promise<void> {
        try {
            await this.resetTmpDir();
            await FSP.writeFile(CONFIG_PATH, JSON.stringify({ host: 'example.com', routing: { algorithm: 'Tree' } }, null, 4), 'utf8');
            const loaded = await Loader.load(CONFIG_PATH);
            assert.equal(loaded.get('host'), 'example.com');
            assert.equal(loaded.get('routing.algorithm'), 'Tree');
            this.tracker.logTestResult('loader - Loads existing file', true);
        } catch (error) {
            this.tracker.logTestResult('loader - Loads existing file', false, error);
        }
    }

    /**
     * Tests that Loader rejects files with invalid JSON syntax.
     * Verifies error handling for malformed config files.
     */
    private async testLoaderRejectsInvalidJson(): Promise<void> {
        try {
            await this.resetTmpDir();
            await FSP.writeFile(BAD_CONFIG_PATH, '{ "host": "localhost", ', 'utf8');
            await assert.rejects(async () => Loader.load(BAD_CONFIG_PATH));
            this.tracker.logTestResult('loader - Rejects invalid json file', true);
        } catch (error) {
            this.tracker.logTestResult('loader - Rejects invalid json file', false, error);
        }
    }
    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Config Test Suite ===\n');
        this.testDefaultConfigValues();
        this.testNestedSslDefaultPort();
        this.testRoutingEnumValidation();
        this.testGetSetFlattenedPaths();
        await this.testSaveCreatesFileAndNestedData();
        await this.testLoaderCreatesMissingFile();
        await this.testLoaderReadsExistingFile();
        await this.testLoaderRejectsInvalidJson();
        await FSP.rm(TMP_DIR, { recursive: true, force: true });
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Config { }

export default Config;
