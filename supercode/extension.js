// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
// const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('codexplain.explain', function () {
        const editor = vscode.window.activeTextEditor;
        
        if (editor) {
            const selection = editor.selection;
            const text = editor.document.getText(selection);

            if (text) {
                // In a real app, you'd send 'text' to an AI API here.
                // For now, we'll simulate an explanation:
                vscode.window.showInformationMessage(`Explaining: "${text.substring(0, 20)}..." -> This code performs a specific operation in your script.`);
            } else {
                vscode.window.showWarningMessage('Please highlight some code first!');
            }
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
