import OpenAI from 'openai';
import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

export class OpenAIAdapter implements VLMAdapter {
    name = 'openai-compatible';
    private client: OpenAI;
    private defaultModel: string;

    constructor(apiKey: string, baseURL?: string, model: string = 'gpt-4o') {
        if (!apiKey) {
            throw new Error('OpenAIAdapter requires an API key');
        }
        this.client = new OpenAI({
            apiKey,
            baseURL // If undefined, defaults to official OpenAI 'https://api.openai.com/v1'
        });
        this.defaultModel = model;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // Map buffers into OpenAI vision compatible format
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

        let usage;
        if (response.usage) {
            usage = {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens
            };
        }

        return {
            response: response.choices[0]?.message?.content || '',
            latencyMs,
            usage
        };
    }
}
