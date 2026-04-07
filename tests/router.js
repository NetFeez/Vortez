// @ts-check
import { strict as assert } from 'assert';

import { Logger } from '../build/Vortez.js';

import Request from '../build/server/Request.js';
import Response from '../build/server/Response.js';

import Router from '../build/server/router/router.v2.js';

const logger = new Logger({ prefix: 'Router' });

let testsPassed = 0;
let testsFailed = 0;

/**
 * Logs test results.
 * @param {string} testName The test name.
 * @param {boolean} passed Whether the test passed.
 * @param {unknown | null} error Optional error object for failures.
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

/**
 * Creates a mock Request object for testing.
 * @param {string} url The URL to test.
 * @param {string} method The HTTP method.
 * @returns {Request} Mock request object.
 */
function createMockRequest(url, method = 'GET') {
	/** @type {any} */
	const httpRequest = {
		headers: {},
		socket: { remoteAddress: '127.0.0.1' },
		method,
		url: url.endsWith('/') ? url : url + '/',
	};
	return new Request(httpRequest);
}

/**
 * Creates a mock Response object for testing.
 * @param {Request} request The request to bind to the response.
 * @returns {Response & { executed?: boolean; executedWithParams?: Record<string, string | undefined> | null }} Mock response object.
 */
function createMockResponse(request = createMockRequest('/')) {
	/** @type {any} */
	const serverResponse = {
		setHeader() {},
		writeHead() {},
		end() {},
		writableEnded: false,
		headersSent: false,
	};
	/** @type {any} */
	const response = new Response(request, serverResponse);
	response.executed = false;
	response.executedWithParams = null;
	return response;
}

/**
 * Test basic HTTP routing with FIFO algorithm.
 */
function testFIFOBasicRouting() {
	try {
		const router = new Router(undefined, [], { algorithm: 'FIFO' });
		const response = createMockResponse();
		
		router.addAction('GET', '/hello', (req, res) => {
			response.executed = true;
		});
		
		const request = createMockRequest('/hello');
		const routed = router.routeRequest(request, response);
		
		assert.equal(routed, true);
		assert.equal(response.executed, true);
		logTestResult('FIFO - Basic HTTP route', true);
	} catch (error) {
		logTestResult('FIFO - Basic HTTP route', false, error);
	}
}

/**
 * Test Tree algorithm basic routing.
 */
function testTreeBasicRouting() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		const response = createMockResponse();
		
		router.addAction('GET', '/api/users', (req, res) => {
			response.executed = true;
		});
		
		const request = createMockRequest('/api/users');
		const routed = router.routeRequest(request, response);
		
		assert.equal(routed, true);
		assert.equal(response.executed, true);
		logTestResult('Tree - Basic HTTP route', true);
	} catch (error) {
		logTestResult('Tree - Basic HTTP route', false, error);
	}
}

/**
 * Test URL parameters extraction.
 */
function testURLParameterExtraction() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		const response = createMockResponse();
		
		router.addAction('GET', '/users/$id', (req, res) => {
			const params = req.ruleParams;
			if (params && params.id) {
				response.executedWithParams = params;
			}
		});
		
		const request = createMockRequest('/users/123');
		const routed = router.routeRequest(request, response);
		
		assert.equal(routed, true);
		assert.ok(response.executedWithParams);
		assert.equal(response.executedWithParams.id, '123');
		logTestResult('Tree - URL parameter extraction', true);
	} catch (error) {
		logTestResult('Tree - URL parameter extraction', false, error);
	}
}

/**
 * Test optional URL parameters.
 */
function testOptionalURLParameters() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		let callCount = 0;
		
		router.addAction('GET', '/posts/$?id', (req, res) => {
			callCount++;
		});
		
		// Route with param
		const request1 = createMockRequest('/posts/42');
		const routed1 = router.routeRequest(request1, createMockResponse());
		
		// Route without param
		const request2 = createMockRequest('/posts');
		const routed2 = router.routeRequest(request2, createMockResponse());
		
		assert.equal(routed1, true);
		assert.equal(routed2, true);
		assert.equal(callCount, 2);
		logTestResult('Tree - Optional URL parameters', true);
	} catch (error) {
		logTestResult('Tree - Optional URL parameters', false, error);
	}
}

