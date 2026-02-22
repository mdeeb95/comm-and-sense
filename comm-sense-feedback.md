# Comm-Sense: Improvement Feedback from Real-World Usage

**Source project:** DeckForge (Tauri + Svelte gamepad UI)
**Tests written:** 3 (smoke, z-index regression, input bleeding regression)
**Session date:** 2026-02-22

---

## 1. Baseline-as-Known-Bug Should Be a First-Class Mode

### The pattern we used
We passed a screenshot of a *known bug* as the baseline and told the VLM "Image 1 is a KNOWN BUG — verify Image 2 doesn't have it." This inverts the normal baseline relationship (baseline = good, current = test). It worked, but the prompt engineering was entirely on us.

### Suggestion
Add a `baselineRole` option:

```typescript
agentCheck({
  baseline: 'e2e/baselines/settings-clipping-bug.png',
  baselineRole: 'known-bad',  // NEW — tells VLM this is a bug to check AGAINST
  current: page,
  expect: 'Settings modal should not clip under the action palette',
})
```

When `baselineRole: 'known-bad'`, the system prompt would flip: "Image 1 shows a known defect. Verify Image 2 does NOT exhibit this same defect. Pass means the bug is fixed."

This removes the need for users to embed VLM prompt engineering in their `expect` strings.

---

## 2. Buffer Baseline Needs Documentation / Better DX

### What happened
Test 3 captures a Playwright screenshot as a `Buffer` before opening a modal, then uses it as the baseline after closing the modal:

```typescript
const beforeModal = await page.screenshot();  // Returns Buffer
// ... do stuff ...
const result = await agentCheck({
  baseline: beforeModal,  // Buffer works — but only because we read the source
  current: page,
});
```

This "before/after snapshot" pattern is extremely useful for state mutation tests but it's not obvious from the API that `baseline` accepts Buffer. The type signature shows `string | Buffer | Page` but there's no example of this pattern.

### Suggestion
- Add a "before/after comparison" recipe to docs
- Consider a convenience helper:

```typescript
const checkpoint = await commSense.checkpoint(page);  // captures screenshot + DOM
// ... user interactions ...
const result = await checkpoint.compareTo(page, {
  expect: 'Same card should be selected',
});
```

This bundles the pattern into a single readable flow.

---

## 3. False Pass on Expanded Content (Baseline Drift)

### What happened
When we reintroduced the z-index bug by raising the palette's z-index (first attempt, which didn't visually reproduce the bug), the VLM returned `pass: false` — but for the wrong reason. It flagged that the settings modal now has more options than the baseline screenshot:

```json
{
  "type": "layout_break",
  "severity": "medium",
  "description": "The settings modal in Image 2 contains additional sections ('Stick Scroll Speed', 'Telemetry & Cost', 'Advanced') not present in the original anchor image"
}
```

The baseline was from a week ago. The settings screen has since gained new rows. The VLM correctly noticed this but conflated "UI evolved since baseline" with "something is wrong."

### Suggestion
Add an `ignoreBaseDrift` or `focusArea` option:

```typescript
agentCheck({
  baseline: 'old-screenshot.png',
  current: page,
  expect: 'Modal should render above the action palette',
  focus: 'z-index and layering only',  // NEW — scopes what the VLM checks
})
```

Or allow region-based masking:

```typescript
agentCheck({
  baseline: 'old-screenshot.png',
  current: page,
  ignoreRegions: [{ x: 200, y: 400, width: 400, height: 300 }],  // mask the modal content
  expect: 'Modal frame should render above the action palette',
})
```

This is important for long-lived baselines in actively developed projects.

---

## 4. Issue Classification Is Good — But Needs `input_bleed` Type

### What happened
The VLM classified the d-pad bleeding bug as `state_break`, which is technically correct but doesn't capture the *root cause*. A developer seeing `state_break` might investigate state management code. The real bug was in input routing.

### Suggestion
Add `input_bleed` or `interaction_leak` to the `IssueType` enum:

```typescript
type IssueType =
  | 'state_break'
  | 'layout_break'
  | 'z_index_issue'
  | 'missing_element'
  | 'text_overflow'
  | 'rendering_artifact'
  | 'input_bleed'        // NEW — state changed due to input reaching wrong target
  | 'focus_trap_escape'  // NEW — focus left a modal/dialog unexpectedly
```

The VLM can infer this from context — in our test, the `expect` string explicitly mentioned "input bled through a modal." The VLM could map that to `input_bleed` if the type existed.

---

## 5. Ensemble at 1 Is Fine for Dev — But Needs Guidance

### What happened
We ran all tests with `ensemble: 1` for speed. Every result was correct. But there's no guidance on when to use higher ensemble values.

### Suggestion
Add heuristic recommendations to docs:

| Context | Recommended Ensemble | Why |
|---------|---------------------|-----|
| Local dev / TDD loop | 1 | Speed matters, human reviews failures |
| CI blocking check | 3 | Reduces false positives that block merges |
| Nightly regression suite | 5 | Maximum confidence for comprehensive runs |
| Flaky test investigation | 5+ | Understand VLM disagreement patterns |

