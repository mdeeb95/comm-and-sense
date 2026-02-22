# Comm & Sense — Agent Instructions

This document serves as the persistent memory and operational rulebook for any AI Agent working on the `comm-sense` repository. 

**Read and strictly adhere to these instructions before making any structural changes, writing new files, or submitting code.**

---

## 1. Project Goal & Positioning
* **The Mission:** Build a VLM-powered "Visual Oracle" that enables AI coding agents to visually debug their own UI outputs against a developer-provided HTML Mockup.
* **Core Philosophy:** "Semantic State" (missing elements, wrong active state, z-index overlaps) matters far more than "Pixel Perfection" (1px padding shifts, font anti-aliasing).
* **The Stack:** Target `NodeNext` ESM TypeScript execution. The tool must be an easily installable `npm` package.

## 2. Testing Mandate (Strict TDD)
You are explicitly barred from claiming a feature is complete until it has a corresponding programmatic test verifying its functionality. 

* **Framework:** We use **Vitest**.
* **Test Isolation:** Integration tests (like the VLM Adapters or DOM extractors) must mock external API calls or network requests unless an explicit end-to-end integration suite is being run.
* **Execution:** After every logical step, you MUST run `npm run test` or `npm run type-check`.
* **Fixing Errors:** If tests fail or TypeScript throws compile errors, you must stop, investigate the terminal output, and fix the errors immediately before proceeding.
* **No Script Poop:** It is okay to create quick, standalone scripts in a `scripts/` directory to rapidly verify external API integrations or complex logic. However, you MUST convert them into repeatable `vitest` e2e or integration tests and delete the original script before moving on. Do not leave unmaintained verification scripts scattered around.

## 3. Code Quality Standards
* **Type Safety:** Use strict TypeScript definitions. Do not use `any`. Rely heavily on the interfaces defined in `src/types/index.ts`.
* **Token Economy:** When extracting DOM data (like bounding boxes or accessibility trees) via Playwright, strictly filter out invisible nodes or irrelevant wrapper `div`s. We cannot waste LLM context window tokens on useless markup.
* **Error Handling:** VLM calls are incredibly prone to network issues, rate limits, and JSON hallucination. Wrap API calls in robust `try/catch` logic and handle parsing errors gracefully instead of crashing the process.

## 4. Operational Workflow
When a developer gives you a prompt/epic from the `/prompts/` directory:
1. Parse the epic.
2. Outline the exact components you will modify.
3. Write the Vitest files first (Test Driven Development).
4. Implement the logic.
5. Loop `npm run test` and `npm run type-check` until green.
6. Commit the code using `git commit -m "feat/fix: descriptive message"`.

---

*Remember: This project is meant to be a fundamental building block for the autonomous coding movement. Your code must be resilient and highly predictable.*
