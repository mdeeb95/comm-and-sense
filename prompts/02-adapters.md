# VLM Adapter Layer (Prompt 2)

**Context:** We are building the `comm-sense` visual oracle. We need adapters to talk to different Vision-Language Model providers (Claude, OpenAI, Local).

**Task:** Implement the VLM Adapter interface and the Anthropics/Claude provider.

**Step-by-step Instructions:**
1. Create `src/adapters/adapter.ts` with the `VLMAdapter` interface:
   - `name: string`
   - `evaluate(images: Buffer[], prompt: string, options: any): Promise<{ response: string; latencyMs: number }>`
     *(Note: we accept an array of images to support multi-turn baseline vs. test anchoring)*
2. Install `@anthropic-ai/sdk`.
3. Create `src/adapters/claude.ts` implementing `VLMAdapter`.
   - The adapter should map the `Buffer` array into the proper Anthropic `image/png` base64 blocks.
   - It should send the user's `prompt` cleanly alongside the images payload.
4. Implement a mock or dummy implementation `src/adapters/local.ts` which just logs the inputs and returns a static passing result (we'll implement real local Ollama later).
5. Add a simple factory `src/adapters/index.ts` to initialize the correct adapter based on the global `CommSenseConfig`.
6. Write Vitest tests mocking the Anthropic API to ensure our adapter properly constructs the HTTP payloads.

**Success Criteria:**
- We can instantiate a Claude adapter and call `.evaluate()` cleanly with two buffers.
- Error handling is robust (e.g., handles missing API keys).
