import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { agentCheck } from './agent-check.js';
import { AgentCheckOptions } from '../types/index.js';
import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

// Mock the openrouter/local adapter payload responses to avoid live API hits in unit tests
const mockEvaluate = vi.fn();
vi.mock('../adapters/index.js', () => {
    return {
        createAdapter: vi.fn(() => ({
            name: 'mock-adapter',
            evaluate: mockEvaluate,
        })),
    };
});

describe('Core Engine: agentCheck', () => {
    const dummyImage = Buffer.from('fake-image-data').toString('base64');
    let testImagePath: string;

    beforeAll(() => {
        // Create a temporary physical file to test the file-loading logic
        testImagePath = path.join(process.cwd(), 'temp-test-img.png');
        fs.writeFileSync(testImagePath, 'fakedata');
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterAll(() => {
        if (fs.existsSync(testImagePath)) {
            fs.unlinkSync(testImagePath);
        }
    });

    it('correctly parses JSON and resolves ensemble=1', async () => {
        mockEvaluate.mockResolvedValueOnce({
            response: '```json\n{"pass": true, "confidence": 0.99, "feedback": "Looks good", "issues": []}\n```',
            latencyMs: 100
        });

        const result = await agentCheck({ current: testImagePath });

        expect(result.pass).toBe(true);
        expect(result.confidence).toBe(0.99);
        expect(mockEvaluate).toHaveBeenCalledTimes(1);

        // Verify it stripped the markdown blocks
        expect(result.feedback).toContain('Looks good');
    });

    it('correctly executes ensemble majority voting (pass@3)', async () => {
        // 2 passes, 1 fail
        mockEvaluate
            .mockResolvedValueOnce({ response: '{"pass": true, "confidence": 0.8, "feedback": "Pass 1"}' })
            .mockResolvedValueOnce({ response: '{"pass": false, "confidence": 0.5, "feedback": "Fail 1"}' })
            .mockResolvedValueOnce({ response: '{"pass": true, "confidence": 0.9, "feedback": "Pass 2"}' });

        const result = await agentCheck({ current: testImagePath, ensemble: 3 });

        // Majority vote says true
        expect(result.pass).toBe(true);
        // Highest confidence of the winning majority was 0.9
        expect(result.confidence).toBe(0.9);
        expect(result.feedback).toContain('[Ensemble 2/3 Pass]');
    });

    it('downscales the image when mode is semantic-structure', async () => {
        // Create a real valid 10x10 PNG using Jimp to ensure parsing doesn't throw
        const { Jimp } = await import('jimp');
        const img = new Jimp({ width: 10, height: 10, color: 0xFF0000FF });
        const validPng = await img.getBuffer('image/png');

        const imgPath = path.join(process.cwd(), 'temp-test-img-valid.png');
        fs.writeFileSync(imgPath, validPng);

        let capturedBuffer: Buffer | null = null;
        mockEvaluate.mockImplementationOnce(async (images: Buffer[], prompt: string) => {
            capturedBuffer = images[0];
            return { response: '{"pass": true, "confidence": 1.0}' };
        });

        await agentCheck({ current: imgPath, mode: 'semantic-structure' });

        expect(mockEvaluate).toHaveBeenCalledTimes(1);
        expect(capturedBuffer).not.toBeNull();

        // Ensure the buffer was modified (downscaled buffer should be different)
        expect(capturedBuffer!.length).not.toEqual(validPng.length);

        if (fs.existsSync(imgPath)) {
            fs.unlinkSync(imgPath);
        }
    });

    it('bypasses extra ensemble runs when strategy=adaptive and confidence is high', async () => {
        // High confidence on first try
        mockEvaluate.mockResolvedValueOnce({ response: '{"pass": true, "confidence": 0.99}' });

        await agentCheck({
            current: testImagePath,
            ensemble: { strategy: 'adaptive', threshold: 0.90, maxRuns: 5 }
        });

        // Should only be called 1 time despite maxRuns=5
        expect(mockEvaluate).toHaveBeenCalledTimes(1);
    });

    it('escalates to maxRuns when strategy=adaptive and confidence is low', async () => {
        // Low confidence on first try triggers remaining runs
        mockEvaluate
            .mockResolvedValueOnce({ response: '{"pass": true, "confidence": 0.50}' }) // Run 1
            .mockResolvedValueOnce({ response: '{"pass": false, "confidence": 0.90}' }) // Run 2
            .mockResolvedValueOnce({ response: '{"pass": false, "confidence": 0.95}' }); // Run 3

        const result = await agentCheck({
            current: testImagePath,
            ensemble: { strategy: 'adaptive', threshold: 0.90, maxRuns: 3 }
        });

        expect(mockEvaluate).toHaveBeenCalledTimes(3);
        expect(result.pass).toBe(false); // 2 false vs 1 true
    });
});

describe('Playwright Page Integration', () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    it('automatically triggers captureScreenshot and DOM extraction if passed a Playwright Page', async () => {
        await page.setContent('<button aria-label="Target">Click Me</button>');

        // Spy on the internal prompt builder argument array
        let promptCaptured = '';
        mockEvaluate.mockImplementationOnce(async (images, prompt) => {
            promptCaptured = prompt;
            return { response: '{"pass": true, "confidence": 1.0}' };
        });

        await agentCheck({ current: page, expect: 'Is there a button?' });

        // We expect the prompt to contain stringified JSON of the DOM Accessibility Tree
        expect(promptCaptured).toContain('button');
        expect(promptCaptured).toContain('Target'); // The aria-label extracted from the DOM wrapper
    });
});
