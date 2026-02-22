import { GoogleGenAI } from '@google/genai';
import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

export class GeminiAdapter implements VLMAdapter {
    name = 'gemini';
    private client: GoogleGenAI;
    private defaultModel: string;

    constructor(apiKey?: string, model: string = 'gemini-2.5-pro') {
        // The SDK automatically falls back to process.env.GEMINI_API_KEY
        this.client = new GoogleGenAI(apiKey ? { apiKey } : {});
        this.defaultModel = model;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // The new Google Gen AI SDK accepts base64 parts
        const parts: any[] = images.map((img) => ({
            inlineData: {
                data: img.toString('base64'),
                mimeType: 'image/png' // Comm&Sense standardizes on PNG early in the pipeline
            }
        }));

        parts.push({
            text: prompt,
        });

        const response = await this.client.models.generateContent({
            model: this.defaultModel,
            contents: parts,
            config: {
                maxOutputTokens: options?.maxTokens || 4096,
                temperature: options?.temperature || 0,
                // Using JSON mode as recommended for structural output
                responseMimeType: 'application/json'
            }
        });

        const latencyMs = Date.now() - startTime;

        return {
            response: response.text || '',
            latencyMs,
        };
    }
}
