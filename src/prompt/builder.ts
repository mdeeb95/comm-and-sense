import { AgentCheckResult } from '../types/index.js';
import { DomNodeData } from '../capture/dom.js';

export function buildPrompt(options: {
    hasBaseline: boolean;
    expectStr?: string;
    domContext?: DomNodeData[];
    mode?: 'semantic-structure' | 'strict-layout' | 'regression';
    baselineRole?: 'anchor' | 'known-bad';
    ignoreRegions?: { x: number; y: number; width: number; height: number; }[];
}): string {
    const { hasBaseline, expectStr, domContext, mode, baselineRole, ignoreRegions } = options;
    const schemaInstruction = `
You must respond with ONLY valid JSON matching this schema:
{
  "pass": boolean, // true if the test image matches intentions/expectations
  "confidence": number, // 0.0 to 1.0
  "feedback": "string explaining reasoning",
  "issues": [
    {
      "type": "state_break" | "layout_break" | "z_index_issue" | "missing_element" | "text_overflow" | "rendering_artifact" | "input_bleed" | "focus_trap_escape",
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

    let modeInstruction = '';
    if (mode === 'regression') {
        modeInstruction = 'This is a REGRESSION test. Focus strictly on whether the specific defect mentioned in the expectations is present. Ignore any other differences, layout drift, or new content.';
    } else if (mode === 'strict-layout') {
        modeInstruction = 'Focus on strict layout adherence. Even minor padding differences should be flagged.';
    } else {
        modeInstruction = 'Focus on semantic structure and state bugs (e.g., missing items, correct toggles, z-index overlaps, input bleed). Ignore minor 1-2px padding shifts or font smoothing differences.';
    }

    let maskInstruction = '';
    if (ignoreRegions && ignoreRegions.length > 0) {
        maskInstruction = `IGNORE REGIONS: Do not flag any visual differences, missing elements, or layout breaks within the following bounding boxes (coordinates: x,y,width,height): ${JSON.stringify(ignoreRegions)}.`;
    }

    let coreInstruction = '';
    if (hasBaseline) {
        if (baselineRole === 'known-bad') {
            coreInstruction = `
I have provided TWO images.
Image 1 is a KNOWN BUG (a defective baseline).
Image 2 is the Test Image (the current implementation output).

1. Identify the defect shown in Image 1 based on the expectations.
2. Verify that Image 2 does NOT exhibit this same defect.
3. ${modeInstruction}
${maskInstruction}
${expectStr ? `\nSpecific defect/expectation to check: "${expectStr}"` : ''}
            `.trim();
        } else {
            coreInstruction = `
I have provided TWO images. 
Image 1 is the Anchor/Baseline (the "known good" HTML mockup or expected state).
Image 2 is the Test Image (the current implementation output).

1. Memorize the semantic structure, specific elements, and state intent of Image 1.
2. Compare Image 2 against Image 1.
3. ${modeInstruction}
${maskInstruction}
${expectStr ? `\nAdditional specific expectation to verify: "${expectStr}"` : ''}
    `.trim();
        }
    } else {
        coreInstruction = `
I have provided ONE image (the Test Image).
There is NO baseline image. You must evaluate the image purely based on the following specific expectation:
"${expectStr || 'Ensure the UI looks complete and free of obvious rendering artifacts.'}"

1. Examine the image carefully.
2. ${modeInstruction}
${maskInstruction}
    `.trim();
    }

    return `
You are a senior UI quality assurance agent.
${schemaInstruction}

${coreInstruction}

${contextInstruction}
`.trim();
}
