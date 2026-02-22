export interface EvaluateOptions {
    temperature?: number;
    maxTokens?: number;
}

export interface EvaluateResult {
    response: string;
    latencyMs: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };
}

export interface VLMAdapter {
    name: string;
    evaluate(
        images: Buffer[],
        prompt: string,
        options?: EvaluateOptions
    ): Promise<EvaluateResult>;
}
