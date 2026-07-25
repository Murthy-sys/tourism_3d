# Followers Count Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Social Media Performance card and its tests consistently use the approved Followers display value `546+`.

**Architecture:** Preserve the existing metric model: `value` remains the number `546`, `suffix` remains `+`, and `display` remains `546+`. Reconcile only the stale test expectations with that canonical data and leave the other uncommitted social-profile changes untouched.

**Tech Stack:** React 18, Vitest 2, Testing Library, JavaScript.

## Global Constraints

- The Followers card must display `546+`.
- Keep the canonical metric value numeric (`546`) and retain `+` as the metric suffix.
- Preserve all other in-progress social-profile and engagement changes in the working tree.

---

### Task 1: Reconcile Followers Expectations

**Files:**
- Modify: `src/journey/chapters.test.js:26-36`
- Modify: `src/components/SocialMediaPerformance.test.jsx:57-62`
- Verify only: `src/journey/chapters.js:86-89`

**Interfaces:**
- Consumes: `SOCIAL_MEDIA_METRICS`, an array of metric objects with numeric `value`, string `suffix`, and string `display` fields.
- Produces: Regression coverage proving the canonical follower object uses `value: 546`, `suffix: '+'`, and `display: '546+'`, and that reduced-motion rendering visibly outputs `546+`.

- [ ] **Step 1: Run the existing focused tests to verify the stale expectations fail**

Run:

```bash
npm test -- src/journey/chapters.test.js src/components/SocialMediaPerformance.test.jsx
```

Expected: FAIL because the journey-data test expects `545`/`545+` while the canonical metric is `546`/`546+`, and because the reduced-motion component test looks for `546` instead of `546+`.

- [ ] **Step 2: Correct the journey-data expectation**

In `src/journey/chapters.test.js`, make the Followers object:

```js
{
  id:'followers',
  label:'Followers',
  value:546,
  kind:'compact',
  suffix:'+',
  display:'546+',
},
```

- [ ] **Step 3: Correct the reduced-motion rendering expectation**

In `src/components/SocialMediaPerformance.test.jsx`, make the reduced-motion test:

```jsx
it('renders final visual values immediately for reduced motion',()=>{
  render(<SocialMediaPerformance progress={.88} reducedMotion/>)
  expect(screen.getByText('546+')).toBeInTheDocument()
  expect(screen.getAllByText('Updating soon')).toHaveLength(5)
})
```

The count is five because every metric other than Followers is currently pending in the in-progress data.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run:

```bash
npm test -- src/journey/chapters.test.js src/components/SocialMediaPerformance.test.jsx
```

Expected: both test files PASS with no failed assertions.

- [ ] **Step 5: Run the complete automated test suite**

Run:

```bash
npm test
```

Expected: all test files PASS.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git diff --check
git diff -- src/journey/chapters.test.js src/components/SocialMediaPerformance.test.jsx
```

Expected: no whitespace errors; the only follower-specific changes replace stale `545`/`545+` and `546` expectations with `546`/`546+`. Other pre-existing uncommitted edits remain intact.
