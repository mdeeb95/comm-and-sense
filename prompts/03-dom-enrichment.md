# DOM Enrichment & Context Capture (Prompt 3)

**Context:** The major differentiator for `comm-sense` is its "Hybrid Visual-DOM Architecture." We cannot let the VLM hallucinate.

**Task:** Build utility functions to wrap Playwright and extract Accessibility Trees and Bounding Boxes.

**Step-by-step Instructions:**
1. Install `playwright` as a peer/dev dependency.
2. Create `src/capture/dom.ts`.
3. Export an async function `extractDomContext(page: Page)`.
   - Run a `page.evaluate()` script inside the browser context to traverse the DOM tree.
   - Extract the standard accessibility roles (button, link, heading), `aria-label`, visible text, and the absolute bounding box (`getBoundingClientRect`) of each node.
   - Filter out invisible elements or deeply nested irrelevant `div` wrappers to save token space.
   - Return this data mapped into a clean, minimal JSON object.
4. Export a function `captureScreenshot(page: Page, path?: string)` that handles taking a full-page png buffer.
5. Write integration tests using `playwright` where you load a simple local HTML file, run `extractDomContext`, and assert that the bounding boxes match expected values.

**Success Criteria:**
- The extraction algorithm gracefully ignores empty `<divs>` and returns a clean, token-efficient representation of the semantic layout.
