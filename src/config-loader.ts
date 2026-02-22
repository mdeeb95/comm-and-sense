import { CommSenseConfig } from './types/index.js';
import { mergeConfig } from './config.js';
import fs from 'fs';
import path from 'path';

/**
 * Attempts to load a local comm-sense.config.js/ts file from the user's cwd.
 */
export async function loadConfig(): Promise<CommSenseConfig> {
    const cwd = process.cwd();
    const configPaths = [
        path.join(cwd, 'comm-sense.config.js'),
        path.join(cwd, 'comm-sense.config.mjs'),
        path.join(cwd, 'comm-sense.config.cjs')
    ];

    let rawConfig: Partial<CommSenseConfig> = {};

    for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
            try {
                const imported = await import(`file://${configPath}`);
                rawConfig = imported.default || imported;
                break; // Stop at the first found config
            } catch (err: any) {
                console.warn(`Failed to parse configuration file at ${configPath}: ${err.message}`);
            }
        }
    }

    // Merge the loaded user configuration with the default (and .env mapped) configuration
    return mergeConfig(rawConfig);
}
