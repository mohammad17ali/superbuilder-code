import * as vscode from 'vscode';

/**
 * Health status response from backend
 */
interface HealthResponse {
    status: string;
    superbuilder_connected: boolean;
    llm_ready: boolean;
    message?: string;
}

/**
 * Chat request payload
 */
interface ChatRequest {
    prompt: string;
    session_id?: number;
    name: string;
}

/**
 * Client for communicating with the FastAPI backend
 */
export class BackendClient {
    private readonly baseUrl: string;
    private readonly timeout: number = 30000; // 30 seconds

    constructor(baseUrl: string = 'http://localhost:8003') {
        this.baseUrl = baseUrl;
    }

    /**
     * Check if backend is healthy and ready
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout for health check
            });
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    /**
     * Get detailed health status
     */
    async getHealthStatus(): Promise<HealthResponse | null> {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data as HealthResponse;
        } catch (error) {
            console.error('Failed to get health status:', error);
            return null;
        }
    }

    /**
     * Stream chat responses from the backend
     * 
     * @param prompt User's message
     * @param cancellationToken VS Code cancellation token
     * @yields Text chunks from the streaming response
     */
    async *streamChat(
        prompt: string,
        cancellationToken?: vscode.CancellationToken
    ): AsyncGenerator<string, void, undefined> {
        const controller = new AbortController();
        
        // Handle cancellation
        const cancellationListener = cancellationToken?.onCancellationRequested(() => {
            controller.abort();
        });

        try {
            const requestBody: ChatRequest = {
                prompt,
                name: 'VS Code Extension'
            };

            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Backend error (${response.status}): ${errorText}`);
            }

            if (!response.body) {
                throw new Error('No response body received');
            }

            // Stream the response
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) {
                        break;
                    }

                    // Decode chunk and yield it
                    const chunk = decoder.decode(value, { stream: true });
                    if (chunk) {
                        yield chunk;
                    }

                    // Check for cancellation
                    if (cancellationToken?.isCancellationRequested) {
                        controller.abort();
                        break;
                    }
                }
            } finally {
                reader.releaseLock();
            }

        } catch (error) {
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    console.log('Chat request was cancelled');
                    return; // Gracefully exit on cancellation
                }
                throw new Error(`Failed to chat with backend: ${error.message}`);
            }
            throw new Error('Unknown error occurred while chatting with backend');
        } finally {
            cancellationListener?.dispose();
        }
    }

    /**
     * Send a simple non-streaming chat request (for testing)
     */
    async chat(prompt: string): Promise<string> {
        const chunks: string[] = [];
        
        for await (const chunk of this.streamChat(prompt)) {
            chunks.push(chunk);
        }
        
        return chunks.join('');
    }
}
