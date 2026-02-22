import fs from 'fs';
import { Page } from 'playwright';
import { AgentCheckOptions, AgentCheckResult, CommSenseConfig } from '../types/index.js';
import { extractDomContext, captureScreenshot, DomNodeData } from '../capture/dom.js';
import { createAdapter } from '../adapters/index.js';
import { resolveEnsemble } from './ensemble.js';
import { buildPrompt } from '../prompt/builder.js';
import { mergeConfig } from '../config.js';

/**
 * Loads a Buffer whether the input is a base64 string, file path, or Buffer.
 */
function resolveBuffer(input: string | Buffer): Buffer {
    if (Buffer.isBuffer(input)) return input;
    if (fs.existsSync(input)) return fs.readFileSync(input);
    throw new Error(`Unable to resolve image input. Not a valid buffer or file path: ${input}`);
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

    // 4. Build Prompt & Execute Ensembles
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

    const ensembleCount = options.ensemble || config.defaultEnsemble || 1;
    const inferencePromises: Promise<AgentCheckResult>[] = [];

    for (let i = 0; i < ensembleCount; i++) {
        inferencePromises.push(
            (async () => {
                try {
                    const result = await adapter.evaluate(images, prompt);
                    // Strip out markdown fencing if VLM wrapped the JSON (e.g. ```json ... ```)
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
                    } catch (e) {
                        // High chance of hallucinated format. Fallback fail.
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
                    // Network errors or adapter throws
                    return {
                        pass: false,
                        confidence: 0,
                        feedback: `Adapter Evaluation Error: ${error.message}`,
                        issues: []
                    };
                }
            })()
        );
    }

    const results = await Promise.all(inferencePromises);

    // 5. Resolve Votes
    return resolveEnsemble(results);
}
