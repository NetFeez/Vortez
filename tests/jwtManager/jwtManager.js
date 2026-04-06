// @ts-check
import { strict as assert } from 'assert';

import { Beta, Logger } from "../../build/Vortez.js";

const JwtManager = Beta.JwtManager;
const logger = new Logger({prefix: 'JWT'});

/** @type { Beta.JwtManager.Algorithm.HashLength[] } */
const MASKS = ['256', '384', '512'];

const RSA_KEY = JwtManager.KeyGenerator.generate('rsa');
const PSS_KEY = JwtManager.KeyGenerator.generate('rsa-pss');
const EC_KEY = JwtManager.KeyGenerator.generate('ec');
const SECRET = JwtManager.KeyGenerator.generate('secret');

const payload = {
    uuid: '00000000-0000-0000-0000-000000000000',
    name: 'NetFeez',
    email: 'netfeez.dev@gmail.com'
};

const header = {
    exp: Math.floor((Date.now() + 10000) / 1000)
};

let testsPassed = 0;
let testsFailed = 0;

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
};

/**
 * Verifies signing and parsing for a given algorithm and key.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm The algorithm under test.
 * @param { Beta.JwtManager.KeyEntry.Signer } key The signing key.
 */
function testValidSignVerify(algorithm, key) {
    try {
        const jwt = new JwtManager({
            alg: algorithm,
            key: key,
            kid: 'key-v1'
        });
        const token = jwt.sign(payload, header);
        const parsed = jwt.parse(token);
        
        assert.deepEqual(parsed.payload, payload);
        assert.equal(parsed.header.alg, algorithm);
        logTestResult(`${algorithm} - Valid token sign/verify`, true);
    } catch (error) {
        logTestResult(`${algorithm} - Valid token sign/verify`, false, error);
    }
};

/**
 * Ensures a tampered payload is rejected.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm The algorithm under test.
 * @param {  Beta.JwtManager.KeyEntry.Signer } key The signing key.
 */
function testTamperedPayload(algorithm, key) {
    try {
        const jwt = new JwtManager({
            alg: algorithm,
            key: key,
        });
        const token = jwt.sign(payload, header);
        
        const parts = token.split('.');
        const encodedPayload = JwtManager.JwtUtils.objectToBase64Url({ ...payload, name: 'Hacker' });
        const tamperedToken = `${parts[0]}.${encodedPayload}.${parts[2]}`;
        
        try {
            jwt.parse(tamperedToken);
            logTestResult(`${algorithm} - Reject tampered payload`, false, new Error('Should have thrown'));
        } catch (error) {
            if (`${error}`.includes('Invalid signature')) {
                logTestResult(`${algorithm} - Reject tampered payload`, true);
            } else {
                logTestResult(`${algorithm} - Reject tampered payload`, false, error);
            }
        }
    } catch (error) {
        logTestResult(`${algorithm} - Reject tampered payload`, false, error);
    }
};

/**
 * Ensures an expired token is rejected.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm The algorithm under test.
 * @param {  Beta.JwtManager.KeyEntry.Signer } key The signing key.
 */
function testExpiredToken(algorithm, key) {
    try {
        const jwt = new JwtManager({
            alg: algorithm,
            key: key,
        });
        
        const expiredPayload = { ...payload, exp: Math.floor(Date.now() / 1000) - 1 };
        const token = jwt.sign(expiredPayload, header);
        
        try {
            jwt.parse(token);
            logTestResult(`${algorithm} - Reject expired token`, false, new Error('Should have thrown'));
        } catch (error) {
            const message = `${error}`;
            if (message.includes('expired')) {
                logTestResult(`${algorithm} - Reject expired token`, true);
            } else {
                logTestResult(`${algorithm} - Reject expired token`, false, message);
            }
        }
    } catch (error) {
        logTestResult(`${algorithm} - Reject expired token`, false, error);
    }
};

/**
 * Ensures a token cannot be verified with an unrelated key set.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm The algorithm under test.
 * @param { Beta.JwtManager.KeyEntry.Signer } key The signing key.
 */
function testMissingKey(algorithm, key) {
    try {
        const jwt = new JwtManager({
            alg: algorithm,
            key: key,
        });
        const token = jwt.sign(payload, header);
        
        const replacementKey = algorithm.startsWith('HS')
            ? JwtManager.KeyGenerator.generate('secret')
            : algorithm.startsWith('RS')
            ? JwtManager.KeyGenerator.generate('rsa')
            : algorithm.startsWith('PS')
            ? JwtManager.KeyGenerator.generate('rsa-pss')
            : JwtManager.KeyGenerator.generate('ec');

        const newJwt = new JwtManager({
            alg: algorithm,
            key: replacementKey,
            kid: `${algorithm}-replacement`
        });
        
        try {
            newJwt.parse(token);
            logTestResult(`${algorithm} - Reject token with unknown KID`, false, new Error('Should have thrown'));
        } catch (error) {
            const message = `${error}`;
            if (message.includes('No key found')) {
                logTestResult(`${algorithm} - Reject token with unknown KID`, true);
            } else {
                logTestResult(`${algorithm} - Reject token with unknown KID`, false, error);
            }
        }
    } catch (error) {
        logTestResult(`${algorithm} - Reject token with unknown KID`, false, error);
    }
};

/**
 * Ensures key rotation works.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm The algorithm under test.
 * @param { Beta.JwtManager.KeyEntry.Signer } key The signing key.
 */
