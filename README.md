# Comm & Sense

The AI-native visual testing library for Agentic TDD. `comm-sense` goes beyond brittle pixel-perfect diffs by using Vision Language Models (VLMs) and DOM Accessibility Trees to catch semantic state bugs.

## Installation

```bash
npm install -D comm-sense playwright
```

You must also provide an API key for your preferred VLM by either setting an environment variable or creating a `comm-sense.config.js` file:
```bash
export COMM_SENSE_OPENROUTER_API_KEY="sk-or-v1-..."
# OR
export COMM_SENSE_CLAUDE_API_KEY="sk-ant-..."
# OR
export COMM_SENSE_GEMINI_API_KEY="AIza..."
# OR
export COMM_SENSE_MISTRAL_API_KEY="..."
```

### Bring Your Own Provider (Together AI, Groq, SiliconFlow)
If your provider offers an OpenAI-compatible endpoint, you can use the standard OpenAI adapter by simply supplying the custom `baseURL`:
```bash
export COMM_SENSE_OPENAI_API_KEY="your-custom-api-key"
export COMM_SENSE_OPENAI_BASE_URL="https://api.together.xyz/v1"
```

## 🛠️ Integration with Test Suites (e.g., Playwright / Vitest)
You can directly integrate the `agentCheck()` core engine into your existing end-to-end tests. Because `comm-sense` natively accepts a Playwright `Page` object, it automatically handles screenshotting and DOM extraction for you.

Here is an example testing the complex "State bleeding" bug in a mock DeckForge component:

```typescript
import { test, expect } from '@playwright/test';
import { agentCheck } from 'comm-sense';

test('DeckForge: Modal selection should not highlight background cards', async ({ page }) => {
  // 1. Arrange: Navigate to your locally hosted component / Storybook
  await page.goto('http://localhost:3000/deckforge');
  
  // 2. Act: Trigger the complex state
  await page.click('text="Open Swap Modal"');
  await page.click('text="Fire Blast"'); // This should highlight the modal item, but NOT the background cards
  
  // 3. Assert (Wait for visual rendering to settle)
  await page.waitForSelector('.modal-item.selected');

  // 4. Agentic Validation: Pass the Playwright page directly to Comm & Sense
  const result = await agentCheck({
    current: page,
    expect: 'Ensure that only the item inside the modal is highlighted/selected. The background cards outside the modal must remain completely unselected and plain.',
    mode: 'semantic-structure',
    ensemble: 1 // Bump to 3 for production stability to prevent hallucination
  });

  // 5. Fail the test if the Agent finds a state bug
  if (!result.pass) {
    console.error("VLM Bug Found:", result.feedback);
    console.error(result.issues);
  }

  expect(result.pass).toBe(true);
});
```

### 🐛 Regression Testing (Known-Bad Baselines)
If you want to ensure a specific bug never returns, you can pass a screenshot of the *broken* state as your baseline and tell Comm & Sense to verify it is gone:

```typescript
const result = await agentCheck({
  baseline: 'e2e/baselines/settings-clipping-bug.png',
  baselineRole: 'known-bad', // Inverts the prompt: "Make sure Image 2 does NOT look like Image 1"
  current: page,
  mode: 'regression',        // Forces the VLM to ignore all other UI changes/drift
  expect: 'The settings modal should open completely above the background palette without clipping.'
});
```

### 🛡️ Handling Baseline Drift (Region Masking)
When your UIs evolve but your baseline screenshots are old, the VLM might flag new valid features as "layout breaks." You can mask out dynamic or evolving regions to prevent false positives:

```typescript
const result = await agentCheck({
  baseline: 'e2e/baselines/old-dashboard.png',
  current: page,
  ignoreRegions: [{ x: 200, y: 400, width: 400, height: 300 }], // The VLM will go blind in this box
  expect: 'Ensure the primary navigation bar is intact.'
});
```

## CLI
You can also run ad-hoc checks directly from your terminal or CI/CD pipelines:
```bash
npx comm-sense check build-output.png --expect "Is the submit button green?"
```
