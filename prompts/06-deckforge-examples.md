# Agentic TDD Integration & E2E Validation (Prompt 6)

**Context:** The entire hook of `comm-sense` is its ability to catch "State" bugs like the **DeckForge** use cases (modal z-index overlapping and input state bleeding). We need to prove our system actually does this inside the repository via end-to-end tests.

**Task:** Create sample Agentic TDD test cases proving the tool catches structural bugs.

**Step-by-step Instructions:**
1. Create a `examples/deckforge/` folder.
2. Inside it, create two simple, distinct HTML files mimicking the bug:
   - `mockup.html`: The correct state (modal open, modal item selected, background untouched).
   - `buggy-build.html`: The broken state (modal open, modal item selected, BUT background items also change their visual selected state—input bleed).
3. Write a Vitest integration test `src/tests/agent-tdd.test.ts`:
   - Use Playwright to take screenshots (and extract DOM context) for both states.
   - Feed them into `agentCheck()` setting the mockup as the baseline.
   - Assert that `comm-sense` correctly flags the `pass: false` and identifies the background focus state change.
4. Write a similar HTML pair verifying the "Z-Index" overlap bug is caught correctly.

**Success Criteria:**
- The Vitest suite succeeds, empirically proving to developers that `comm-sense` catches exactly what traditional pixel-diffing fails at.
