// @ts-check
import JwtManager from "../../build/beta/JwtManager/JwtManager.js";
import { strict as assert } from 'assert';

/** @type { JwtManager.Algorithm.HashLength[] } */
const MASKS = ['256', '384', '512'];

const { pub: HMAC_PUB_KEY, key: SECRET }      = JwtManager.KeyGenerator.generate('secret');
const { pub: RSA_PUB_KEY, key: RSA_PRIV_KEY } = JwtManager.KeyGenerator.generate('rsa');
const { pub: PSS_PUB_KEY, key: PSS_PRIV_KEY } = JwtManager.KeyGenerator.generate('rsa-pss');
const { pub: EC_PUB_KEY,  key: EC_PRIV_KEY }  = JwtManager.KeyGenerator.generate('ec');

const payload = {
    uuid: '00000000-0000-0000-0000-000000000000',
    name: 'NetFeez',
    email: 'netfeez.dev@gmail.com'
};

const header = {
    exp: Math.floor((Date.now() + 10000) / 1000)
};
/**
 * Tests the signing and verification of JWTs using the specified algorithm and key.
 * @param { JwtManager.AlgorithmName } algorithm The name of the algorithm to be tested (e.g., 'HS256', 'RS256', etc.).
 * @param {  string } key The secret key or private key to be used for signing and verifying JWTs.
 * @param {  string | null } pubKey The public key to be used for verifying JWTs (required for asymmetric algorithms).
 */
const testJwtManagerSignVerify = (algorithm, key, pubKey = null) => {
    const jwt = new JwtManager(algorithm, {
        key: key,
        pub: pubKey || null
    });
    console.log('--------------------------')
    const token = jwt.sign(payload, header);
    console.log('jwt:', token);
    /* if (algorithm.startsWith('HS')) console.log('secret:', key);
    else {
        console.log('Private Key:', key);
        if (pubKey) console.log('Public Key:', pubKey);
    } */
    try {
        const parsed = jwt.parse(token);
        console.log(parsed, '\n');
        assert.deepEqual(parsed.payload, payload);
        console.log(`${algorithm} test passed`);
    } catch (error) {
        console.error(`${algorithm} test failed:`, error);
    }
};

const runTests = () => {
    try {
        for (let index = 0; index < MASKS.length; index++) {
            /** @type { JwtManager.AlgorithmName } */
            const algorithm = `HS${MASKS[index]}`;
            testJwtManagerSignVerify(algorithm, SECRET);

            /** @type { JwtManager.AlgorithmName } */
            const algorithmRS = `RS${MASKS[index]}`;
            testJwtManagerSignVerify(algorithmRS, RSA_PRIV_KEY, RSA_PUB_KEY);

            /** @type { JwtManager.AlgorithmName } */
            const algorithmPS = `PS${MASKS[index]}`;
            testJwtManagerSignVerify(algorithmPS, PSS_PRIV_KEY, PSS_PUB_KEY);

            /** @type { JwtManager.AlgorithmName } */
            const algorithmES = `ES${MASKS[index]}`;
            testJwtManagerSignVerify(algorithmES, EC_PRIV_KEY, EC_PUB_KEY);
        }

        console.log('All tests passed');
    } catch (error) {
        console.error('Test failed:', error);
    }
};


runTests();
