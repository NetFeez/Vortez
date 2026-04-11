/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Main test runner orchestrating all test suite execution.
 * @license Apache-2.0
 */
import { Logger } from '../build/Vortez.js';

import JwtManager from './beta/JwtManager/JwtManager.js';
import Config from './server/config/Config.js';
import LoggerSuite from './logger/Logger.js';
import Schema from './utilities/schema/Schema.js';
import Utilities from './utilities/Utilities.js';
import Template from './Template/Template.js';
import Server from './server/Server.js';
import type TestSuite from './support/TestSuite.js';

const logger = new Logger({ prefix: 'TEST' });

const suites: TestSuite[] = [
    new JwtManager(),
    new Config(),
    new LoggerSuite(),
    new Schema(),
    new Utilities(),
    new Template(),
    new Server(),
];

const stats: TestSuite.SuiteResult = {
    passed: 0,
    failed: 0,
};

export async function runTests(): Promise<TestSuite.SuiteResult> {
    stats.passed = 0;
    stats.failed = 0;

    logger.log('\n&C6=== Imported suites ===\n');

    for (const suite of suites) {
        try {
            const result = await suite.run();
            stats.passed += result.passed;
            stats.failed += result.failed;
            logger.log(`&C3• ${suite.name}: ${result.passed} passed, ${result.failed} failed`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            stats.failed += 1;
            logger.error(`&C1• ${suite.name}: crashed (${message})`);
        }
    }

    logger.log('\n&C6=== Results ===');
    logger.log(`&C2✓ Passed: ${stats.passed}`);
    logger.error(`&C1✗ Failed: ${stats.failed}`);
    logger.log(`&C3Total: ${stats.passed + stats.failed}\n`);

    return stats;
}

function handleRunTestsResult(result: { failed: number }): void {
    process.exit(result.failed > 0 ? 1 : 0);
}

runTests().then(handleRunTestsResult);