Also consider returning ensemble vote breakdown even at `ensemble: 1`:

```json
{
  "ensemble": { "total": 1, "pass": 1, "fail": 0 },
  "pass": true
}
```

---

## 6. Latency Breakdown Would Help Optimization

### What happened
Tests took 6–12 seconds each. We don't know how that breaks down between:
- Screenshot capture
- DOM extraction
- VLM API call
- Response parsing

### Suggestion
Return a latency breakdown in the result:

```json
{
  "latencyMs": 11400,
  "latencyBreakdown": {
    "capture": 200,
    "domExtraction": 150,
    "vlmInference": 10800,
    "parsing": 250
  }
}
```

This helps users know if they should optimize their test setup (faster page load) or their VLM choice (switch provider).

---

## 7. `mode: 'regression'` — Dedicated Mode for Bug Tests

### What happened
We used `semantic-structure` for everything, but our regression tests have a fundamentally different goal than layout checks. We don't care about padding or font rendering — we care "is this specific bug present or not?"

### Suggestion
Add a `regression` mode:

```typescript
agentCheck({
  baseline: 'known-bug.png',
  current: page,
  mode: 'regression',
  expect: 'The settings modal was clipping under the palette. Verify this is fixed.',
})
```

The regression prompt would:
- Instruct the VLM to identify the defect in the baseline
- Check ONLY whether that specific defect is present in the current image
- Ignore all other differences (new content, color tweaks, layout evolution)
- Return `pass: true` if the specific bug is absent

This combines the `baselineRole: 'known-bad'` idea (suggestion #1) with scoped evaluation (suggestion #3) into a single ergonomic mode.

---

## 8. DOM Context Was Silently Powerful — Expose It

### What happened
When `current` is a Playwright Page, comm-sense auto-extracts DOM context (accessibility tree + bounding boxes) and sends it alongside the screenshot. The VLM responses referenced DOM data directly:

> "The DOM data confirms the presence of all elements in their expected positions"
> "The DOM structure confirms the modal's bounding box is intact"

This made the VLM significantly more accurate, but the user has no visibility into what DOM context was sent.

### Suggestion
Include the extracted DOM context in the result:

```json
{
  "pass": true,
  "domContext": {
    "nodeCount": 87,
    "truncated": false,
    "tree": [...]  // optional, behind a verbose flag
  }
}
```

Also allow users to inspect/override what's sent:

```typescript
const dom = await extractDomContext(page);
// filter or augment...
agentCheck({
  current: page,
  domOverride: dom,  // use this instead of auto-extraction
})
```

---

## 9. Better Error Messages When Baseline File Missing

### Not encountered directly, but relevant
If the baseline file path doesn't exist, what happens? Based on the source, it calls `fs.existsSync()`. If the file doesn't exist, is the error clear? During our session, we had trouble with macOS Unicode non-breaking spaces in screenshot filenames. A path that *looks* correct in the terminal would fail silently.

### Suggestion
When baseline is a string path that doesn't exist:
- Throw with the exact path attempted
- List nearby files in the same directory (fuzzy match)
- Warn about common filename issues (Unicode spaces, encoding)

```
CommSenseError: Baseline file not found: e2e/baselines/settings-bug.png
  Did you mean: e2e/baselines/settings-clipping-bug.png ?
  Directory contains: settings-clipping-bug.png, settings-open.png
```

---

## 10. `expect` String Templates for Common Patterns

### What happened
We wrote fairly long `expect` strings with embedded VLM prompt engineering:

```typescript
expect: 'Image 1 is a KNOWN BUG where the settings modal clips underneath the right-side action palette. Image 2 is the current build. Verify that in Image 2 the settings modal is fully visible, renders ABOVE all background content including the right-side panel, and has no clipping or overlap from other UI elements.'
```

This works but it's fragile — users are essentially writing VLM prompts without knowing what system prompt wraps them.

### Suggestion
Provide composable expectation helpers:

```typescript
import { expects } from 'comm-and-sense';

agentCheck({
  baseline: bugScreenshot,
  current: page,
  expect: expects.bugRegression('settings modal clips under the action palette'),
  // Expands to a well-tested prompt template internally
})

// Other templates:
expects.noOverflow()
expects.modalAboveContent()
expects.sameSelectionState('Feature card with cyan glow')
expects.accessibleContrast({ wcagLevel: 'AA' })
```

This gives users the reliability of tested prompts while keeping the API declarative.

---

## Summary — Priority Ranking

| # | Suggestion | Impact | Effort |
|---|-----------|--------|--------|
| 7 | `mode: 'regression'` | High | Medium |
| 1 | `baselineRole: 'known-bad'` | High | Low |
| 3 | `focus` / `ignoreRegions` for baseline drift | High | Medium |
| 10 | `expects.*` prompt templates | High | Medium |
| 2 | Checkpoint / before-after helper | Medium | Low |
| 8 | Expose DOM context in results | Medium | Low |
| 6 | Latency breakdown | Medium | Low |
| 4 | `input_bleed` issue type | Low | Low |
| 5 | Ensemble guidance + vote breakdown | Low | Low |
| 9 | Better missing-file errors | Low | Low |
