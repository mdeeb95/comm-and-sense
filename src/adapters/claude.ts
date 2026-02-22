import Anthropic from '@anthropic-ai/sdk';
import { VLMAdapter, EvaluateOptions, EvaluateResult } from './adapter.js';

export class ClaudeAdapter implements VLMAdapter {
    name = 'claude';
    private client: Anthropic;
    private defaultModel: string;

    constructor(apiKey: string, model: string = 'claude-4-5-sonnet-latest') {
        if (!apiKey) {
            throw new Error('ClaudeAdapter requires an API key');
        }
        this.client = new Anthropic({ apiKey });
        this.defaultModel = model;
    }

    async evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult> {
        const startTime = Date.now();

        // Map buffers into Anthropic's image_block format
        const content: Anthropic.MessageParam['content'] = images.map((img) => ({
            type: 'image',
            source: {
                type: 'base64',
                media_type: 'image/png', // Comm&Sense standardizes on PNG early in the pipeline
                data: img.toString('base64'),
            },
        }));

        // Add the text prompt at the end
        content.push({
            type: 'text',
            text: prompt,
        });

        const response = await this.client.messages.create({
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

        // Anthropic returns an array of content blocks, we extract the primary text block
        const textBlock = response.content.find((block) => block.type === 'text') as Anthropic.TextBlock | undefined;
        const responseText = textBlock ? textBlock.text : '';

        return {
            response: responseText,
            latencyMs,
        };
    }
}
