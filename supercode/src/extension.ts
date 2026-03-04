import * as vscode from 'vscode';
import { BackendClient } from './backendClient';
import { ChatViewProvider } from './chatViewProvider';

const BACKEND_URL = 'http://localhost:8003';

let backendClient: BackendClient;

/**
 * Activate the extension
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('SuperBuilder Chat extension is activating...');

    // Initialize backend client
    backendClient = new BackendClient(BACKEND_URL);

    // Check backend health on startup
    const isHealthy = await backendClient.checkHealth();
    if (isHealthy) {
        vscode.window.showInformationMessage('✅ SuperBuilder backend connected!');
    } else {
        vscode.window.showWarningMessage(
            '⚠️ SuperBuilder backend not available. Make sure it\'s running on port 8003.'
        );
    }

    // Register command to check backend status
    const checkBackendCommand = vscode.commands.registerCommand(
        'superbuilder.checkBackend',
        async () => {
            const health = await backendClient.getHealthStatus();
            if (health) {
                vscode.window.showInformationMessage(
                    `Backend Status: ${health.status}\n` +
                    `Connected: ${health.superbuilder_connected}\n` +
                    `LLM Ready: ${health.llm_ready}`
                );
            } else {
                vscode.window.showErrorMessage('❌ Cannot connect to backend');
            }
        }
    );

    // Register the chat webview sidebar
    const chatProvider = new ChatViewProvider(context.extensionUri);
    const chatViewDisposable = vscode.window.registerWebviewViewProvider(
        ChatViewProvider.viewType,
        chatProvider
    );

    // Command to reveal the chat panel
    const openChatCommand = vscode.commands.registerCommand(
        'superbuilder.openChat',
        () => {
            vscode.commands.executeCommand('superbuilder.chatView.focus');
        }
    );

    context.subscriptions.push(checkBackendCommand, chatViewDisposable, openChatCommand);

    // Move the chat view to the secondary sidebar (right side) on first activation
    const hasMovedKey = 'superbuilder.movedToSecondarySidebar';
    if (!context.globalState.get(hasMovedKey)) {
        // Small delay to ensure the view is registered before moving
        setTimeout(async () => {
            try {
                await vscode.commands.executeCommand('superbuilder.chatView.focus');
                await vscode.commands.executeCommand('workbench.action.moveViewToSecondarySidebar');
                context.globalState.update(hasMovedKey, true);
            } catch (e) {
                console.log('Could not auto-move view to secondary sidebar:', e);
            }
        }, 1500);
    }

    console.log('✅ SuperBuilder Chat extension activated!');
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    console.log('SuperBuilder Chat extension deactivated');
}
