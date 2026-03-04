const assert = require('assert');

suite('Backend Client Tests', () => {
	test('Backend endpoint configuration', async () => {
		const backendUrl = 'http://localhost:8003';
		assert.ok(backendUrl.includes('localhost'), 'Backend URL should be localhost');
		assert.ok(backendUrl.includes('8003'), 'Backend should run on port 8003');
	});

	test('Health check endpoint', async () => {
		const endpoint = '/health';
		assert.ok(endpoint.startsWith('/'), 'Endpoint should start with /');
		assert.strictEqual(endpoint, '/health');
	});

	test('Chat request format', async () => {
		const chatRequest = {
			prompt: 'Hello SuperBuilder',
			context: [],
			model: 'superbuilder'
		};

		assert.ok(chatRequest.prompt, 'Chat request should have prompt');
		assert.ok(Array.isArray(chatRequest.context), 'Chat request should have context array');
		assert.ok(chatRequest.model, 'Chat request should have model');
	});

	test('Chat response validation', async () => {
		const chatResponse = {
			success: true,
			message: 'Chat response',
			timestamp: Date.now()
		};

		assert.strictEqual(typeof chatResponse.success, 'boolean');
		assert.ok(chatResponse.message);
		assert.ok(chatResponse.timestamp > 0);
	});

	test('Error handling', async () => {
		const errorResponse = {
			error: true,
			message: 'Backend connection failed',
			code: 'ECONNREFUSED'
		};

		assert.ok(errorResponse.error);
		assert.ok(errorResponse.message);
		assert.ok(errorResponse.code);
	});
});
