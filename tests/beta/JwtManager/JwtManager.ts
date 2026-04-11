/**
 * @author NetFeez <netfeez.dev@gmail.com>
 * @description Tests JWT signing, verification, expiration, key rotation, and algorithm confusion attack prevention.
 * @license Apache-2.0
 */
import { strict as assert } from 'assert';

import { Beta } from '../../../build/Vortez.js';
import TestSuite from '../../support/TestSuite.js';
import SuiteTracker from '../../support/SuiteTracker.js';

const _JwtManager = Beta.JwtManager;

const MASKS: Beta.JwtManager.Algorithm.HashLength[] = ['256', '384', '512'];

const RSA_KEY = _JwtManager.KeyGenerator.generate('rsa');
const PSS_KEY = _JwtManager.KeyGenerator.generate('rsa-pss');
const EC_KEY = _JwtManager.KeyGenerator.generate('ec');
const SECRET = _JwtManager.KeyGenerator.generate('secret');

const payload = {
    uuid: '00000000-0000-0000-0000-000000000000',
    name: 'NetFeez',
    email: 'netfeez.dev@gmail.com'
};

const header = {
    exp: Math.floor((Date.now() + 10000) / 1000)
};

export class JwtManager extends TestSuite {
    public readonly name = 'JWT Manager';
    private readonly tracker = new SuiteTracker('JWT');

    /**
     * Validates that a token can be signed and parsed for a given algorithm.
     * @param algorithm - JWT algorithm under test.
     * @param key - Signing key compatible with the selected algorithm.
     */
    private testValidSignVerify(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        key: Beta.JwtManager.KeyEntry.Signer,
    ): void {
        try {
            const jwt = new _JwtManager({ alg: algorithm, key: key, kid: 'key-v1' });
            const token = jwt.sign(payload, header);
            const parsed = jwt.parse(token);
            assert.deepEqual(parsed.payload, payload);
            assert.equal(parsed.header.alg, algorithm);
            this.tracker.logTestResult(`${algorithm} - Valid token sign/verify`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Valid token sign/verify`, false, error);
        }
    }

    /**
     * Validates that payload tampering is rejected with signature validation errors.
     * @param algorithm - JWT algorithm under test.
     * @param key - Signing key compatible with the selected algorithm.
     */
    private testTamperedPayload(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        key: Beta.JwtManager.KeyEntry.Signer,
    ): void {
        try {
            const jwt = new _JwtManager({ alg: algorithm, key: key });
            const token = jwt.sign(payload, header);
            const parts = token.split('.');
            const encodedPayload = _JwtManager.JwtUtils.objectToBase64Url({ ...payload, name: 'Hacker' });
            const tamperedToken = `${parts[0]}.${encodedPayload}.${parts[2]}`;

            function parseTamperedToken(): void { jwt.parse(tamperedToken); }
            function shouldFailWithInvalidSignature(error: unknown): boolean {
                assert.ok(error instanceof _JwtManager.JwtError);
                assert.equal(error.code, 'INVALID_SIGNATURE');
                return true;
            }
            assert.throws(parseTamperedToken, shouldFailWithInvalidSignature);
            this.tracker.logTestResult(`${algorithm} - Reject tampered payload`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Reject tampered payload`, false, error);
        }
    }

