/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tracks test suite counters and summary output.
 * @license Apache-2.0
 */
import { Logger } from '../../build/Vortez.js';
import TestSuite from './TestSuite.js';

export class SuiteTracker {
    public readonly logger: Logger;
    private readonly counters: TestSuite.Counters;

    /**
     * Creates a tracker bound to a logger prefix.
     * @param prefix - Suite prefix displayed in logs.
     */
    public constructor(prefix: string) {
        this.logger = new Logger({ prefix });
        this.counters = { passed: 0, failed: 0 };
    }

    /**
     * Resets suite counters.
     */
    public reset(): void {
        this.counters.passed = 0;
        this.counters.failed = 0;
    }

    /**
     * Logs and tracks the result for one test case.
     * @param testName - Display name of the test.
     * @param isPassed - Whether the test passed.
     * @param error - Optional failure error.
     */
    public logTestResult(testName: string, isPassed: boolean, error: unknown = null): void {
        TestSuite.logTestResult(this.logger, this.counters, testName, isPassed, error);
    }

    /**
     * Prints the suite result summary.
     */
    public printSummary(): void {
        TestSuite.printSummary(this.logger, this.counters);
    }

    /**
     * Returns current suite counters.
     * @returns Snapshot with passed and failed totals.
     */
    public getResult(): TestSuite.SuiteResult {
        return { passed: this.counters.passed, failed: this.counters.failed };
    }
}

export namespace SuiteTracker {}

export default SuiteTracker;
