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

    /** Regions to explicitly instruct the VLM to ignore (e.g. to avoid baseline drift false positives) */
    ignoreRegions?: { x: number; y: number; width: number; height: number; }[];

    /** Natural language expectations to supplement the baseline */
    expect?: string;

    /** Non-determinism mitigation strategy */
    determinism?: 'default' | 'consensus';

    /** Number of runs for consensus voting (default: 3) */
    ensemble?: number;

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
}