    /**
     * Validates that expired tokens are rejected during parse.
     * @param algorithm - JWT algorithm under test.
     * @param key - Signing key compatible with the selected algorithm.
     */
    private testExpiredToken(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        key: Beta.JwtManager.KeyEntry.Signer,
    ): void {
        try {
            const jwt = new _JwtManager({ alg: algorithm, key: key });
            const expiredPayload = { ...payload, exp: Math.floor(Date.now() / 1000) - 1 };
            const token = jwt.sign(expiredPayload, header);

            function parseExpiredToken(): void { jwt.parse(token); }
            function shouldFailWithExpiredToken(error: unknown): boolean {
                assert.ok(error instanceof _JwtManager.JwtError);
                assert.equal(error.code, 'TOKEN_EXPIRED');
                return true;
            }
            assert.throws(parseExpiredToken, shouldFailWithExpiredToken);
            this.tracker.logTestResult(`${algorithm} - Reject expired token`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Reject expired token`, false, error);
        }
    }

    /**
     * Validates that a token signed with an unknown key id is rejected.
     * @param algorithm - JWT algorithm under test.
     * @param key - Signing key compatible with the selected algorithm.
     */
    private testMissingKey(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        key: Beta.JwtManager.KeyEntry.Signer,
    ): void {
        try {
            const jwt = new _JwtManager({ alg: algorithm, key: key });
            const token = jwt.sign(payload, header);
            const replacementKey = algorithm.startsWith('HS')
                ? _JwtManager.KeyGenerator.generate('secret')
                : algorithm.startsWith('RS')
                    ? _JwtManager.KeyGenerator.generate('rsa')
                    : algorithm.startsWith('PS')
                        ? _JwtManager.KeyGenerator.generate('rsa-pss')
                        : _JwtManager.KeyGenerator.generate('ec');

            const newJwt = new _JwtManager({ alg: algorithm, key: replacementKey, kid: `${algorithm}-replacement` });

            function parseWithUnknownKid(): void { newJwt.parse(token); }
            function shouldFailWithUnknownKid(error: unknown): boolean {
                assert.ok(error instanceof _JwtManager.JwtError);
                assert.equal(error.code, 'KEY_NOT_FOUND');
                return true;
            }
            assert.throws(parseWithUnknownKid, shouldFailWithUnknownKid);
            this.tracker.logTestResult(`${algorithm} - Reject token with unknown KID`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Reject token with unknown KID`, false, error);
        }
    }

