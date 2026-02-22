import { CommSenseConfig } from './types/index.js';

// Default configuration fallback
export const defaultConfig: CommSenseConfig = {
    providers: {
        claude: { apiKey: process.env.COMM_SENSE_CLAUDE_API_KEY || '' },
        openai: { apiKey: process.env.COMM_SENSE_OPENAI_API_KEY || '' },
        local: { endpoint: process.env.COMM_SENSE_LOCAL_ENDPOINT || 'http://localhost:11434' }
    },
    defaultModel: 'claude',
    defaultEnsemble: 1
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
