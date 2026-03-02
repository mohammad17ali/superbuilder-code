import * as vscode from 'vscode';

/**
 * Provides a webview-based chat panel in the sidebar,
 * similar to GitHub Copilot's chat UI.
 */
export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'superbuilder.chatView';

    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case 'sendMessage': {
                    const userText = message.text;
                    // Echo the dummy response back after a short delay
                    setTimeout(() => {
                        this._view?.webview.postMessage({
                            type: 'response',
                            text: 'Hey, it works now! 🎉',
                        });
                    }, 500);
                    break;
                }
            }
        });
    }

    /**
     * Build the full HTML document for the chat webview.
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Use a nonce for Content Security Policy
        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
        http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <title>SuperBuilder Chat</title>
    <style>
        /* ---- reset & base ---- */
        *,
        *::before,
        *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--vscode-font-family, system-ui, sans-serif);
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background, var(--vscode-editor-background));
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* ---- header ---- */
        .header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.35));
        }

        .header-icon {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            background: var(--vscode-button-background, #0078d4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-button-foreground, #fff);
            font-weight: 700;
            font-size: 11px;
            flex-shrink: 0;
        }

        .header-title {
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.85;
        }

        /* ---- message area ---- */
        .messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .messages::-webkit-scrollbar {
            width: 6px;
        }
        .messages::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 3px;
        }

        .welcome {
            text-align: center;
            margin: auto 0;
            opacity: 0.6;
            font-size: 13px;
            line-height: 1.6;
            padding: 20px;
        }

        .welcome h3 {
            margin-bottom: 8px;
            font-size: 15px;
            opacity: 0.9;
        }

        .message {
            display: flex;
            gap: 10px;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message-avatar {
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 700;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .message-avatar.user {
            background: var(--vscode-button-background, #0078d4);
            color: var(--vscode-button-foreground, #fff);
        }

        .message-avatar.assistant {
            background: var(--vscode-badge-background, #616161);
            color: var(--vscode-badge-foreground, #fff);
        }

        .message-body {
            flex: 1;
            min-width: 0;
        }

        .message-role {
            font-weight: 600;
            font-size: 12px;
            margin-bottom: 4px;
            opacity: 0.8;
        }

        .message-text {
            line-height: 1.5;
            word-wrap: break-word;
            white-space: pre-wrap;
        }

        /* ---- typing indicator ---- */
        .typing-indicator {
            display: none;
            gap: 10px;
            padding: 0;
        }

        .typing-indicator.visible {
            display: flex;
        }

        .typing-dots {
            display: flex;
            gap: 4px;
            align-items: center;
            padding-top: 6px;
        }

        .typing-dots span {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--vscode-foreground);
            opacity: 0.4;
            animation: blink 1.4s infinite both;
        }

        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes blink {
            0%, 80%, 100% { opacity: 0.2; }
            40% { opacity: 0.8; }
        }

        /* ---- input area ---- */
        .input-area {
            padding: 12px 16px;
            border-top: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.35));
        }

        .input-wrapper {
            display: flex;
            align-items: flex-end;
            gap: 8px;
            background: var(--vscode-input-background, #3c3c3c);
            border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
            border-radius: 8px;
            padding: 8px 12px;
            transition: border-color 0.15s;
        }

        .input-wrapper:focus-within {
            border-color: var(--vscode-focusBorder, #007fd4);
        }

        #chat-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: var(--vscode-input-foreground, var(--vscode-foreground));
            font-family: inherit;
            font-size: 13px;
            resize: none;
            max-height: 120px;
            line-height: 1.4;
            overflow-y: auto;
        }

        #chat-input::placeholder {
            color: var(--vscode-input-placeholderForeground, rgba(128,128,128,0.7));
        }

        #send-btn {
            background: var(--vscode-button-background, #0078d4);
            color: var(--vscode-button-foreground, #fff);
            border: none;
            border-radius: 6px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: opacity 0.15s;
        }

        #send-btn:hover {
            opacity: 0.85;
        }

        #send-btn:disabled {
            opacity: 0.4;
            cursor: default;
        }

        #send-btn svg {
            width: 16px;
            height: 16px;
            fill: currentColor;
        }
    </style>
</head>
<body>
    <!-- Header -->
    <div class="header">
        <div class="header-icon">SB</div>
        <span class="header-title">SuperBuilder Chat</span>
    </div>

    <!-- Messages -->
    <div class="messages" id="messages">
        <div class="welcome" id="welcome">
            <h3>SuperBuilder Assistant</h3>
            <p>Ask me anything about your code.<br/>I'm here to help!</p>
        </div>
    </div>

    <!-- Input -->
    <div class="input-area">
        <div class="input-wrapper">
            <textarea
                id="chat-input"
                placeholder="Ask SuperBuilder..."
                rows="1"
            ></textarea>
            <button id="send-btn" title="Send message">
                <svg viewBox="0 0 16 16"><path d="M1 1.5L15 8 1 14.5V9l9-1-9-1V1.5z"/></svg>
            </button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        const messagesEl = document.getElementById('messages');
        const welcomeEl = document.getElementById('welcome');
        const inputEl = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        // Auto-resize textarea
        inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
        });

        // Send on Enter (Shift+Enter for newline)
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);

        function sendMessage() {
            const text = inputEl.value.trim();
            if (!text) return;

            // Hide welcome
            if (welcomeEl) welcomeEl.style.display = 'none';

            // Add user message
            appendMessage('You', text, 'user');

            // Clear input
            inputEl.value = '';
            inputEl.style.height = 'auto';

            // Show typing indicator
            showTyping(true);

            // Send to extension
            vscode.postMessage({ type: 'sendMessage', text });
        }

        // Receive messages from the extension host
        window.addEventListener('message', (event) => {
            const msg = event.data;
            if (msg.type === 'response') {
                showTyping(false);
                appendMessage('SuperBuilder', msg.text, 'assistant');
            }
        });

        function appendMessage(role, text, kind) {
            const wrapper = document.createElement('div');
            wrapper.className = 'message';

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar ' + kind;
            avatar.textContent = kind === 'user' ? 'U' : 'SB';

            const body = document.createElement('div');
            body.className = 'message-body';

            const roleEl = document.createElement('div');
            roleEl.className = 'message-role';
            roleEl.textContent = role;

            const textEl = document.createElement('div');
            textEl.className = 'message-text';
            textEl.textContent = text;

            body.appendChild(roleEl);
            body.appendChild(textEl);
            wrapper.appendChild(avatar);
            wrapper.appendChild(body);

            messagesEl.appendChild(wrapper);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        // Typing indicator
        let typingEl = null;
        function showTyping(show) {
            if (show && !typingEl) {
                typingEl = document.createElement('div');
                typingEl.className = 'message typing-indicator visible';
                typingEl.innerHTML =
                    '<div class="message-avatar assistant">SB</div>' +
                    '<div class="message-body">' +
                        '<div class="message-role">SuperBuilder</div>' +
                        '<div class="typing-dots"><span></span><span></span><span></span></div>' +
                    '</div>';
                messagesEl.appendChild(typingEl);
                messagesEl.scrollTop = messagesEl.scrollHeight;
            } else if (!show && typingEl) {
                typingEl.remove();
                typingEl = null;
            }
        }

        // Focus the input on load
        inputEl.focus();
    </script>
</body>
</html>`;
    }
}

/**
 * Generate a random nonce for CSP.
 */
function getNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
}
