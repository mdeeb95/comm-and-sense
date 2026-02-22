import { describe, it, expect, beforeEach } from 'vitest';
import { mergeConfig, defaultConfig } from './config.js';

describe('Configuration Layer', () => {
    beforeEach(() => {
        // Reset env vars before each test to ensure isolation
        delete process.env.COMM_SENSE_CLAUDE_API_KEY;
    });

    it('provides sensible defaults', () => {
        const config = mergeConfig({});
        expect(config.defaultModel).toBe('claude');
        expect(config.defaultEnsemble).toBe(1);
        expect(config.providers.local?.endpoint).toBe('http://localhost:11434');
    });

    it('allows overriding providers and primitives', () => {
        const customConfig = mergeConfig({
            defaultModel: 'openai',
            defaultEnsemble: 3,
            providers: {
                openai: { apiKey: 'sk-test' }
            }
        });

        expect(customConfig.defaultModel).toBe('openai');
        expect(customConfig.defaultEnsemble).toBe(3);
        expect(customConfig.providers.openai?.apiKey).toBe('sk-test');

        // Ensure we didn't overwrite the nested local config unintentionally
        expect(customConfig.providers.local?.endpoint).toBe('http://localhost:11434');
    });
});
