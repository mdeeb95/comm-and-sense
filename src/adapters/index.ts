import { CommSenseConfig } from '../types/index.js';
import { VLMAdapter } from './adapter.js';
import { ClaudeAdapter } from './claude.js';
import { LocalAdapter } from './local.js';
import { QwenAdapter } from './qwen.js';
import { OpenAIAdapter } from './openai.js';

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
            const apiKey = config.providers.openai?.apiKey;
            const baseURL = config.providers.openai?.baseURL;
            if (!apiKey) {
                throw new Error('OpenAI API key is missing from configuration');
            }
            return new OpenAIAdapter(apiKey, baseURL, config.providers.openai?.model);
        }
        case 'openrouter': {
            const apiKey = config.providers.openrouter?.apiKey;
            if (!apiKey) {
                throw new Error('OpenRouter API key is missing from configuration');
            }
            return new OpenAIAdapter(apiKey, 'https://openrouter.ai/api/v1', config.providers.openrouter?.model || 'qwen/qwen-vl-max');
        }
        case 'qwen': {
            const apiKey = config.providers.qwen?.apiKey;
            const baseURL = config.providers.qwen?.baseURL;
            if (!apiKey) {
                throw new Error('Qwen API key is missing from configuration');
            }
            return new OpenAIAdapter(apiKey, baseURL, config.providers.qwen?.model);
        }
        default:
            throw new Error(`Unsupported model configured: ${model}`);
    }
}
