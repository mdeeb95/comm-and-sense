# Comm & Sense — Product Specification

*Version 0.3 — February 22, 2026 (Agentic TDD & Empirical Validation Update)*
*Status: Draft — Pre-development*

---

## Table of Contents

1. [Vision & Problem Statement](#vision--problem-statement)
2. [Product Overview](#product-overview)
3. [Target Users](#target-users)
4. [Insights from Academic Research (arXiv:2501.09236)](#insights-from-academic-research-arxiv250109236)
5. [Core Concepts](#core-concepts)
6. [Feature Specification](#feature-specification)
7. [API Reference (Draft)](#api-reference-draft)
8. [System Architecture](#system-architecture)
9. [Prompt Engineering Strategy](#prompt-engineering-strategy)
10. [Error Taxonomy](#error-taxonomy)
11. [Plugin System](#plugin-system)
12. [Performance Strategy](#performance-strategy)
13. [Distribution & Packaging](#distribution--packaging)
14. [Open Source & Licensing](#open-source--licensing)
15. [Monetization Strategy](#monetization-strategy)
16. [Roadmap](#roadmap)
17. [Privacy & Data Handling](#privacy--data-handling)
18. [Tech Stack Decision](#tech-stack-decision)
19. [Open Questions](#open-questions)

---

## 1. Vision & Problem Statement

### The Problem
When utilizing AI coding assistants (Cursor, Windsurf, Copilot) to generate UI components, developers hit a "visual verification bottleneck." AI agents can write the code and ensure it compiles, but they are fundamentally blind. They cannot verify that the React/Tailwind code they just wrote actually looks like the design the developer requested.

Traditional visual testing (pixel-diffing) is too brittle for this workflow. If a developer provides an HTML/CSS mockup as a reference, the agent's complex React implementation will inevitably vary by a few pixels (font smoothing, anti-aliasing, minor padding differences). Pixel-diffing fails these comparisons immediately, making it useless for autonomous validation.

### The Vision
**Comm & Sense** is a VLM-powered "visual oracle" designed specifically for the Agentic TDD (Test-Driven Development) workflow. 

Instead of treating visual testing as an end-of-the-line CI/CD regression check, Comm & Sense is built for the local development loop. Developers provide a fast HTML/CSS mockup (or a Figma screenshot) as the "Ground Truth Baseline." Comm & Sense then gives the AI coding agent "eyes" to compare its own generated output against that baseline semantically. The agent can visually debug its own work until it matches the structural state of the mockup, all before the human developer even has to review it.

---

## 2. Product Overview

**What it is:** A standalone visual evaluation library that allows AI agents and developers to semantically compare generated UI against a structural baseline (mockup) using Vision-Language Models (VLMs) and browser DOM data.

**What it is not:** A pixel-perfect CI/CD regression tool, an accessibility auditor, or a Playwright replacement.

### Core Value Propositions

1. **Mockup-Driven Verification** — Compare complex framework implementations (React/Vue) against raw HTML mockups semantically, ignoring noise like 1px padding shifts or font-rendering artifacts.
2. **Agentic Self-Healing** — Returns structured JSON feedback (`{ pass: false, issues: ["Submit button is missing from the sidebar"] }`) that an AI coding assistant can read and act upon to fix its own code.
3. **Anchor-Based Accuracy** — Leverages the proven capability of VLMs to achieve near-100% accuracy when evaluating a test screenshot alongside a "known good" anchor image.
4. **State and Structural Focus** — Validates that the intended user journey (the state and elements) exists, rather than enforcing rigid pixel layouts.
5. **Hybrid Visual-DOM Architecture** — Combines screenshots with accessibility tree and DOM bounding box data to ground VLM judgments in structural truth, drastically reducing hallucinations.

---

## 3. Target Users

### Primary Persona: The Agent-Assisted Engineer
Engineers actively using AI workflows who prefer to rapid-prototype HTML mockups, and then have an agent port that design into complex production components.

**Workflow (Visual TDD):**
1. **Design:** Developer writes a simple HTML/CSS mockup of the desired screen.
2. **Anchor:** Developer sets the mockup as the Comm & Sense baseline.
3. **Generate:** Developer prompts the AI agent: "Implement this mockup as a responsive Next.js component."
4. **Validate:** Agent writes the code, opens a headless browser, and calls Comm & Sense to compare its output to the mockup.
5. **Heal:** Comm & Sense spots that the agent forgot the footer. The agent reads this feedback, updates the code, and re-runs Comm & Sense.
6. **Pass:** Comm & Sense returns `{pass: true}`. The developer now reviews a fully functional, visually verified component.

---

## 4. Insights from Academic Research (arXiv:2501.09236)

The recent paper ["Exploring the Capabilities of Vision-Language Models to Detect Visual Bugs in HTML5 <canvas> Applications"](https://arxiv.org/abs/2501.09236) investigated detecting visual bugs in a DOM-less environment. The methodologies and conclusions heavily inform Comm & Sense's architecture:

1. **Context (Baselines) is Mandatory:** VLM precision jumps dramatically (from ~34% to nearly 100%) only when provided with a *bug-free baseline screenshot*. Supplying just text expectations without an anchor image yields unreliable zero-shot results. Thus, Comm & Sense relies primarily on Anchor/Mockup-driven comparisons rather than raw text matching.
2. **Focus on "State" Bugs over "Layout":** VLMs are significantly better at detecting *State bugs* (missing items, correct toggles, logged-in status) than minor layout overlaps. Testing should emphasize semantic state.
3. **Multi-Step Prompting ("Context Anchoring"):** The highest accuracy strategy (`AllContextExceptAssets`) fed the VLM the baseline first, requested acknowledgment, and *then* fed the test screenshot. Single-turn inference is insufficient.
4. **Repeated Sampling for Determinism:** VLMs display high standard deviations in visual reasoning. Accuracy scales predictably when generating multiple outputs per screenshot ($pass@k$). Comm & Sense requires an ensemble approach to eliminate flakiness.

---

## 5. Core Concepts

### 1. Mockup-Anchored Mode (Recommended)
As validated by empirical research, providing the VLM with a "known good" baseline image (the HTML mockup) increases semantic bug detection accuracy from ~34% to nearly 100%. In this mode, the mockup acts as the Anchor, and the VLM evaluates the test component relationally.

### 2. Expectation Mode / Zero-Shot (Fully Supported)
While mockups represent the ideal TDD workflow, it is unrealistic to expect developers to mock every single state of an application. Comm & Sense fully supports passing *only* a natural language expectation string without a baseline image (e.g., `expect: "A blue submit button centered below the form."`). 
*Note:* To combat the higher inherent hallucination rate of zero-shot VLM evaluation, Comm & Sense heavily relies on DOM Enrichment in this mode to ground the VLM in structural reality.

### Semantic State Comparison
Whether using an Anchor or Zero-Shot, the core operation is heavily biased toward State and Structure. The VLM determines if the "Test Image" fundamentally fulfills the visual requirements defined by the inputs.

### Multi-Turn Context Anchoring (When Baseline is Present)
If a baseline is provided, Comm & Sense uses a multi-turn inference strategy:
1. Feed the VLM the Anchor Image and task description. Acknowledge grounding.
2. Feed the VLM the Test Image.
3. Compare and extract State and Semantic differences.

If no baseline is provided, it falls back to a single-turn structured evaluation using the text expectation and DOM grid.

### Ensemble Determinism
To prevent VLM hallucination or flakiness, Comm & Sense executes checks multiple times (e.g., $pass@3$) and uses majority voting to return a deterministic pass/fail result to the agent pipeline.

---

## 6. Feature Specification

### 6.1 Local Agent CLI & API
**Priority:** P0

Provide a dead-simple command-line interface and API that an AI agent can execute to check its work.

```javascript
import { agentCheck } from 'comm-sense';

const result = await agentCheck({
  baseline: './mockups/dashboard.png', // The developer's HTML mockup
  current: './.temp/agent-build.png',  // What the agent just built
  mode: 'semantic-structure',          // Ignore 1px shifts, focus on missing/wrong elements
  ensemble: 3                          // Run 3 times for determinism
});

if (!result.pass) {
  console.log(`AI Agent, please fix the following: ${result.feedback}`);
}
```

### 6.2 Hybrid Visual-DOM Ingestion
**Priority:** P1

To give the VLM exact coordinates and prevent hallucination, Comm & Sense ingests the Accessibility Tree or DOM bounding boxes *alongside* the screenshot. If the VLM flags that a "sidebar is missing," but the DOM tree clearly shows `<aside id="sidebar" visible="true">`, the tool overrides the visual hallucination, or uses the DOM data to generate absolutely precise bounding box annotations for the error.

### 6.3 Complex State & Interaction Evaluation (The "DeckForge" Use Case)
**Priority:** P1

The Agentic TDD workflow is uniquely suited to catch complex UI/UX bugs that traditional pixel diffs miss entirely. By leveraging the VLM alongside DOM inspection, Comm & Sense can evaluate:

**1. Z-Index and Rendering Overlaps:**
If a modal renders partially underneath existing UI elements (a classic z-index bug), the VLM can detect this visually. Because the VLM understands *what* a modal is, it recognizes when a background element inappropriately obscures the modal's content.
* *Agentic Flow:* The agent takes a screenshot. Comm & Sense flags `{ pass: false, issues: ["Modal is obscured by the underlying grid container"] }`. The agent inspects its CSS, increments the z-index, and retries.

**2. Focus Trapping and Input Bleed:**
Gamepad or keyboard input bleeding through a modal to the underlying UI is a "State" bug. Comm & Sense catches it through sequential evaluation:
* *Agentic Flow:* The developer's test suite instructs the browser to open the modal, takes a screenshot, and presses "Arrow Down". It passes two sequential screenshots to Comm & Sense.
* *Prompt:* "In image 1, the modal is open. After an 'Arrow Down' input (image 2), describe exactly what changed in the UI state. Did the modal's focus state change? Did the background UI change?"
* *Result:* The VLM identifies that the modal's internal cursor moved down, **BUT** it also notices the background grid changed its focus state simultaneously. It flags `{ pass: false, issues: ["Input bleed detected: Background UI focus state changed alongside the modal's focus state."] }`.

### 6.4 Auto-Generated Assertions
**Priority:** P2

If the developer provides an HTML mockup, Comm & Sense can inspect the mockup and auto-generate the natural language assertions (e.g., "Expect a sidebar on the left, a navigation bar on top..."). This bridges the expectation gap dynamically.

### 6.5 Configurable Determinism
**Priority:** P1

Mitigation strategies for non-determinism, configurable via the `determinism` option:
1. **Low temperature + structured output (default):** Use temperature 0.
2. **Self-consistency voting (Ensemble):** Run the same check N times (default: 3) and take the majority vote.
3. **Chain-of-thought reasoning:** Instruct the VLM to reason step-by-step before delivering a verdict.

---

## 7. API Reference (Draft)

```typescript
interface AgentCheckOptions {
  /** The baseline image to anchor the test against (HTML Mockup) */
  baseline: string | Buffer;
  
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
  model?: 'claude' | 'openai' | 'gemini' | 'local' | string;

  /** DOM enrichment options (only applicable when current is a Page) */
  dom?: {
    accessibilityTree?: boolean;
    boundingBoxes?: boolean;
  };
}

interface AgentCheckResult {
  pass: boolean;
  confidence: number;
  feedback: string;
  issues: VisualIssue[];
  annotatedScreenshot?: string;
}

interface VisualIssue {
  type: IssueType;
  severity: 'high' | 'medium' | 'low';
  description: string;
  region?: { x: number; y: number; width: number; height: number; source: 'dom' | 'estimated' };
}

declare function agentCheck(options: AgentCheckOptions): Promise<AgentCheckResult>;
```

---

## 8. System Architecture

```text
[ AI Coding Agent ] ──> calls ──> agentCheck()
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                       Context Gathering Layer                          │
│ 1. Capture Current Screenshot (Buffer based)                           │
│ 2. Extract DOM Metadata (Accessibility Tree, Bounding Boxes)           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                      Multi-Turn Inference Layer                        │
│ 1. Send Anchor/Baseline image to VLM  -> Requesting acknowledgement    │
│ 2. Receive Grounding ACK                                               │
│ 3. Send Test Image + DOM Metadata + Chain-of-Thought Prompt            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
┌────────────────────────────────────▼───────────────────────────────────┐
│                     Ensemble & Parsing Layer                           │
│ 1. If ensemble > 1, repeat Inference Layer (Parallel)                  │
│ 2. Calculate Majority Vote on visual bugs                              │
│ 3. Map semantic issues to DOM bounding boxes                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
               [ Structured JSON returned to AI Agent ]
```

---

## 9. Prompt Engineering Strategy

The prompt system is explicitly a **multi-turn chat** sequence to anchor the model on truth.

**Turn 1 (The Anchor):**
- **System:** "You are a senior UI quality assurance agent reviewing a developer's React implementation against their original HTML layout mockup."
- **User:** [Image: baseline.png] "Examine this original mockup. Memorize the semantic structure, the specific elements present, and the overall state intent. Confirm when you have understood the anchor."

**Turn 2 (The Test):**
- **User:** [Image: current.png] [JSON: DOM Accessibility Tree] "This is the agent's implementation. Describe step-by-step how the State and Semantic Structure differ from the anchor you memorized. Ignore minor 1-2px padding/font anti-aliasing differences. Focus on missing items, Z-index overlaps, or layout breaks. Output your final list of issues matching the requested JSON schema."

---

## 10. Error Taxonomy

| Type | Description |
|---|---|
| `state_break` | **(Primary Focus)** Elements in the wrong interactive state (missing, improperly focused, bleeding input). |
| `layout_break` | Page structure fundamentally broken (collapsed containers, overlapping grids). |
| `z_index_issue` | Incorrect stacking order of elements (modals underneath content). |
| `missing_element` | Expected element from the anchor is completely absent. |
| `text_overflow` | Text exceeding container boundaries dangerously. |
| `rendering_artifact` | Visual glitches or corruption. |

---

## 11. Plugin System

Plugins will extend Comm & Sense to evaluate against global design rules outside of the Mockup base.

- **Accessibility:** Ensure the final agent output meets contrast ratios, readable font sizes, and focus indicator standards directly from the image.
- **Brand System:** Allow the agent to verify that the colors they used match the imported Tailwind/CSS design token palette.

---

## 12. Performance Strategy

Performance optimizes for the inner dev loop of an autonomous agent:

- **Parallel Ensemble:** When $pass@3$ is enabled, all three inference branches are launched concurrently to minimize wait time for the agent.
- **Local Models:** Because developers don't want to burn OpenAI credits on hundreds of local iterations, robust support for `vLLM` or `Ollama` hosting local Vision models is a P0 requirement.

---

## 13. Distribution & Packaging

Published as `comm-sense`.
```bash
npm install -D comm-sense
```

---

## 14. Open Source & Licensing

The entire core library, CLI, and included plugins are **MIT-licensed**.
Adoption within agentic frameworks (Cursor, AutoGPT, Windsurf) relies on permissive licensing.

---

## 15. Monetization Strategy

**The "Host the Moat" Strategy**
A hosted proxy to OpenAI/Claude is trivially forkable. The moat is in orchestration, logging, and historical flakiness aggregation.

1. **Phase 1: Agent Adoption (Free).** Become the standard visual testing tool that AI engineering agents use locally.
2. **Phase 2: Comm & Sense Cloud.** Provide a centralized dashboard where teams can view the visual outputs their agents are generating in CI/CD. This provides historical analytics, cross-project benchmarking, and shared baseline management.
3. **Phase 3: Fine-tuned UI Models.** Use anonymized telemetry (from opt-in teams) pointing to thousands of "mockup vs. react code" comparisons to train a custom open-source-light VLM that executes the specific State validation faster and cheaper than GPT-5.2 or Claude 4.5. 

---

## 16. Roadmap

### v0.1 — Agentic MVP
- Core `agentCheck()` function optimized for multi-turn anchoring.
- Claude, OpenAI, and **Local Model (Ollama)** adapters.
- Basic Ensemble voting ($pass@k$).
- CLI testing tools.

### v0.2 — Hybrid DOM Integration
- Playwright/Puppeteer adapters to automatically extract DOM trees.
- Anchor visual VLM descriptions to exact DOM coordinates.
- Complex state testing helpers (input bleed simulations).

### v1.0 — IDE Integration
- Return visual bugs from Comm & Sense directly into the agent's IDE workspace (e.g., highlighting the specific React component that caused the Z-index bug).

---

## 17. Privacy & Data Handling

Screenshots of UIs frequently contain unreleased product designs.
- **Local-only mode:** The local model adapter (Ollama) is a P0 launch requirement specifically to serve privacy-sensitive users. 
- **No telemetry by default:** The open-source library ships with zero telemetry.
- **Data minimization:** When DOM enrichment is enabled, the tool redacts PII/sensitive text content from the prompt while preserving structural DOM node information.

---

## 18. Tech Stack Decision

### Why TypeScript / Node.js?
The core SDK is built in **TypeScript / Node.js** for the following reasons:
1. **Target Developer Ecosystem:** Comm & Sense evaluates UI components (React, Vue, HTML/CSS). The developers and AI agents building these UIs are almost exclusively working in the JS/TS ecosystem. Returning it as an `npm` package is critical for adoption.
2. **Playwright Native:** The DOM Context extraction layer requires seamless browser instrumentation. Playwright's native API is built in Node.js.
3. **Agent Integration:** Most popular agentic frameworks (like the MCP servers driving Claude/Cursor) are natively written in TypeScript. 

### Why not Python or Rust?
- **Python** is the undisputed king of AI inference. If Comm & Sense ever builds the Phase 3 "Custom UI VLM Model", that backend orchestration will be written in Python. However, forcing front-end React developers to manage `pip` environments just to run a visual test is a massive adoption hurdle.
- **Rust** would be blazing fast for image buffer math (like the proposed Smart Diff optimization gate). However, the primary execution bottleneck is the 2-5 second HTTP roundtrip to the VLM (Claude/GPT-4o). Writing the core request wrapper in Rust saves microseconds of execution time but sacrifices Playwright compatibility. 

*Future Optimization Path:* If the image processing becomes a true local bottleneck, the pixel-diff math will be rewritten in Rust, compiled to WebAssembly, and called instantaneously from the core TypeScript library.

---

## 19. Open Questions

1. **Local Model Viability:** Do current small, local Vision models (e.g., Molmo 7B, Pixtral 12B, Qwen3-VL) have sufficient reasoning to accurately catch state bugs without relying on Claude 4.6 Sonnet?
2. **Token Budgets:** Multi-turn architectures and extensive DOM trees are token-heavy. What is the optimal balance to prevent context window overflow, even with massive context models like Gemini 3 and Claude 4.6?
3. **Naming:** Does `comm-sense` conflict with npm packages? Is it available?
