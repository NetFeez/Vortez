/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests logger routing, debug singleton behavior, file persistence, and prefix formatting.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';
import { promises as fs } from 'fs';
import path from 'path';

import { Logger as _Logger } from '../../build/Vortez.js';
import Debug from '../../build/logger/Debug.js';
import Helpers from '../support/Helpers.js';
import TestSuite from '../support/TestSuite.js';
import SuiteTracker from '../support/SuiteTracker.js';

const DEBUG_ROOT = Helpers.buildTempPath('logger');
export class Logger extends TestSuite {
    public readonly name = 'Logger';
    private readonly tracker = new SuiteTracker('LOGGER');

    /**
     * Recreates the debug output root folder to provide a clean test state.
     */
    private async resetDebugRoot(): Promise<void> {
        await fs.rm(DEBUG_ROOT, { recursive: true, force: true });
        await fs.mkdir(DEBUG_ROOT, { recursive: true });
    }

    /**
     * Locates the generated log file for a single debug run.
     * @param rootPath - Root path where debug folders are created.
     * @returns Full path to one generated log file.
     */
    private async findSingleDebugLogFile(rootPath: string): Promise<string> {
        const dayFolders = await fs.readdir(rootPath, { withFileTypes: true });
        assert.equal(dayFolders.length, 1);

        const dayFolder = path.join(rootPath, dayFolders[0].name);
        const logFiles = await fs.readdir(dayFolder, { withFileTypes: true });
        assert.ok(logFiles.length >= 1);

        return path.join(dayFolder, logFiles[0].name);
    }

    /**
     * Validates that logger levels are forwarded to Debug with expected prefixes.
     */
    private testLoggerForwardsLevels(): void {
        try {
            const debug = Debug.getInstance('logger-forward-suite', {
                path: DEBUG_ROOT,
                show: false,
                save: false,
            });

            const calls: Array<{ data: any[]; options: Debug.LogOptions }> = [];
            (debug as Debug & { customLog: (data: any[], options: Debug.LogOptions) => void }).customLog =
                function captureCustomLog(data: any[], options: Debug.LogOptions): void {
                    calls.push({ data, options });
                };

            const logger = new _Logger({ prefix: 'Unit', format: '&R&C7', debug });
            logger.log('alpha');
            logger.warn('beta');
            logger.info('gamma');
            logger.error('delta');

            assert.equal(calls.length, 4);
            assert.deepEqual(calls[0], {
                data: ['alpha'],
                options: { prefix: '&C2[LOG] [Unit]&R&C7', show: true, save: true },
            });
            assert.deepEqual(calls[1], {
                data: ['beta'],
                options: { prefix: '&C3[WRN] [Unit]&R&C7', show: true, save: true },
            });
            assert.deepEqual(calls[2], {
                data: ['gamma'],
                options: { prefix: '&C6[INF] [Unit]&R&C7', show: true, save: true },
            });
            assert.deepEqual(calls[3], {
                data: ['delta'],
                options: { prefix: '&C1[ERR] [Unit]&R&C7', show: true, save: true },
            });

            this.tracker.logTestResult('Logger - Forwards log levels and prefixes', true);
        } catch (error) {
            this.tracker.logTestResult('Logger - Forwards log levels and prefixes', false, error);
        }
    }

    /**
     * Validates Debug singleton behavior and persisted file output.
     */
    private async testDebugSingletonAndFileOutput(): Promise<void> {
        try {
            await this.resetDebugRoot();

            const debug = Debug.getInstance('logger-file-suite', {
                path: DEBUG_ROOT,
                show: false,
                save: true,
            });

            const sameDebug = Debug.getInstance('logger-file-suite', {
                path: `${DEBUG_ROOT}/ignored`,
                show: true,
                save: true,
            });

            assert.strictEqual(debug, sameDebug);
            assert.equal(sameDebug.show, true);
            assert.equal(sameDebug.save, true);

            sameDebug.log('hello debug');
            sameDebug.error('boom');

            await new Promise<void>((resolve) => setImmediate(resolve));

            const logFile = await this.findSingleDebugLogFile(DEBUG_ROOT);
            const content = await fs.readFile(logFile, 'utf8');

            assert.ok(content.includes('[LOG] [logger-file-suite]'));
            assert.ok(content.includes('hello debug'));
            assert.ok(content.includes('[ERR] [logger-file-suite]'));
            assert.ok(content.includes('boom'));

            sameDebug.save = false;

            this.tracker.logTestResult('Debug - Singleton and file output', true);
        } catch (error) {
            this.tracker.logTestResult('Debug - Singleton and file output', false, error);
        }
    }

    /**
     * Validates that requesting the same debug id reuses the instance and updates toggles.
     */
    private async testDebugOverwriteBehavior(): Promise<void> {
        try {
            const debug = Debug.getInstance('logger-overwrite-suite', {
                path: DEBUG_ROOT,
                show: false,
                save: false,
            });

            const overwritten = Debug.getInstance('logger-overwrite-suite', {
                path: `${DEBUG_ROOT}/should-not-apply`,
                show: true,
                save: true,
            });

            assert.strictEqual(debug, overwritten);
            assert.equal(overwritten.show, true);
            assert.equal(overwritten.save, true);

            overwritten.save = false;
            this.tracker.logTestResult('Debug - Reuses instance and updates toggles', true);
        } catch (error) {
            this.tracker.logTestResult('Debug - Reuses instance and updates toggles', false, error);
        }
    }

    /**
     * Runs the logger test suite.
     * @returns Aggregated suite counters.
     */
    public async run(): Promise<TestSuite.SuiteResult> {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== Logger Test Suite ===\n');
        await Helpers.ensureTempDir();
        await this.resetDebugRoot();
        this.testLoggerForwardsLevels();
        await this.testDebugSingletonAndFileOutput();
        await this.testDebugOverwriteBehavior();
        await fs.rm(DEBUG_ROOT, { recursive: true, force: true });
        this.tracker.printSummary();
        return this.tracker.getResult();
    }
}

export namespace Logger {}

export default Logger;