function testKeyRotation(algorithm, key) {
    try {
        const jwt = new JwtManager({
            alg: algorithm,
            key: key,
            kid: 'key-v1',
        });
        
        const newKeyObj = algorithm.startsWith('HS') 
            ? JwtManager.KeyGenerator.generate('secret')
            : algorithm.startsWith('RS')
            ? JwtManager.KeyGenerator.generate('rsa')
            : algorithm.startsWith('PS')
            ? JwtManager.KeyGenerator.generate('rsa-pss')
            : JwtManager.KeyGenerator.generate('ec');
        
        jwt.addKey({
            alg: algorithm,
            key: newKeyObj,
            kid: 'key-v2'
        });
        
        const token = jwt.sign(payload, { ...header, kid: 'key-v2' });
        
        const parsed = jwt.parse(token);
        assert.deepEqual(parsed.payload, payload);
        assert.equal(parsed.header.kid, 'key-v2');
        
        logTestResult(`${algorithm} - Key rotation`, true);
    } catch (error) {
        logTestResult(`${algorithm} - Key rotation`, false, error);
    }
};

/**
 * Ensures a public-key-only manager can verify but cannot sign.
 * @param { Beta.JwtManager.KeyEntry.AlgorithmName } algorithm
 * @param { { pub: string } } keyObj Object containing the public key.
 */
function testReadOnlyPublicKey(algorithm, keyObj) {
    if (algorithm.startsWith('HS')) return;

    try {
        const sharedKid = `${algorithm}-public-only`;
        const verifier = new JwtManager({
            alg: algorithm,
            key: { pub: keyObj.pub },
            kid: sharedKid
        });

        try {
            verifier.sign(payload);
            logTestResult(`${algorithm} - Public key only: Sign blocked`, false, new Error('Should not be able to sign'));
        } catch (error) {
            if (`${error}`.includes('No key provided')) {
                logTestResult(`${algorithm} - Public key only: Sign blocked`, true);
            } else {
                logTestResult(`${algorithm} - Public key only: Sign blocked`, false, error);
            }
        }

        const signer = new JwtManager({
            alg: algorithm,
            key: keyObj,
            kid: sharedKid
        });
        const token = signer.sign(payload, { ...header, kid: sharedKid });
        
        const parsed = verifier.parse(token);
        assert.deepEqual(parsed.payload, payload);
        logTestResult(`${algorithm} - Public key only: Verify works`, true);

    } catch (error) {
        logTestResult(`${algorithm} - Public key only`, false, error);
    }
}
/**
 * Prevents RS256 to HS256 downgrade attacks.
 */
function testAlgorithmConfusionAttack() {
    const algRS = 'RS256';
    const algHS = 'HS256';
    
    try {
        const manager = new JwtManager({
            alg: algRS,
            key: RSA_KEY,
            kid: 'secure-key'
        });

        const attackerManager = new JwtManager({
            alg: algHS,
            key: RSA_KEY.pub,
        });
        
        const maliciousToken = attackerManager.sign({ ...payload, name: 'Attacker' });

        try {
            manager.parse(maliciousToken);
            logTestResult(`Security - RS256 to HS256 Attack`, false, new Error('VULNERABLE: Accepted HS256 signed with RSA Public Key'));
        } catch (error) {
            logTestResult(`Security - RS256 to HS256 Attack blocked`, true);
        }
    } catch (error) {
        logTestResult(`Security - RS256 to HS256 Attack error`, false, error);
    }
}

/**
 * Runs all tests for the JwtManager across different algorithms and key types.
 * Logs the results and exits with a non-zero code if any tests failed.
 */
const runTests = () => {
    logger.log('\n&C6=== JWT Manager Test Suite ===\n');
    
    for (let index = 0; index < MASKS.length; index++) {

        /** @type {Beta.JwtManager.KeyEntry.AlgorithmName} */
        const algorithm = `HS${MASKS[index]}`;
        /** @type {Beta.JwtManager.KeyEntry.AlgorithmName} */
        const algorithmRS = `RS${MASKS[index]}`;
        /** @type {Beta.JwtManager.KeyEntry.AlgorithmName} */
        const algorithmPS = `PS${MASKS[index]}`;
        /** @type {Beta.JwtManager.KeyEntry.AlgorithmName} */
        const algorithmES = `ES${MASKS[index]}`;
        
        testValidSignVerify(algorithm, SECRET);
        testTamperedPayload(algorithm, SECRET);
        testExpiredToken(algorithm, SECRET);
        testMissingKey(algorithm, SECRET);
        testKeyRotation(algorithm, SECRET);

        testValidSignVerify(algorithmRS, RSA_KEY);
        testTamperedPayload(algorithmRS, RSA_KEY);
        testExpiredToken(algorithmRS, RSA_KEY);
        testMissingKey(algorithmRS, RSA_KEY);
        testReadOnlyPublicKey(algorithmRS, RSA_KEY);


        testValidSignVerify(algorithmPS, PSS_KEY);
        testTamperedPayload(algorithmPS, PSS_KEY);
        testExpiredToken(algorithmPS, PSS_KEY);
        testReadOnlyPublicKey(algorithmPS, PSS_KEY);

        testValidSignVerify(algorithmES, EC_KEY);
        testTamperedPayload(algorithmES, EC_KEY);
        testExpiredToken(algorithmES, EC_KEY);
        testReadOnlyPublicKey(algorithmES, EC_KEY);

    }
    
    testAlgorithmConfusionAttack();

    logger.log(`\n&C6=== Results ===`);
    logger.log(`&C2✓ Passed: ${testsPassed}`);
    logger.log(`&C1✗ Failed: ${testsFailed}`);
    logger.log(`&C3Total: ${testsPassed + testsFailed}\n`);
    
    process.exit(testsFailed > 0 ? 1 : 0);
};

runTests();