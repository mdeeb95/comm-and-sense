import { Mistral } from '@mistralai/mistralai';
import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

export class MistralAdapter implements VLMAdapter {
    name = 'mistral';
    private client: Mistral;
    private defaultModel: string;

    constructor(apiKey: string, model: string = 'pixtral-12b-2409') {
        if (!apiKey) {
            throw new Error('MistralAdapter requires an API key');
        }
        this.client = new Mistral({ apiKey });
        this.defaultModel = model;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // Map buffers into Pixtral vision compatible format (using base64 URLs)
        const content: any[] = images.map((img) => ({
            type: 'image_url',
            imageUrl: `data:image/png;base64,${img.toString('base64')}`
        }));

        // Add the text prompt at the end
        content.push({
            type: 'text',
            text: prompt,
        });

        const response = await this.client.chat.complete({
            model: this.defaultModel,
            maxTokens: options?.maxTokens || 4096,
            temperature: options?.temperature || 0,
            messages: [
                {
                    role: 'user',
                    content,
                },
            ],
        });

        const latencyMs = Date.now() - startTime;

        // The Mistral SDK returns the message content as string | string[]
        const responseContent = response.choices?.[0]?.message?.content;
        const finalResponse = Array.isArray(responseContent) ? responseContent.join('\n') : (responseContent || '');

        let usage;
        if (response.usage) {
            usage = {
                promptTokens: response.usage.promptTokens || 0,
                completionTokens: response.usage.completionTokens || 0
            };
        }

        return {
            response: finalResponse,
            latencyMs,
            usage
        };
    }
}
