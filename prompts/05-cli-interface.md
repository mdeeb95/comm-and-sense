# CLI Tool & Global Configuration (Prompt 5)

**Context:** The core `agentCheck()` SDK is operational. Now we need to expose this as a standalone executable CLI so developers can run checks straight from their terminal, and AI agents can execute it directly via `npx` or a script execution tool.

**Task:** Build the CLI interface and the `comm-sense.config.ts` resolution.

**Step-by-step Instructions:**
1. Install `commander` (or similar lightweight argument parser) and `chalk` (for colored terminal output).
2. Create `src/config-loader.ts` to locate and parse a `comm-sense.config.ts` (or JSON/JS variant) from the user's project root, merging it with default values and environment variables.
3. Create `src/cli/index.ts` declaring the binary entry point.
4. Implement a simple `check` command:
   ```bash
   comm-sense check ./mockup.png ./test-build.png --mode semantic-structure --ensemble 3
   ```
5. If the VLM flags issues, print them out elegantly to the terminal. Make sure to clearly dump the JSON format as well if a `--json` flag is provided (since AI agents prefer reading JSON).
6. Ensure `package.json` maps `"bin": { "comm-sense": "./dist/cli/index.js" }`.

**Success Criteria:**
- You can compile the project and run `node dist/cli/index.js check ...` and see a beautiful (or JSON-formatted) response.
