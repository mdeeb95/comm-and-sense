import fs from 'fs';
import { Page } from 'playwright';
import { AgentCheckOptions, AgentCheckResult, CommSenseConfig } from '../types/index.js';
import { extractDomContext, captureScreenshot, DomNodeData } from '../capture/dom.js';
import { createAdapter } from '../adapters/index.js';
import { resolveEnsemble } from './ensemble.js';
import { buildPrompt } from '../prompt/builder.js';
import { mergeConfig } from '../config.js';
import { Jimp } from 'jimp';

/**
 * Loads a Buffer whether the input is a base64 string, file path, or Buffer.
 */
function resolveBuffer(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) return input;
    if (fs.existsSync(input)) return fs.readFileSync(input);
    throw new Error(`Unable to resolve image input. Not a valid buffer or file path: ${input}`);
}

/**
 * Resizes an image buffer by 50%
 */
async function downscaleImage(buffer: Buffer): Promise<Buffer> {
    try {
        const image = await Jimp.read(buffer);
        image.resize({ w: image.bitmap.width / 2 });
        return await image.getBuffer('image/png');
    } catch (e) {
        console.warn('Failed to downscale image, falling back to original resolution', e);
        return buffer;
    }
}

/**
 * Very rough estimate of cost per 1M tokens for major models.
 * Prices vary frequently; these are intended as directional telemetry.
 */
function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    const prices: Record<string, { prompt: number, completion: number }> = {
        'claude-4-5-sonnet-latest': { prompt: 3, completion: 15 },
        'claude-3-5-sonnet-20241022': { prompt: 3, completion: 15 },
        'gpt-4o': { prompt: 2.5, completion: 10 },
        'gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
        'qwen-vl-max': { prompt: 0.5, completion: 0.5 },
        'gemini-2.5-pro': { prompt: 1.25, completion: 5 },
        'pixtral-12b-2409': { prompt: 0.1, completion: 0.1 }
    };

    const rate = prices[model] || { prompt: 1, completion: 1 }; // Fallback to 1/1 per 1M if unknown
    const cost = (promptTokens / 1_000_000) * rate.prompt + (completionTokens / 1_000_000) * rate.completion;
    return parseFloat(cost.toFixed(6));
}

/**
 * The primary entry point for Comm & Sense visual evaluation.
 */
