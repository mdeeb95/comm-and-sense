# Comm & Sense VLM 🧠🖼️

The AI-native visual testing library for Agentic TDD. `comm-sense` goes beyond brittle pixel-perfect diffs by using Vision Language Models (VLMs) and DOM Accessibility Trees to catch semantic state bugs (clipping, state bleeding, layout breaks).

[![npm version](https://img.shields.io/npm/v/comm-sense-vlm.svg)](https://www.npmjs.com/package/comm-sense-vlm)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Getting Started

### Installation

```bash
npm install -D comm-sense-vlm playwright
```

### Environment Configuration

Comm & Sense supports a wide range of providers. You can configure them via environment variables or a `comm-sense.config.js` file.

| Provider | Environment Variable | Recommended Model |
| :--- | :--- | :--- |
| **OpenRouter** | `COMM_SENSE_OPENROUTER_API_KEY` | `qwen/qwen-vl-max` (Best value) |
| **Anthropic** | `COMM_SENSE_CLAUDE_API_KEY` | `claude-3-5-sonnet-latest` |
| **Google** | `COMM_SENSE_GEMINI_API_KEY` | `gemini-2.0-flash` |
| **Mistral** | `COMM_SENSE_MISTRAL_API_KEY` | `pixtral-12b-2409` |
| **OpenAI** | `COMM_SENSE_OPENAI_API_KEY` | `gpt-4o` |

#### Custom OpenAI-Compatible Endpoints (Groq, Together AI)
```bash
export COMM_SENSE_OPENAI_API_KEY="your-key"
export COMM_SENSE_OPENAI_BASE_URL="https://api.groq.com/openai/v1"
```

---

## 🛠️ Usage

### 🎭 Integration with Playwright / Vitest
Comm & Sense is designed to slot into your existing E2E suite. Because it natively accepts a Playwright `Page`, it handles the heavy lifting of screenshots and accessibility tree extraction.

```typescript
import { test, expect } from '@playwright/test';
import { agentCheck } from 'comm-sense';

test('DeckForge: Modal selection should not highlight background cards', async ({ page }) => {
  await page.goto('http://localhost:3000/deckforge');
  await page.click('text="Open Swap Modal"');
  
  const result = await agentCheck({
    current: page,
    expect: 'Ensure components outside the modal remain unselected.',
    mode: 'semantic-structure', // Uses auto-downscaling (50% token savings!)
    ensemble: { strategy: 'adaptive', threshold: 0.85 } // Stops after 1 run if certain
  });

  if (!result.pass) {
    console.error("Visual Bug Found:", result.feedback);
  }
  expect(result.pass).toBe(true);
});
```

### 🐛 Regression Testing
Stop bugs from haunting you. Pass a screenshot of the *broken* state and tell the agent to verify it's gone.

```typescript
const result = await agentCheck({
  baseline: 'e2e/baselines/known-bug.png',
  baselineRole: 'known-bad', 
  current: page,
  mode: 'regression'
});
```

### 🛡️ Region Masking
Ignore dynamic areas (clock, animations, user avatars) to prevent false positives:

```typescript
const result = await agentCheck({
  current: page,
  ignoreRegions: [{ x: 0, y: 0, width: 100, height: 100 }]
});
```

---

## 📊 Telemetry & Cost Optimization

Comm & Sense returns deep insights into your tests:
- **`latencyBreakdown`**: Time spent on capture vs. DOM vs. VLM inference.
- **`estimatedCostUsd`**: Real-time dollar estimation of the VLM API call.
- **`domContext`**: The raw accessibility tree data analyzed by the VLM.

### 💰 Cost Savers
1. **Auto-Downscaling**: In `semantic-structure` mode, images are automatically resized to 50% to save ~70% on input tokens.
2. **Adaptive Ensemble**: Instead of fixed `ensemble: 3`, use `adaptive`. It runs once and only escalates to more runs if the first result is ambiguous.

## 📄 License
MIT
