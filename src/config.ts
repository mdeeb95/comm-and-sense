import { CommSenseConfig } from './types/index.js';

// Default configuration fallback
export const defaultConfig: CommSenseConfig = {
    providers: {
        claude: { apiKey: process.env.COMM_SENSE_CLAUDE_API_KEY || '' },
        openai: { apiKey: process.env.COMM_SENSE_OPENAI_API_KEY || '' },
        local: { endpoint: process.env.COMM_SENSE_LOCAL_ENDPOINT || 'http://localhost:11434' },
        qwen: {
            apiKey: process.env.COMM_SENSE_QWEN_API_KEY || '',
            baseURL: process.env.COMM_SENSE_QWEN_BASE_URL
        },
        openrouter: {
            apiKey: process.env.COMM_SENSE_OPENROUTER_API_KEY || ''
        },
        gemini: {
            apiKey: process.env.COMM_SENSE_GEMINI_API_KEY || '',
            model: 'gemini-2.5-pro'
        },
        mistral: {
            apiKey: process.env.COMM_SENSE_MISTRAL_API_KEY || '',
            model: 'pixtral-12b-2409'
        }
    },
    defaultModel: 'claude',
    defaultEnsemble: 1,
    defaultAutoDownscale: true
};

export function mergeConfig(userConfig: Partial<CommSenseConfig>): CommSenseConfig {
    return {
        ...defaultConfig,
        ...userConfig,
        providers: {
            ...defaultConfig.providers,
            ...userConfig.providers
        }
    };
}
