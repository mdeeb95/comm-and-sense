import fs from 'fs';
import path from 'path';
import { createAdapter } from '../src/adapters/index.js';
import { CommSenseConfig } from '../src/types/index.js';

// To test this script:
// 1. Create a quick mock image: touch test-image.png (or use a real one)
// 2. Export your key: export COMM_SENSE_OPENROUTER_API_KEY="sk-or-v1-..."
// 3. Run: npx tsx scripts/verify-vlm.ts

async function run() {
    console.log("=== Comm & Sense: VLM Validation Script ===");

    // 1. Mock up a configuration targeting OpenRouter
    const config: CommSenseConfig = {
        defaultModel: 'openrouter',
        defaultEnsemble: 1,
        providers: {
            openrouter: {
                apiKey: process.env.COMM_SENSE_OPENROUTER_API_KEY || '',
                model: 'qwen/qwen-vl-max:free' // Using a free tier openrouter model for test, or swap to 'anthropic/claude-3.5-sonnet'
            }
        }
    };

    if (!config.providers.openrouter?.apiKey) {
        console.error("❌ Error: COMM_SENSE_OPENROUTER_API_KEY environment variable is missing.");
        console.error("Please run: export COMM_SENSE_OPENROUTER_API_KEY='your-key'");
        process.exit(1);
    }

    // 2. Instantiate the universal OpenAI adapter (which OpenRouter uses)
    const adapter = createAdapter(config);
    console.log(`✅ Adapter instantiated successfully: ${adapter.name}`);

    // 3. Load a test image (create a dummy 1x1 black png if none exists to avoid crashing)
    const testImagePath = path.join(process.cwd(), 'scripts', 'test-image.png');
    if (!fs.existsSync(testImagePath)) {
        console.log("Creating a minimal 1x1 PNG for testing...");
        // Minimal valid 1x1 transparent PNG base64
        const minimalPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
        fs.mkdirSync(path.join(process.cwd(), 'scripts'), { recursive: true });
        fs.writeFileSync(testImagePath, minimalPng);
    }

    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`✅ Loaded image buffer (size: ${imageBuffer.length} bytes)`);

    // 4. Fire the evaluation!
    console.log('🚀 Sending request to OpenRouter / Qwen-VL-Max...');
    try {
        const result = await adapter.evaluate(
            [imageBuffer],
            'This is a test of the Comm & Sense Agentic Visual Oracle. Please describe exactly what you see in the image you just received. If it is a tiny 1x1 dot, just say so.'
        );

        console.log("\n--- VLM RESPONSE ---");
        console.log(result.response);
        console.log("--------------------");
        console.log(`⏱️ Latency: ${result.latencyMs}ms`);
    } catch (error: any) {
        console.error("❌ Evaluation Failed!");
        console.error(error.message);
    }
}

run();
