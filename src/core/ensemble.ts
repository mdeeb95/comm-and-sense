import { AgentCheckResult, VisualIssue } from '../types/index.js';

/**
 * Computes the majority consensus from a list of AgentCheckResults.
 * Handles deterministic resolution when running multiple inference checks (e.g., ensemble: 3).
 */
export function resolveEnsemble(results: AgentCheckResult[]): AgentCheckResult {
    if (!results || results.length === 0) {
        throw new Error('Cannot resolve ensemble with 0 results');
    }

    if (results.length === 1) {
        return results[0];
    }

    const passCount = results.filter(r => r.pass).length;
    const failCount = results.length - passCount;

    const finalPass = passCount >= failCount;

    // Find the 'best' representative result that matches the majority vote.
    // We'll pick the one with the highest confidence among the majority group.
    const majorityResults = results.filter(r => r.pass === finalPass);
    const bestResult = majorityResults.sort((a, b) => b.confidence - a.confidence)[0];

    const avgLatency = results.reduce((acc, r) => acc + (r.latencyMs || 0), 0) / results.length;

    // Optionally we could aggregate all issues into a unique set, but for now 
    // relying on the best representative result prevents duplicate issue spam.
    return {
        pass: finalPass,
        confidence: bestResult.confidence,
        feedback: `[Ensemble ${passCount}/${results.length} Pass] ${bestResult.feedback}`,
        issues: bestResult.issues,
        annotatedScreenshot: bestResult.annotatedScreenshot,
        latencyMs: Math.round(avgLatency)
    };
}