/**
 * Test wildcard routing.
 */
function testWildcardRouting() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		let catchAllCalled = false;
		
		router.addAction('GET', '/static/*', (req, res) => {
			catchAllCalled = true;
		});
		
		const request = createMockRequest('/static/css/style.css');
		const routed = router.routeRequest(request, createMockResponse());
		
		assert.equal(routed, true);
		assert.equal(catchAllCalled, true);
		logTestResult('Tree - Wildcard routing', true);
	} catch (error) {
		logTestResult('Tree - Wildcard routing', false, error);
	}
}

/**
 * Test HTTP method filtering.
 */
function testHTTPMethodFiltering() {
	try {
		const router = new Router();
		let getExecuted = false;
		let postExecuted = false;
		
		router.addAction('GET', '/resource', () => { getExecuted = true; });
		router.addAction('POST', '/resource', () => { postExecuted = true; });
		
		// Test GET
		const getRequest = createMockRequest('/resource', 'GET');
		router.routeRequest(getRequest, createMockResponse());
		
		// Test POST
		const postRequest = createMockRequest('/resource', 'POST');
		router.routeRequest(postRequest, createMockResponse());
		
		assert.equal(getExecuted, true);
		assert.equal(postExecuted, true);
		logTestResult('FIFO - HTTP method filtering', true);
	} catch (error) {
		logTestResult('FIFO - HTTP method filtering', false, error);
	}
}

/**
 * Test ALL method matches any HTTP verb.
 */
function testALLMethod() {
	try {
		const router = new Router();
		let callCount = 0;
		
		router.addAction('ALL', '/webhook', () => {
			callCount++;
		});
		
		/** @type {string[]} */
		const methods = ['GET', 'POST', 'PUT', 'DELETE'];
		for (const method of methods) {
			const request = createMockRequest('/webhook', method);
			router.routeRequest(request, createMockResponse());
		}
		
		assert.equal(callCount, 4);
		logTestResult('FIFO - ALL method matches any verb', true);
	} catch (error) {
		logTestResult('FIFO - ALL method matches any verb', false, error);
	}
}

/**
 * Test no route match returns false.
 */
function testNoRouteMatch() {
	try {
		const router = new Router();
		
		router.addAction('GET', '/api/users', () => {});
		
		const request = createMockRequest('/api/posts');
		const routed = router.routeRequest(request, createMockResponse());
		
		assert.equal(routed, false);
		logTestResult('FIFO - No route match returns false', true);
	} catch (error) {
		logTestResult('FIFO - No route match returns false', false, error);
	}
}

/**
 * Test router mounting.
 */
function testRouterMounting() {
	try {
		const mainRouter = new Router();
		const subRouter = new Router();
		let subRouteExecuted = false;
		
		subRouter.addAction('GET', '/list', () => {
			subRouteExecuted = true;
		});
		
		mainRouter.mount(subRouter, '/api/v1');
		
		const request = createMockRequest('/api/v1/list');
		const routed = mainRouter.routeRequest(request, createMockResponse());
		
		assert.equal(routed, true);
		assert.equal(subRouteExecuted, true);
		logTestResult('FIFO - Router mounting', true);
	} catch (error) {
		logTestResult('FIFO - Router mounting', false, error);
	}
}

/**
 * Test sub-router creation preserves algorithm.
 */
function testSubRouterPreservesAlgorithm() {
	try {
		const parentRouter = new Router(undefined, [], { algorithm: 'Tree' });
		const subRouter = parentRouter.createRouter();
		
		// Check that sub-router is also using Tree algorithm
		assert.ok(subRouter.algorithm instanceof Router.Tree);
		logTestResult('Tree - Sub-router preserves algorithm', true);
	} catch (error) {
		logTestResult('Tree - Sub-router preserves algorithm', false, error);
	}
}

/**
 * Test multiple rules FIFO evaluation order.
 */
function testFIFOEvaluationOrder() {
	try {
		const router = new Router(undefined, [], { algorithm: 'FIFO' });
		/** @type {string[]} */
		const executionOrder = [];
		
		router.addAction('GET', '/test', () => {
			executionOrder.push('first');
		});
		router.addAction('GET', '/test', () => {
			executionOrder.push('second');
		});
		
		const request = createMockRequest('/test');
		router.routeRequest(request, createMockResponse());
		
		// FIFO should execute only the first matching rule, then stop
		assert.equal(executionOrder.length, 1);
		assert.equal(executionOrder[0], 'first');
		logTestResult('FIFO - Evaluation order (first match)', true);
	} catch (error) {
		logTestResult('FIFO - Evaluation order (first match)', false, error);
	}
}

