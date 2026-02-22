import OpenAI from 'openai';
import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

export class QwenAdapter implements VLMAdapter {
    name = 'qwen';
    private client: OpenAI;
    private defaultModel: string;

    constructor(apiKey: string, baseURL?: string, model: string = 'qwen-vl-max-latest') {
        if (!apiKey) {
            throw new Error('QwenAdapter requires an API key');
        }
        this.client = new OpenAI({
            apiKey,
            baseURL: baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
        });
        this.defaultModel = model;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // Map buffers into OpenAI/Qwen vision compatible format
        const content: any[] = images.map((img) => ({
            type: 'image_url',
            image_url: {
                url: `data:image/png;base64,${img.toString('base64')}`
            }
        }));

        // Add the text prompt at the end
        content.push({
            type: 'text',
            text: prompt,
        });

        const response = await this.client.chat.completions.create({
            model: this.defaultModel,
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature || 0,
            messages: [
                {
                    role: 'user',
                    content,
                },
            ],
        });

        const latencyMs = Date.now() - startTime;

        return {
            response: response.choices[0]?.message?.content || '',
            latencyMs,
        };
    }
}
