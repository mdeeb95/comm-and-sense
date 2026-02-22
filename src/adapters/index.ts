import { CommSenseConfig } from '../types/index.js';
import { VLMAdapter } from './adapter.js';
import { ClaudeAdapter } from './claude.js';
import { LocalAdapter } from './local.js';

export function createAdapter(config: CommSenseConfig): VLMAdapter {
    const model = config.defaultModel;

    switch (model) {
        case 'claude': {
            const apiKey = config.providers.claude?.apiKey;
            if (!apiKey) {
                throw new Error('Claude API key is missing from configuration');
            }
            return new ClaudeAdapter(apiKey);
        }
        case 'local': {
            const endpoint = config.providers.local?.endpoint;
            return new LocalAdapter(endpoint);
        }
        case 'openai': {
            // Stub for OpenAI, will throw unhandled for now until we build openai.ts
            throw new Error('OpenAI adapter is not yet implemented');
        }
        default:
            throw new Error(`Unsupported model configured: ${model}`);
    }
}