export async function agentCheck(options: AgentCheckOptions, userConfig?: Partial<CommSenseConfig>): Promise<AgentCheckResult> {
    // 1. Resolve Config & Instatiate Adapter
    const config = mergeConfig(userConfig || {});

    // Override model if explicitly requested in this call
    if (options.model) {
        config.defaultModel = options.model;
    }

    const adapter = createAdapter(config);

    // 2. Resolve Inputs (Handle Playwright vs Static Image)
    let currentImageBuffer: Buffer;
    let domContext: DomNodeData[] | undefined;

    let captureTime = 0;
    let domTime = 0;

    const startCurrent = Date.now();
    // We duck-type the playwright Page object to handle the union
    if ((options.current as any).screenshot && typeof (options.current as any).screenshot === 'function') {
        const page = options.current as Page;
        currentImageBuffer = await captureScreenshot(page);
        captureTime += Date.now() - startCurrent;

        // Only extract DOM if not explicitly disabled
        if (options.dom?.boundingBoxes !== false && options.dom?.accessibilityTree !== false) {
            const startDom = Date.now();
            domContext = await extractDomContext(page);
            domTime = Date.now() - startDom;
        }
    } else {
        currentImageBuffer = resolveBuffer(options.current as string | Buffer);
        captureTime += Date.now() - startCurrent;
    }

    // 3. Resolve Baseline
    let baselineBuffer: Buffer | undefined;
    if (options.baseline) {
        const startBase = Date.now();
        if ((options.baseline as any).screenshot && typeof (options.baseline as any).screenshot === 'function') {
            baselineBuffer = await captureScreenshot(options.baseline as Page);
        } else {
            baselineBuffer = resolveBuffer(options.baseline as string | Buffer);
        }
        captureTime += Date.now() - startBase;
    }

    // 4. Optionally auto-downscale for semantic-structure mode
    const shouldDownscale = options.autoDownscale ?? (options.mode === 'semantic-structure' && config.defaultAutoDownscale);
    if (shouldDownscale) {
        const resizeStart = Date.now();
        currentImageBuffer = await downscaleImage(currentImageBuffer);
        if (baselineBuffer) {
            baselineBuffer = await downscaleImage(baselineBuffer);
        }
        captureTime += Date.now() - resizeStart;
    }

    // 5. Build Prompt & Execute Ensembles
    const hasBaseline = !!baselineBuffer;
    const prompt = buildPrompt({
        hasBaseline,
        expectStr: options.expect,
        domContext,
        mode: options.mode,
        baselineRole: options.baselineRole,
        ignoreRegions: options.ignoreRegions
    });

    const images = baselineBuffer ? [baselineBuffer, currentImageBuffer] : [currentImageBuffer];

    const ensembleOpt = options.ensemble || config.defaultEnsemble || 1;
    let strategy: 'fixed' | 'adaptive' = 'fixed';
    let maxRuns = 1;
    let threshold = 0.85;

    if (typeof ensembleOpt === 'number') {
        maxRuns = ensembleOpt;
    } else {
        strategy = ensembleOpt.strategy;
        maxRuns = ensembleOpt.maxRuns || 3;
        threshold = ensembleOpt.threshold ?? 0.85;
    }

    const runInference = async (): Promise<AgentCheckResult> => {
        try {
            const result = await adapter.evaluate(images, prompt);
            let cleanStr = result.response.replace(/^```json/m, '').replace(/```$/m, '').trim();

            let parsed: AgentCheckResult;
            try {
                parsed = JSON.parse(cleanStr);
                parsed.latencyBreakdown = {
                    capture: captureTime,
                    domExtraction: domTime,
                    vlmInference: result.latencyMs || 0
                };
                if (domContext) parsed.domContext = domContext;

                // Calculate and attach cost
                if (result.usage) {
                    const providerConfig = config.providers[config.defaultModel] as any;
                    const modelName = providerConfig?.model || adapter.name;
                    parsed.estimatedCostUsd = calculateCost(modelName, result.usage.promptTokens, result.usage.completionTokens);
                }
            } catch (e) {
                parsed = {
                    pass: false,
                    confidence: 0,
                    feedback: `VLM failed to return valid JSON. Raw response: ${cleanStr}`,
                    issues: [],
                    latencyBreakdown: {
                        capture: captureTime,
                        domExtraction: domTime,
                        vlmInference: result.latencyMs || 0
                    }
                };
            }
            return parsed;
        } catch (error: any) {
            return {
                pass: false,
                confidence: 0,
                feedback: `Adapter Evaluation Error: ${error.message}`,
                issues: []
            };
        }
    };

    const results: AgentCheckResult[] = [];

    // First run
    const firstResult = await runInference();
    results.push(firstResult);

    // If adaptive, check if we need to escalate
    if (strategy === 'adaptive' && firstResult.confidence < threshold && maxRuns > 1) {
        const remainingRuns = maxRuns - 1;
        const inferencePromises: Promise<AgentCheckResult>[] = [];
        for (let i = 0; i < remainingRuns; i++) {
            inferencePromises.push(runInference());
        }
        const escalatingResults = await Promise.all(inferencePromises);
        results.push(...escalatingResults);
    }
    // If fixed, run all upfront
    else if (strategy === 'fixed' && maxRuns > 1) {
        const remainingRuns = maxRuns - 1;
        const inferencePromises: Promise<AgentCheckResult>[] = [];
        for (let i = 0; i < remainingRuns; i++) {
            inferencePromises.push(runInference());
        }
        const batchResults = await Promise.all(inferencePromises);
        results.push(...batchResults);
    }

    // 5. Resolve Votes
    return resolveEnsemble(results);
}
