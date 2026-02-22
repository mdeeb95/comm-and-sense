# System Setup & Core Types (Prompt 1)

**Context:** You are building `comm-sense`, a VLM-powered visual oracle for Agentic TDD. You will be using TypeScript, Node.js, and Vitest.

**Task:** Initialize the project and build out the core types and configuration layer.

**Step-by-step Instructions:**
1. Initialize a new Node.js project (if empty) with `npm init -y` and install `typescript`, `@types/node`, `tsx`, and `vitest` as dev dependencies.
2. Configure `tsconfig.json` for Node 18+ strict TS compilation targeting ES modules.
3. Create `src/types/index.ts` and define the core interfaces from the product spec. Specifically, define:
   - `AgentCheckOptions` (baseline `optional`, current, mode, expect, determinism, ensemble, model, dom context config)
   - `AgentCheckResult` (pass, confidence, feedback, issues)
   - `VisualIssue` (type, severity, description, region coordinates)
   - `CommSenseConfig` (global configuration interface)
4. Create `src/config.ts` to export a default configuration, and allow merging user-provided config options via environment variables (e.g., `COMM_SENSE_PROVIDER`, `COMM_SENSE_CLAUDE_API_KEY`).
5. Create a basic Vitest test file `src/config.test.ts` to ensure config merging works properly.
6. Export the types and config from `src/index.ts`.

**Success Criteria:**
- `npm run test` strictly passes.
- Types elegantly represent the "State & Structure Component" workflow.
- No actual VLM logic yet, just solid foundation.
