import * as vscode from 'vscode';
import { BackendClient } from './backendClient';

const CHAT_PARTICIPANT_ID = 'superbuilder-chat.assistant';
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

    // Register chat participant
    const participant = vscode.chat.createChatParticipant(
        CHAT_PARTICIPANT_ID,
        handleChatRequest
    );

    participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.png');

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

    context.subscriptions.push(participant, checkBackendCommand);

    console.log('✅ SuperBuilder Chat extension activated!');
}

/**
 * Handle incoming chat requests
 */
async function handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    
    // Handle special commands
    if (request.command === 'help') {
        stream.markdown('## SuperBuilder Commands\n\n');
        stream.markdown('- `/help` - Show this help message\n');
        stream.markdown('- `/status` - Check backend connection status\n');
        stream.markdown('\nJust type your question or code request to chat with the AI!\n');
        return { metadata: { command: 'help' } };
    }

    if (request.command === 'status') {
        const health = await backendClient.getHealthStatus();
        if (health) {
            stream.markdown(`**Status:** ${health.status}\n\n`);
            stream.markdown(`**Backend Connected:** ${health.superbuilder_connected ? '✅' : '❌'}\n\n`);
            stream.markdown(`**LLM Ready:** ${health.llm_ready ? '✅' : '❌'}\n\n`);
            if (health.message) {
                stream.markdown(`**Message:** ${health.message}\n`);
            }
        } else {
            stream.markdown('❌ **Cannot connect to backend**\n\n');
            stream.markdown('Make sure the backend is running on http://localhost:8003\n');
        }
        return { metadata: { command: 'status' } };
    }

    // Handle regular chat
    const prompt = request.prompt;
    
    if (!prompt || prompt.trim().length === 0) {
        stream.markdown('Please provide a message or question.\n');
        return { metadata: { command: 'empty' } };
    }

    try {
        // Check if cancelled before starting
        if (token.isCancellationRequested) {
            return { metadata: { command: 'cancelled' } };
        }

        // Stream response from backend
        let hasContent = false;
        
        for await (const chunk of backendClient.streamChat(prompt, token)) {
            if (token.isCancellationRequested) {
                stream.markdown('\n\n_[Response cancelled]_\n');
                break;
            }
            
            // Stream the text chunk
            stream.markdown(chunk);
            hasContent = true;
        }

        if (!hasContent && !token.isCancellationRequested) {
            stream.markdown('_No response received from backend._\n');
        }

        return { 
            metadata: { 
                command: request.command || 'chat',
                cancelled: token.isCancellationRequested
            } 
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stream.markdown(`\n\n❌ **Error:** ${errorMessage}\n`);
        
        return { 
            errorDetails: { 
                message: errorMessage,
                responseIsFiltered: false 
            } 
        };
    }
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    console.log('SuperBuilder Chat extension deactivated');
}
