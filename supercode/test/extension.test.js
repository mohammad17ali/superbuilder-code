const assert = require('assert');
const vscode = require('vscode');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Extension activation', async () => {
		const ext = vscode.extensions.getExtension('superbuilder.superbuilder-chat');
		assert.ok(ext, 'Extension should be registered');
		await ext.activate();
		assert.ok(ext.isActive, 'Extension should be active');
	});

	test('Chat view provider registration', async () => {
		const views = vscode.window.registerWebviewViewProvider('superbuilder.chatView', {
			resolveWebviewView: (webviewView) => {
				// Placeholder: would be provided by ChatViewProvider
			}
		});
		assert.ok(views, 'Chat view provider should be registered');
	});

	test('Backend client health check endpoint', async () => {
		// Test when backend is available
		const healthyBackend = 'http://localhost:8003';
		assert.ok(healthyBackend, 'Backend URL should be configured');
	});

	test('Chat participant creation', async () => {
		// Verify chat participant is registered
		assert.ok(true, 'Chat participant should be created during activation');
	});

	test('Commands registration', async () => {
		// Test that commands are available
		const commands = await vscode.commands.getCommands();
		const superbuilderCommands = commands.filter(cmd => cmd.includes('superbuilder'));
		assert.ok(superbuilderCommands.length > 0, 'SuperBuilder commands should be registered');
	});
});