/**
 * Test Tree algorithm path precedence.
 */
function testTreePathPrecedence() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		/** @type {string[]} */
		const results = [];
		
		router.addAction('GET', '/api/$id', () => {
			results.push('param');
		});
		router.addAction('GET', '/api/special', () => {
			results.push('static');
		});
		
		// Test exact match should take precedence
		const request1 = createMockRequest('/api/special');
		router.routeRequest(request1, createMockResponse());
		
		// Test parameter match
		const request2 = createMockRequest('/api/123');
		router.routeRequest(request2, createMockResponse());
		
		assert.equal(results[0], 'static');
		assert.equal(results[1], 'param');
		logTestResult('Tree - Static path precedence over parameters', true);
	} catch (error) {
		logTestResult('Tree - Static path precedence over parameters', false, error);
	}
}

/**
 * Test algorithm switching via getAlgorithm.
 */
function testAlgorithmSwitching() {
	try {
		const fifo = Router.getAlgorithm('FIFO');
		const tree = Router.getAlgorithm('Tree');
		const directTree = Router.getAlgorithm(new Router.Tree());
		
		assert.ok(fifo instanceof Router.FIFO);
		assert.ok(tree instanceof Router.Tree);
		assert.ok(directTree instanceof Router.Tree);
		logTestResult('Static - Algorithm switching via getAlgorithm', true);
	} catch (error) {
		logTestResult('Static - Algorithm switching via getAlgorithm', false, error);
	}
}

/**
 * Test invalid algorithm defaults to FIFO.
 */
function testInvalidAlgorithmDefaultsFIFO() {
	try {
		/** @type {any} */
		const invalidKey = 'InvalidAlgo';
		const invalidAlgorithm = Router.getAlgorithm(invalidKey);
		assert.ok(invalidAlgorithm instanceof Router.FIFO);
		logTestResult('Static - Invalid algorithm defaults to FIFO', true);
	} catch (error) {
		logTestResult('Static - Invalid algorithm defaults to FIFO', false, error);
	}
}

/**
 * Test HTTP rules view filtering.
 */
function testHTTPRulesView() {
	try {
		const router = new Router();
		
		router.addAction('GET', '/api/users', () => {});
		router.addAction('POST', '/api/users', () => {});
		router.addWebSocket('/ws/chat', () => {});
		
		const httpRules = router.httpRules;
		const wsRules = router.wsRules;
		
		assert.equal(httpRules.length, 2);
		assert.equal(wsRules.length, 1);
		logTestResult('FIFO - HTTP rules view filtering', true);
	} catch (error) {
		logTestResult('FIFO - HTTP rules view filtering', false, error);
	}
}

/**
 * Test WebSocket rules view filtering.
 */
function testWebSocketRulesView() {
	try {
		const router = new Router();
		
		router.addWebSocket('/ws/events', () => {});
		router.addWebSocket('/ws/notifications', () => {});
		router.addAction('GET', '/api/health', () => {});
		
		const wsRules = router.wsRules;
		const httpRules = router.httpRules;
		
		assert.equal(wsRules.length, 2);
		assert.equal(httpRules.length, 1);
		logTestResult('FIFO - WebSocket rules view filtering', true);
	} catch (error) {
		logTestResult('FIFO - WebSocket rules view filtering', false, error);
	}
}

/**
 * Test method chaining on addRules.
 */
function testMethodChaining() {
	try {
		const router = new Router();
		let result1 = false;
		let result2 = false;
		
		router.addAction('GET', '/a', () => { result1 = true; });
		router.addAction('GET', '/b', () => { result2 = true; });
		
		router.routeRequest(createMockRequest('/a'), createMockResponse());
		router.routeRequest(createMockRequest('/b'), createMockResponse());
		
		assert.equal(result1, true);
		assert.equal(result2, true);
		logTestResult('FIFO - Method chaining', true);
	} catch (error) {
		logTestResult('FIFO - Method chaining', false, error);
	}
}

