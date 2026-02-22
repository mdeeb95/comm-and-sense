import { describe, it, expect, beforeAll } from 'vitest';
import { createAdapter } from './index.js';
import { CommSenseConfig } from '../types/index.js';

/**
 * LIVE INTEGRATION TEST
 * This test actually pings OpenRouter. It will automatically skip if 
 * the COMM_SENSE_OPENROUTER_API_KEY environment variable is not set.
 */
const hasApiKey = !!process.env.COMM_SENSE_OPENROUTER_API_KEY;

describe.runIf(hasApiKey)('OpenRouter Live Integration', () => {
    it('successfully analyzes a 1x1 image via openrouter/free', async () => {
        // 1. Build config
        const config: CommSenseConfig = {
            defaultModel: 'openrouter',
            defaultEnsemble: 1,
            providers: {
                openrouter: {
                    apiKey: process.env.COMM_SENSE_OPENROUTER_API_KEY as string,
                    model: 'openrouter/free'
                }
            }
        };

        const adapter = createAdapter(config);
        expect(adapter.name).toBe('openai-compatible');

        // 2. Minimal valid 1x1 transparent PNG base64
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

        // 3. Send evaluation request
        // We set a high timeout because free routed models can be slow
        const result = await adapter.evaluate(
            [minimalPng],
            'Return the exact word "ACKNOWLEDGED". Do not return any other text.'
        );

        // 4. Assertions
        expect(result.response).toBeDefined();
        expect(result.response.length).toBeGreaterThan(0);
        // Since we are using an aggregator free tier, the exact model response can vary slightly,
        // but we expect to see evidence of the prompt being followed.
        expect(result.response.toUpperCase()).toContain('ACKNOWLEDGED');
        expect(result.latencyMs).toBeGreaterThan(0);
    }, 20000); // 20-second timeout for slow free API routing
});
