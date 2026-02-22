import { Page } from 'playwright';

export type IssueType =
    | 'state_break'
    | 'layout_break'
    | 'z_index_issue'
    | 'missing_element'
    | 'text_overflow'
    | 'rendering_artifact';

export interface VisualIssue {
    type: IssueType;
    severity: 'high' | 'medium' | 'low';
    description: string;
    region?: {
        x: number;
        y: number;
        width: number;
        height: number;
        source: 'dom' | 'estimated';
    };
}

export interface AgentCheckResult {
    pass: boolean;
    confidence: number;
    feedback: string;
    issues: VisualIssue[];
    annotatedScreenshot?: string;
    /** Total execution latency in milliseconds */
    latencyMs?: number;
}

export interface AgentCheckOptions {
    /** The baseline image to anchor the test against (HTML Mockup) */
    baseline?: string | Buffer | Page;

    /** The current screenshot to evaluate */
    current: string | Buffer | Page;

    /** Modes for comparison */
    mode?: 'semantic-structure' | 'strict-layout';

    /** Natural language expectations to supplement the baseline */
    expect?: string;

    /** Non-determinism mitigation strategy */
    determinism?: 'default' | 'consensus';

    /** Number of runs for consensus voting (default: 3) */
    ensemble?: number;

    /** VLM provider to use */
    model?: 'claude' | 'openai' | 'local' | 'qwen' | 'openrouter';

    /** DOM enrichment options */
    dom?: {
        accessibilityTree?: boolean;
        boundingBoxes?: boolean;
    };
}

export interface CommSenseConfig {
    providers: {
        claude?: { apiKey: string };
        openai?: { apiKey: string; baseURL?: string; model?: string };
        local?: { endpoint: string };
        qwen?: { apiKey: string; baseURL?: string; model?: string };
        openrouter?: { apiKey: string; model?: string };
    };
    defaultModel: 'claude' | 'openai' | 'local' | 'qwen' | 'openrouter';
    defaultEnsemble: number;
}