/**
 * Test Tree algorithm with nested paths.
 */
function testTreeNestedPaths() {
	try {
		const router = new Router(undefined, [], { algorithm: 'Tree' });
		/** @type {string[]} */
		const results = [];
		
		router.addAction('GET', '/api/v1/users', () => { results.push('v1'); });
		router.addAction('GET', '/api/v2/users', () => { results.push('v2'); });
		router.addAction('GET', '/api/v1/users/$id', () => { results.push('v1-id'); });
		
		router.routeRequest(createMockRequest('/api/v1/users'), createMockResponse());
		router.routeRequest(createMockRequest('/api/v2/users'), createMockResponse());
		router.routeRequest(createMockRequest('/api/v1/users/42'), createMockResponse());
		
		assert.deepEqual(results, ['v1', 'v2', 'v1-id']);
		logTestResult('Tree - Nested path routing', true);
	} catch (error) {
		logTestResult('Tree - Nested path routing', false, error);
	}
}

/**
 * Test complex router mounting with prefixes.
 */
function testComplexRouterMounting() {
	try {
		const apiV1 = new Router();
		const apiV2 = new Router();
		const mainRouter = new Router();
		
		let v1Called = false;
		let v2Called = false;
		
		apiV1.addAction('GET', '/users', () => { v1Called = true; });
		apiV2.addAction('GET', '/users', () => { v2Called = true; });
		
		mainRouter.mount(apiV1, '/api/v1');
		mainRouter.mount(apiV2, '/api/v2');
		
		mainRouter.routeRequest(createMockRequest('/api/v1/users'), createMockResponse());
		mainRouter.routeRequest(createMockRequest('/api/v2/users'), createMockResponse());
		
		assert.equal(v1Called, true);
		assert.equal(v2Called, true);
		logTestResult('FIFO - Complex router mounting', true);
	} catch (error) {
		logTestResult('FIFO - Complex router mounting', false, error);
	}
}

/**
 * Test URL normalization (trailing slashes).
 */
function testURLNormalization() {
	try {
		const router = new Router();
		let executionCount = 0;
		
		router.addAction('GET', '/test', () => {
			executionCount++;
		});
		
		// Test with trailing slash (should be normalized)
		const request1 = createMockRequest('/test/');
		const routed1 = router.routeRequest(request1, createMockResponse());
		
		// Test without trailing slash
		const request2 = createMockRequest('/test');
		const routed2 = router.routeRequest(request2, createMockResponse());
		
		assert.equal(routed1, true);
		assert.equal(routed2, true);
		logTestResult('FIFO - URL normalization', true);
	} catch (error) {
		logTestResult('FIFO - URL normalization', false, error);
	}
}

/**
 * Runs all tests for Router.
 * Logs the results and exits with appropriate code.
 */
const runTests = () => {
	logger.log('\n&C6=== Router Test Suite ===\n');
	
	// FIFO Algorithm Tests
	logger.log('&C6--- FIFO Algorithm ---');
	testFIFOBasicRouting();
	testHTTPMethodFiltering();
	testALLMethod();
	testNoRouteMatch();
	testRouterMounting();
	testFIFOEvaluationOrder();
	testHTTPRulesView();
	testWebSocketRulesView();
	testMethodChaining();
	testComplexRouterMounting();
	testURLNormalization();
	
	// Tree Algorithm Tests
	logger.log('\n&C6--- Tree Algorithm ---');
	testTreeBasicRouting();
	testURLParameterExtraction();
	testOptionalURLParameters();
	testWildcardRouting();
	testSubRouterPreservesAlgorithm();
	testTreePathPrecedence();
	testTreeNestedPaths();
	
	// Algorithm Management Tests
	logger.log('\n&C6--- Algorithm Management ---');
	testAlgorithmSwitching();
	testInvalidAlgorithmDefaultsFIFO();
	
	logger.log(`\n&C6=== Results ===`);
	logger.log(`&C2✓ Passed: ${testsPassed}`);
	logger.log(`&C1✗ Failed: ${testsFailed}`);
	logger.log(`&C3Total: ${testsPassed + testsFailed}\n`);
	
	process.exit(testsFailed > 0 ? 1 : 0);
};

runTests();
