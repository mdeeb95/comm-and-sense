import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { extractDomContext, captureScreenshot } from './dom.js';
import path from 'path';

describe('DOM Capture & Enrichment', () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    it('correctly extracts meaningful semantic elements and ignores wrapper divs', async () => {
        await page.setContent(`
      <style>
        body { margin: 0; padding: 20px; }
        .wrapper { padding: 10px; } /* meaningful bounds but semantically useless */
        .hidden { display: none; }
      </style>
      <div class="wrapper">
        <h1>Hello World</h1>
        <div class="hidden">Invisible text</div>
        <div>
          <button aria-label="Submit button">Click Me</button>
        </div>
      </div>
    `);

        const domContext = await extractDomContext(page);

        // We expect the array to contain ONLY the h1 and the button (flattened through the wrapper divs)
        expect(domContext).toHaveLength(2);

        // Check H1
        expect(domContext[0].tagName).toBe('h1');
        expect(domContext[0].text).toBe('Hello World');
        expect(domContext[0].bounds.width).toBeGreaterThan(0);

        // Check Button
        expect(domContext[1].tagName).toBe('button');
        expect(domContext[1].text).toBe('Click Me');
        expect(domContext[1].ariaLabel).toBe('Submit button');
    });

    it('handles screenshot buffering seamlessly', async () => {
        await page.setContent('<h1>Snapshot Test</h1>');
        const buffer = await captureScreenshot(page);
        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(0);
    });
});
