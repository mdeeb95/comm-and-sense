import { AgentCheckResult } from '../types/index.js';
import { DomNodeData } from '../capture/dom.js';

export function buildPrompt(
    hasBaseline: boolean,
    expectStr?: string,
    domContext?: DomNodeData[],
    mode?: 'semantic-structure' | 'strict-layout'
): string {
    const schemaInstruction = `
You must respond with ONLY valid JSON matching this schema:
{
  "pass": boolean, // true if the test image matches intentions/expectations
  "confidence": number, // 0.0 to 1.0
  "feedback": "string explaining reasoning",
  "issues": [
    {
      "type": "state_break" | "layout_break" | "z_index_issue" | "missing_element" | "text_overflow" | "rendering_artifact",
      "severity": "high" | "medium" | "low",
      "description": "string",
      "region": { "x": number, "y": number, "width": number, "height": number, "source": "estimated" } // optional
    }
  ]
}
`.trim();

    let contextInstruction = '';
    if (domContext && domContext.length > 0) {
        // Only pass a simplified version to save tokens if it's large, but here we stringify directly
        contextInstruction = `
Here is the visible DOM Accessibility Tree bounding boxes (JSON) for the test image:
\`\`\`json
${JSON.stringify(domContext.slice(0, 100), null, 2)} // Truncated to first 100 nodes to preserve tokens
\`\`\`
Use this DOM data to ground your spatial understanding and prevent hallucinations. If an element appears missing but exists and is visible in the DOM, it might be a visual bug (e.g., z-index overlap or off-screen).
`.trim();
    }

    const modeInstruction = mode === 'semantic-structure'
        ? 'Focus on semantic structure and state bugs (e.g., missing items, correct toggles, z-index overlaps). Ignore minor 1-2px padding shifts or font smoothing differences.'
        : 'Focus on strict layout adherence. Even minor padding differences should be flagged.';

    let coreInstruction = '';
    if (hasBaseline) {
        coreInstruction = `
I have provided TWO images. 
Image 1 is the Anchor/Baseline (the "known good" HTML mockup or expected state).
Image 2 is the Test Image (the current implementation output).

1. Memorize the semantic structure, specific elements, and state intent of Image 1.
2. Compare Image 2 against Image 1.
3. ${modeInstruction}
${expectStr ? `\nAdditional specific expectation to verify: "${expectStr}"` : ''}
    `.trim();
    } else {
        coreInstruction = `
I have provided ONE image (the Test Image).
There is NO baseline image. You must evaluate the image purely based on the following specific expectation:
"${expectStr || 'Ensure the UI looks complete and free of obvious rendering artifacts.'}"

1. Examine the image carefully.
2. ${modeInstruction}
    `.trim();
    }

    return `
You are a senior UI quality assurance agent.
${schemaInstruction}

${coreInstruction}

${contextInstruction}
`.trim();
}
