import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import { agentCheck } from '../core/agent-check.js';

// LIVE INTEGRATION TEST
// Require either CLAUDE, OPENAI, or OPENROUTER to be configured in .env to run this e2e validation correctly
const hasApiKey =
    !!process.env.COMM_SENSE_OPENROUTER_API_KEY ||
    !!process.env.COMM_SENSE_CLAUDE_API_KEY ||
    !!process.env.COMM_SENSE_OPENAI_API_KEY;

describe.runIf(hasApiKey)('E2E Agent TDD: DeckForge State Bugs', () => {
    let browser: Browser;
    let mockupPage: Page;
    let buggyPage: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });

        // Load local HTML files
        const basePath = path.join(process.cwd(), 'examples', 'deckforge');

        // 1. Load Baseline Mockup
        mockupPage = await browser.newPage();
        await mockupPage.goto(`file://${path.join(basePath, 'mockup.html')}`);
        // Wait for render
        await mockupPage.waitForSelector('h1');

        // 2. Load Buggy Output
        buggyPage = await browser.newPage();
        await buggyPage.goto(`file://${path.join(basePath, 'buggy-build.html')}`);
        await buggyPage.waitForSelector('h1');
    });

    afterAll(async () => {
        await browser.close();
    });

    it('catches state bleeding (background items highlighting incorrectly)', async () => {
        console.log("Running E2E visual validation against live API...");
        // By passing 'buggyPage' to current, it automatically extracts DOM bounding boxes
        // By passing 'mockupPage' to baseline, it automatically takes a screenshot to anchor the VLM 
        const result = await agentCheck({
            baseline: mockupPage,
            current: buggyPage,
            mode: 'strict-layout',
            ensemble: 1, // Keep to 1 for test speed, bump to 3 in prod
            model: 'openrouter', // Force openrouter since that is the key we know we have
            expect: 'Ensure the background cards behind the modal overlay exactly match the mockup state.'
        });

        console.log("VLM Feedback:", result.feedback);

        // Assert that the VLM logic correctly flags the state anomaly
        expect(result.pass).toBe(false);
        expect(result.issues).toBeDefined();

        // Expect the VLM to complain about a state or layout issue
        const hasBugIssue = result.issues.some(issue =>
            issue.type === 'state_break' ||
            issue.type === 'layout_break' ||
            issue.description.toLowerCase().includes('card') ||
            issue.description.toLowerCase().includes('red') ||
            issue.description.toLowerCase().includes('selected')
        );

        expect(hasBugIssue).toBe(true);
    }, 45000); // Massive 45s timeout because VLMs can be heavily queued
});
