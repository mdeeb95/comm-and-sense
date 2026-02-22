# Core Engine: agentCheck & Multi-Turn Prompting (Prompt 4)

**Context:** Now we assemble `comm-sense`. The core functionality is `agentCheck()`.

**Task:** Combine the VLM Layer, Prompt Layer, and DOM Context into the final unified evaluation engine.

**Step-by-step Instructions:**
1. Create `src/prompt/builder.ts` implementing the context strategy:
   - Construct a system prompt forcing the VLM to return strict JSON matching `AgentCheckResult`.
   - Construct a user prompt that injects the JSON text of the DOM Context (if available).
   - If a baseline is provided, implement the "Multi-Turn Anchoring Strategy" (ACK the baseline, then evaluate the test image).
   - If NO baseline is provided, inject the user's `expect` string and run a single-turn evaluation on just the test image.
2. Create `src/core/agent-check.ts` and implement the `agentCheck(options)` exported function:
   - If inputs are Playwright Pages, call `extractDomContext` and capture screenshots.
   - If inputs are file paths or Buffers, load them.
   - Instantiate the appropriate `VLMAdapter`.
   - If `options.ensemble` > 1 (multi-shot), use `Promise.all` to launch $N$ concurrent instances of `.evaluate()`. 
   - Write a helper `src/core/ensemble.ts` that takes the $N$ JSON outputs and determines the majority consensus using a simple voting logic on the `pass` boolean.
3. If an issue is flagged, search the returned `issues.region` mapping, and if DOM context was provided, attempt to match the VLM's string mention of the element back to the exact DOM bounding box to avoid hallucinated coordinates.
4. Export `agentCheck` from `src/index.ts`.
5. Write an end-to-end integration test against a local mock vLLM/Claude endpoint.

**Success Criteria:**
- `agentCheck()` flawlessly executes the TDD validation loop, gracefully handling Playwright inputs and returning structured error feedback.
- Ensemble voting successfully ignores an outlier/flaky model hallucination if $pass@3$ is invoked.
