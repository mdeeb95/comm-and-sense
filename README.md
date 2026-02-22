# Comm & Sense

The AI-native visual testing library for Agentic TDD. `comm-sense` goes beyond brittle pixel-perfect diffs by using Vision Language Models (VLMs) and DOM Accessibility Trees to catch semantic state bugs.

## Installation

\`\`\`bash
npm install -D comm-sense playwright
\`\`\`

You must also provide an API key for your preferred VLM by either setting an environment variable or creating a `comm-sense.config.js` file:
\`\`\`bash
export COMM_SENSE_OPENROUTER_API_KEY="sk-or-v1-..."
# OR
export COMM_SENSE_CLAUDE_API_KEY="sk-ant-..."
\`\`\`

## 🛠️ Integration with Test Suites (e.g., Playwright / Vitest)
You can directly integrate the `agentCheck()` core engine into your existing end-to-end tests. Because `comm-sense` natively accepts a Playwright `Page` object, it automatically handles screenshotting and DOM extraction for you.

Here is an example testing the complex "State bleeding" bug in a mock DeckForge component:

\`\`\`typescript
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
\`\`\`

## CLI
You can also run ad-hoc checks directly from your terminal or CI/CD pipelines:
\`\`\`bash
npx comm-sense check build-output.png --expect "Is the submit button green?"
\`\`\`
