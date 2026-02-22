import { Page } from 'playwright';

export type IssueType =
    | 'state_break'
    | 'layout_break'
    | 'z_index_issue'
    | 'missing_element'
    | 'text_overflow'
    | 'rendering_artifact'
    | 'input_bleed'
    | 'focus_trap_escape';

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
    /** Detailed breakdown of where time was spent during the test */
    latencyBreakdown?: {
        capture: number;
        domExtraction: number;
        vlmInference: number;
    };
    /** The actual structured layout data passed to the VLM (if dom extraction was used) */
    domContext?: any;
    /** Estimated cost in USD of the API calls made during this evaluation */
    estimatedCostUsd?: number;
}

export interface AgentCheckOptions {
    /** The baseline image to anchor the test against (HTML Mockup or Known Bug) */
    baseline?: string | Buffer | Page;

    /** 
     * Whether the baseline represents a perfect 'anchor' or a 'known-bad' state to specifically test against.
     * Default: 'anchor'
     */
    baselineRole?: 'anchor' | 'known-bad';

    /** The current screenshot to evaluate */
    current: string | Buffer | Page;

    /** Modes for comparison */
    mode?: 'semantic-structure' | 'strict-layout' | 'regression';

    /** 
     * Whether to automatically downscale images (by 50%) before sending to the VLM.
     * If undefined, defaults to `true` when mode is `semantic-structure`.
     */
    autoDownscale?: boolean;

    /** Regions to explicitly instruct the VLM to ignore (e.g. to avoid baseline drift false positives) */
    ignoreRegions?: { x: number; y: number; width: number; height: number; }[];

    /** Natural language expectations to supplement the baseline */
    expect?: string;

    /** Non-determinism mitigation strategy */
    determinism?: 'default' | 'consensus';

    /** 
     * Number of runs for consensus voting, or an adaptive strategy configuration.
     * Adaptive strategy will run once, and only escalate to `maxRuns` if confidence is below `threshold`.
     * default: 1
     */
    ensemble?: number | {
        strategy: 'adaptive';
        threshold?: number; // default: 0.85
        maxRuns?: number;   // default: 3
    };

    /** VLM provider to use */
    model?: 'claude' | 'openai' | 'local' | 'qwen' | 'openrouter' | 'gemini' | 'mistral';

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
        gemini?: { apiKey: string; model?: string };
        mistral?: { apiKey: string; model?: string };
    };
    defaultModel: 'claude' | 'openai' | 'local' | 'qwen' | 'openrouter' | 'gemini' | 'mistral';
    defaultEnsemble: number;
    defaultAutoDownscale: boolean;
}
