/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Defines the base contract and shared helpers for test suites.
 * @license Apache-2.0
 */
import { Logger } from '../../build/Vortez.js';

export abstract class TestSuite {
    public abstract readonly name: string;

    public abstract run(): Promise<TestSuite.SuiteResult> | TestSuite.SuiteResult;

    public static logTestResult(
        logger: Logger,
        counters: TestSuite.Counters,
        testName: string,
        isPassed: boolean,
        error: unknown = null,
    ): void {
        if (isPassed) {
            logger.log(`&C2✓ ${testName}`);
            counters.passed += 1;
            return;
        }

        const message = error instanceof Error ? error.message : String(error);
        logger.error(`&C1✗ ${testName}${error ? ': ' + message : ''}`);
        counters.failed += 1;
    }

    public static printSummary(logger: Logger, counters: TestSuite.Counters): void {
        logger.log('\n&C6=== Results ===');
        logger.log(`&C2✓ Passed: ${counters.passed}`);
        logger.error(`&C1✗ Failed: ${counters.failed}`);
        logger.log(`&C3Total: ${counters.passed + counters.failed}\n`);
    }
}

export namespace TestSuite {
    export interface SuiteResult {
        passed: number;
        failed: number;
    }

    export interface Counters {
        passed: number;
        failed: number;
    }
}

export default TestSuite;