    /**
     * Validates key rotation support by issuing and verifying with a new key id.
     * @param algorithm - JWT algorithm under test.
     * @param key - Initial signing key.
     */
    private testKeyRotation(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        key: Beta.JwtManager.KeyEntry.Signer
    ): void {
        try {
            const jwt = new _JwtManager({ alg: algorithm, key: key, kid: 'key-v1' });
            const newKeyObj = algorithm.startsWith('HS')
                ? _JwtManager.KeyGenerator.generate('secret')
                : algorithm.startsWith('RS')
                    ? _JwtManager.KeyGenerator.generate('rsa')
                    : algorithm.startsWith('PS')
                        ? _JwtManager.KeyGenerator.generate('rsa-pss')
                        : _JwtManager.KeyGenerator.generate('ec');

            jwt.addKey({ alg: algorithm, key: newKeyObj, kid: 'key-v2' });
            const token = jwt.sign(payload, { ...header, kid: 'key-v2' });
            const parsed = jwt.parse(token);
            assert.deepEqual(parsed.payload, payload);
            assert.equal(parsed.header.kid, 'key-v2');
            this.tracker.logTestResult(`${algorithm} - Key rotation`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Key rotation`, false, error);
        }
    }

    /**
     * Validates read-only public key behavior for asymmetric algorithms.
     * Signing must fail while verification must still pass.
     * @param algorithm - Asymmetric JWT algorithm under test.
     * @param keyObj - Full key object containing private/public material.
     */
    private testReadOnlyPublicKey(
        algorithm: Beta.JwtManager.KeyEntry.AlgorithmName,
        keyObj: Beta.JwtManager.Algorithm.KeyObject
    ): void {
        if (algorithm.startsWith('HS')) return;

        try {
            const sharedKid = `${algorithm}-public-only`;
            const verifier = new _JwtManager({ alg: algorithm, key: { pub: keyObj.pub }, kid: sharedKid });

            function signWithPublicKeyOnly(): void { verifier.sign(payload); }
            function shouldFailSigningWithPublicKey(error: unknown): boolean {
                assert.ok(error instanceof _JwtManager.JwtError);
                assert.equal(error.code, 'SIGN_FAILED');
                return true;
            }
            assert.throws(signWithPublicKeyOnly, shouldFailSigningWithPublicKey);
            this.tracker.logTestResult(`${algorithm} - Public key only: Sign blocked`, true);

            const signer = new _JwtManager({ alg: algorithm, key: keyObj, kid: sharedKid });
            const token = signer.sign(payload, { ...header, kid: sharedKid });
            const parsed = verifier.parse(token);
            assert.deepEqual(parsed.payload, payload);
            this.tracker.logTestResult(`${algorithm} - Public key only: Verify works`, true);
        } catch (error) {
            this.tracker.logTestResult(`${algorithm} - Public key only`, false, error);
        }
    }

    /**
     * Validates defense against algorithm confusion (RS token accepted as HS).
     */
    private testAlgorithmConfusionAttack(): void {
        const algRS = 'RS256';
        const algHS = 'HS256';

        try {
            const manager = new _JwtManager({ alg: algRS, key: RSA_KEY, kid: 'secure-key' });
            const attackerManager = new _JwtManager({ alg: algHS, key: RSA_KEY.pub });
            const maliciousToken = attackerManager.sign({ ...payload, name: 'Attacker' });

            function parseMaliciousToken(): void { manager.parse(maliciousToken); }
            function shouldRejectAlgorithmConfusion(error: unknown): boolean {
                assert.ok(error instanceof _JwtManager.JwtError);
                assert.ok(
                    error.code === 'INVALID_SIGNATURE' || error.code === 'KEY_NOT_FOUND',
                    `Expected INVALID_SIGNATURE or KEY_NOT_FOUND, got ${error.code}`,
                );
                return true;
            }
            assert.throws(parseMaliciousToken, shouldRejectAlgorithmConfusion);
            this.tracker.logTestResult('Security - RS256 to HS256 Attack blocked', true);
        } catch (error) {
            this.tracker.logTestResult('Security - RS256 to HS256 Attack error', false, error);
        }
    }

    /**
     * Runs the JWT test suite across HMAC, RSA, RSA-PSS, and ECDSA variants.
     * @returns Aggregated suite counters.
     */
    public run(): TestSuite.SuiteResult {
        this.tracker.reset();
        this.tracker.logger.log('\n&C6=== JWT Manager Test Suite ===\n');

        for (let index = 0; index < MASKS.length; index++) {
            const algorithm = `HS${MASKS[index]}` as Beta.JwtManager.KeyEntry.AlgorithmName;
            const algorithmRS = `RS${MASKS[index]}` as Beta.JwtManager.KeyEntry.AlgorithmName;
            const algorithmPS = `PS${MASKS[index]}` as Beta.JwtManager.KeyEntry.AlgorithmName;
            const algorithmES = `ES${MASKS[index]}` as Beta.JwtManager.KeyEntry.AlgorithmName;

            this.testValidSignVerify(algorithm, SECRET);
            this.testTamperedPayload(algorithm, SECRET);
            this.testExpiredToken(algorithm, SECRET);
            this.testMissingKey(algorithm, SECRET);
            this.testKeyRotation(algorithm, SECRET);

            this.testValidSignVerify(algorithmRS, RSA_KEY);
            this.testTamperedPayload(algorithmRS, RSA_KEY);
            this.testExpiredToken(algorithmRS, RSA_KEY);
            this.testMissingKey(algorithmRS, RSA_KEY);
            this.testReadOnlyPublicKey(algorithmRS, RSA_KEY);

            this.testValidSignVerify(algorithmPS, PSS_KEY);
            this.testTamperedPayload(algorithmPS, PSS_KEY);
            this.testExpiredToken(algorithmPS, PSS_KEY);
            this.testReadOnlyPublicKey(algorithmPS, PSS_KEY);

            this.testValidSignVerify(algorithmES, EC_KEY);
            this.testTamperedPayload(algorithmES, EC_KEY);
            this.testExpiredToken(algorithmES, EC_KEY);
            this.testReadOnlyPublicKey(algorithmES, EC_KEY);
        }

        this.testAlgorithmConfusionAttack();

        this.tracker.printSummary();

        return this.tracker.getResult();
    }
}

export namespace JwtManager {}

export default JwtManager;
