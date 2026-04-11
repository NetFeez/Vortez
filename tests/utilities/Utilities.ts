/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests utility functions for comparison, flattening, encoding, file operations, and environment handling.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';
import PATH from 'path';
import { promises as FS } from 'fs';

import { ServerError, Utilities as _Utilities } from '../../build/Vortez.js';

import Helpers from '../support/Helpers.js';
import TestSuite from '../support/TestSuite.js';
import SuiteTracker from '../support/SuiteTracker.js';

export class Utilities extends TestSuite {
    public readonly name = 'Utilities';
    private readonly tracker = new SuiteTracker('UTILITIES');

    private testDeepEqual(): void {
        try {
            const left = { profile: { name: 'Ada', tags: ['a', 'b'] }, count: 2 };
            const right = { profile: { name: 'Ada', tags: ['a', 'b'] }, count: 2 };
            assert.equal(_Utilities.Object.deepEqual(left, right), true);
            assert.equal(_Utilities.Object.deepEqual(left, { profile: { name: 'Ada', tags: ['a', 'b', 'c'] }, count: 2 }), false);
            this.tracker.logTestResult('deepEqual - Nested objects', true);
        } catch (error) {
            this.tracker.logTestResult('deepEqual - Nested objects', false, error);
        }
    }

    private testFlattenRoundTrip(): void {
        try {
            const source = { a: { b: { c: 'value' } }, list: [1, 2, 3], flag: true };
            const flattened = _Utilities.Flatten.object(source, 10);
            const restored = _Utilities.Flatten.unObject(flattened);
            assert.deepEqual(restored, source);
            this.tracker.logTestResult('flattenObject - Round trip', true);
        } catch (error) {
            this.tracker.logTestResult('flattenObject - Round trip', false, error);
        }
    }

    private testBase64Helpers(): void {
        try {
            const text = 'vortez::utility::test';
            const encoded = _Utilities.Encoding.base64UrlEncode(text);
            const decoded = _Utilities.Encoding.base64UrlDecode(encoded);
            assert.equal(decoded, text);
            this.tracker.logTestResult('base64 - Encode/decode', true);
        } catch (error) {
            this.tracker.logTestResult('base64 - Encode/decode', false, error);
        }
    }

    private async testFileExistsAndSleep(): Promise<void> {
        try {
            await Helpers.ensureTempDir();
            const tempFile = Helpers.buildTempPath('exists.txt');
            await FS.writeFile(tempFile, 'ok', 'utf8');
            assert.equal(await _Utilities.File.exists(tempFile), true);
            assert.equal(await _Utilities.File.exists(Helpers.buildTempPath('missing.txt')), false);
            const started = Date.now();
            await _Utilities.Time.sleep(5);
            const elapsed = Date.now() - started;
            assert.ok(elapsed >= 3, `Expected sleep to delay at least 3ms, got ${elapsed}ms`);
            this.tracker.logTestResult('fileExists and sleep', true);
        } catch (error) {
            this.tracker.logTestResult('fileExists and sleep', false, error);
        }
    }

    private testPathHelpers(): void {
        try {
            assert.equal(_Utilities.Path.normalize('a/b\\c'), `a${PATH.sep}b${PATH.sep}c`);
            assert.ok(_Utilities.Path.module('build/Vortez.js').includes('build'));
            assert.equal(_Utilities.Path.dirname('a/b/c.txt'), `a${PATH.sep}b`);
            this.tracker.logTestResult('Path - normalize/relative/dirname', true);
        } catch (error) {
            this.tracker.logTestResult('Path - normalize/relative/dirname', false, error);
        }
    }

    private async testEnvHelpers(): Promise<void> {
        try {
            await Helpers.ensureTempDir();
            const envPath = Helpers.buildTempPath(`${Helpers.assets}/sample.test-env`);
            await FS.rm(envPath, { force: true });
            const loaded = await _Utilities.Env.load(envPath, {
                defaultEnv: { APP_NAME: 'Vortez', APP_MODE: 'test' },
                setEnv: false,
            });
            assert.equal(loaded.APP_NAME, 'Vortez');
            assert.equal(loaded.APP_MODE, 'test');
            assert.equal(await _Utilities.File.exists(envPath), true);
            _Utilities.Env.set('VORTEZ_TEST_KEY', '123');
            assert.equal(_Utilities.Env.get('VORTEZ_TEST_KEY', { default: 'missing' }), '123');
            _Utilities.Env.delete('VORTEZ_TEST_KEY');
            assert.equal(_Utilities.Env.get('VORTEZ_TEST_KEY', { default: 'missing' }), 'missing');
            this.tracker.logTestResult('Env - load/set/delete', true);
        } catch (error) {
            this.tracker.logTestResult('Env - load/set/delete', false, error);
        }
    }

    private testServerError(): void {
        try {
            const error = new ServerError('boom', 418, { isSended: true });
            assert.equal(error.message, 'boom');
            assert.equal(error.status, 418);
            assert.equal(error.isSended, true);
            assert.deepEqual(error.toJSON(), { message: 'boom', status: 418 });
            this.tracker.logTestResult('ServerError - Serialization', true);
        } catch (error) {
            this.tracker.logTestResult('ServerError - Serialization', false, error);
        }
    }
    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Utilities Test Suite ===\n');
        this.testDeepEqual();
        this.testFlattenRoundTrip();
        this.testBase64Helpers();
        await this.testFileExistsAndSleep();
        this.testPathHelpers();
        await this.testEnvHelpers();
        this.testServerError();
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Utilities {}

export default Utilities;
