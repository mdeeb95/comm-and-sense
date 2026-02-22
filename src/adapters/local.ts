import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

/**
 * A simple dummy/mock adapter. 
 * Later, this will be replaced with real Ollama/vLLM HTTP calls.
 */
export class LocalAdapter implements VLMAdapter {
    name = 'local';
    private endpoint: string;

    constructor(endpoint: string = 'http://localhost:11434') {
        this.endpoint = endpoint;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // In a real local adapter, we'd base64 the images and HTTP POST to this.endpoint
        // For now, return a deterministic mock pass response
        const mockResponse = JSON.stringify({
            pass: true,
            confidence: 1.0,
            feedback: "Mock local adapter passing perfectly. Images received: " + images.length,
            issues: []
        });

        const latencyMs = Date.now() - startTime + 50; // Add 50ms fake latency

        return {
            response: mockResponse,
            latencyMs,
        };
    }
}
