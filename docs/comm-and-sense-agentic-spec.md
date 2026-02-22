# Comm & Sense — Product Specification (V2: Agentic TDD Focus)

*Version 0.2 — February 22, 2026*
*Status: Draft — Shifted to Agentic Mockup-Driven Development*

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

**What it is:** A standalone visual evaluation library that allows AI agents and developers to semantically compare generated UI against a structural baseline (mockup) using Vision-Language Models (VLMs).

**What it is not:** A pixel-perfect CI/CD regression tool, an accessibility auditor, or a Playwright replacement. 

### Core Value Propositions
1. **Mockup-Driven Verification:** Compare complex framework implementations (React/Vue) against raw HTML mockups semantically, ignoring noise like 1px padding shifts or font-rendering artifacts.
2. **Agentic Self-Healing:** Returns structured JSON feedback (`{ pass: false, issues: ["Submit button is missing from the sidebar"] }`) that an AI coding assistant can read and act upon to fix its own code.
3. **Anchor-Based Accuracy:** Leverages the proven capability of VLMs to achieve near-100% accuracy when evaluating a test screenshot alongside a "known good" anchor image.
4. **State and Structural Focus:** Validates that the intended user journey (the state and elements) exists, rather than enforcing rigid pixel layouts.

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

## 4. Core Concepts

### The Visual Anchor (Baseline)
Unlike legacy tools where baselines are a byproduct of a passing test, in Comm & Sense, the baseline is the primary input. The anchor is the source of truth (the HTML mockup screenshot or design file) that grounds the VLM's understanding.

### Semantic State Comparison
The core operation is a `Regression Mode` comparison, heavily biased toward State and Structure. The VLM determines if the "Test Image" fundamentally fulfills the visual requirements defined by the "Anchor Image."

### Multi-Turn Context Anchoring
Under the hood, Comm & Sense does not use single-shot prompting. It uses a multi-turn inference strategy:
1. Feed the VLM the Anchor Image and task description. Acknowledge grounding.
2. Feed the VLM the Test Image.
3. Compare and extract State and Semantic differences.

### Ensemble Determinism
To prevent VLM hallucination or flakiness, Comm & Sense executes checks multiple times (e.g., $pass@3$) and uses majority voting to return a deterministic pass/fail result to the agent pipeline.

---

## 5. Feature Specification

### 5.1 Local Agent CLI & API
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

### 5.2 Hybrid Visual-DOM Ingestion
**Priority:** P1

To give the VLM exact coordinates and prevent hallucination, Comm & Sense ingests the Accessibility Tree or DOM bounding boxes alongside the screenshot. If the VLM flags that a "sidebar is missing," but the DOM tree clearly shows `<aside id="sidebar" visible="true">`, the tool overrides the visual hallucination.

### 5.3 Automated Assertion Generation
**Priority:** P2

If the developer provides an HTML mockup, Comm & Sense can inspect the mockup and auto-generate the natural language assertions (e.g., "Expect a sidebar on the left, a navigation bar on top..."). This bridges the expectation gap dynamically. 

### 5.4 Complex State & Interaction Evaluation (The "DeckForge" Use Case)

The Agentic TDD workflow is uniquely suited to catch complex UI/UX bugs that traditional pixel diffs miss entirely. By leveraging the VLM alongside Playwright/Puppeteer's DOM inspection, Comm & Sense can evaluate:

**1. Z-Index and Rendering Overlaps:**
If a modal renders partially underneath existing UI elements (a classic z-index bug), the VLM can detect this visually. Because the VLM understands *what* a modal is, it recognizes when a background element inappropriately obscures the modal's content or borders. 
* *Agentic Flow:* The agent takes a screenshot of the open modal. Comm & Sense flags `{ pass: false, issues: ["Modal is obscured by the underlying grid container"] }`. The agent inspects its CSS, increments the z-index, and retries until Comm & Sense returns a pass.

**2. Focus Trapping and Input Bleed:**
Gamepad or keyboard input bleeding through a modal to the underlying UI is a "State" bug, not a purely visual one, but Comm & Sense's architecture can catch it through sequential evaluation:
* *Agentic Flow:* The developer's test suite instructs the browser to open the modal, takes a screenshot, and presses "Arrow Down". It passes two sequential screenshots to Comm & Sense. 
* *Prompt:* "In image 1, the modal is open. After an 'Arrow Down' input (image 2), describe exactly what changed in the UI state. Did the modal's focus state change? Did the background UI change?"
* *Result:* The VLM identifies that the modal's internal cursor moved down, **BUT** it also notices the background grid/buttons changed their focus state simultaneously. It flags `{ pass: false, issues: ["Input bleed detected: Background UI focus state changed alongside the modal's focus state."] }`. This precision is possible because VLMs excel at identifying relative state changes between two anchor images.

---

## 6. Business Value & Roadmap

By pivoting to the **Visual TDD for AI Agents** market, Comm & Sense avoids directly competing with established enterprise QA suites (Applitools, Percy). Instead of being "another CI regression tool," it becomes a fundamental building block for the rapidly expanding AI developer ecosystem.

### Roadmap Shift
- **v0.1:** Release the core library with the multi-turn `agentCheck` feature, targeting local node execution by Cursor/Windsurf agents.
- **v0.2:** Introduce Hybrid Visual-DOM context parsing to drastically reduce VLM hallucination.
- **v1.0:** IDE Extensions that map Comm & Sense semantic errors directly as red squiggly lines on the rendered React components.
