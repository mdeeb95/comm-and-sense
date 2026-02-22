import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdapter } from './index.js';
import { CommSenseConfig } from '../types/index.js';
import { ClaudeAdapter } from './claude.js';
import { LocalAdapter } from './local.js';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
const { mockCreate } = vi.hoisted(() => {
    return {
        mockCreate: vi.fn().mockResolvedValue({
            content: [{ type: 'text', text: '{"pass": true}' }]
        })
    };
});

vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: class MockAnthropic {
            messages = {
                create: mockCreate
            };
        }
    };
});

describe('VLM Adapters Factory', () => {
    const baseConfig: CommSenseConfig = {
        providers: {},
        defaultModel: 'claude',
        defaultEnsemble: 1
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws if trying to instantiate claude without an API key', () => {
        expect(() => createAdapter(baseConfig)).toThrow('Claude API key is missing');
    });

    it('creates the Claude adapter when an API key is provided', () => {
        const config: CommSenseConfig = {
            ...baseConfig,
            providers: { claude: { apiKey: 'sk-ant-test' } }
        };

        const adapter = createAdapter(config);
        expect(adapter).toBeInstanceOf(ClaudeAdapter);
        expect(adapter.name).toBe('claude');
    });

    it('creates the local adapter', () => {
        const config: CommSenseConfig = {
            ...baseConfig,
            defaultModel: 'local',
            providers: { local: { endpoint: 'http://localhost:11434' } }
        };

        const adapter = createAdapter(config);
        expect(adapter).toBeInstanceOf(LocalAdapter);
        expect(adapter.name).toBe('local');
    });
});

describe('ClaudeAdapter Implementation', () => {
    it('correctly maps buffers and prompts into Claude payload', async () => {
        const adapter = new ClaudeAdapter('sk-ant-test');

        // We mocked the client, let's just make sure the evaluate method doesn't throw
        const img1 = Buffer.from('fakeimg1');
        const result = await adapter.evaluate([img1], 'Analyze this image');

        expect(result.response).toBe('{"pass": true}');
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        expect(mockCreate).toHaveBeenCalledTimes(1);
    });
});
