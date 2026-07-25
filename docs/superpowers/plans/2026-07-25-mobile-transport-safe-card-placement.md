# Mobile Transport-Safe Card Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep mobile cards fully visible while ensuring the active trekkers, boat, and jeep remain unobstructed.

**Architecture:** Derive a deterministic `top` or `bottom` safe-zone placement from the existing chapter layout and journey progress, then expose it as a modifier class on the rendered card. Mobile-only CSS maps that class to bounded viewport positions; no Three.js projection, DOM measurement loop, or desktop layout change is introduced.

**Tech Stack:** React 18, JavaScript, CSS media queries, Vitest, Testing Library, Playwright visual QA

## Global Constraints

- Keep the complete active trekkers, boat, or jeep visible.
- Keep every card fully readable inside the mobile viewport.
- Cards may cover sky, water, distant terrain, trees, or other low-priority scenery.
- Cards must not shrink, collapse, or hide content to create clearance.
- Keep menu, chapter counter, and scroll indicator unobstructed.
- Do not change camera routes, Three.js world construction, desktop placement, card copy, typography, or transparency.
- Do not add per-frame DOM measurements or 3D-to-DOM projection.

---

### Task 1: Deterministic Card Safe-Zone Assignment

**Files:**
- Modify: `src/components/ChapterContent.jsx`
- Test: `src/components/ChapterContent.test.jsx`

**Interfaces:**
- Consumes: `chapter.layout: string` and normalized `progress: number`.
- Produces: `getMobileCardPlacement(layout, progress): 'top' | 'bottom' | null` and modifier classes `chapter--mobile-safe-top` or `chapter--mobile-safe-bottom`.

- [ ] **Step 1: Write failing placement tests**

Add table-driven tests that render representative trekker, boat, jeep, and contact states:

```jsx
it.each([
  ['operations', .18, 'chapter--mobile-safe-top'],
  ['monument-plans', .5, 'chapter--mobile-safe-top'],
  ['monument-plans', .9, 'chapter--mobile-safe-bottom'],
  ['pavilion-contact', .97, 'chapter--mobile-safe-bottom'],
])('assigns %s at %s to %s', (layout, progress, expectedClass) => {
  render(
    <ChapterContent
      chapter={chapterForLayout(layout)}
      progress={progress}
      onPlan={()=>{}}
    />,
  )
  expect(screen.getByRole('article')).toHaveClass(expectedClass)
})
```

Also assert that a non-card `drive` beat renders no article and that no desktop-specific inline style is added.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx vitest run src/components/ChapterContent.test.jsx
```

Expected: FAIL because the safe-zone modifier classes do not exist.

- [ ] **Step 3: Implement the minimal placement helper**

In `ChapterContent.jsx`, add and use:

```js
export const getMobileCardPlacement=(layout,progress)=>{
  if(layout==='operations') return 'top'
  if(layout==='monument-plans'){
    if(progress>=SOCIAL_PERFORMANCE_START) return 'bottom'
    if(progress>=BOAT_OFFER_START&&progress<BOAT_OFFER_END) return 'top'
  }
  if(layout==='pavilion-contact') return 'bottom'
  return null
}

const mobilePlacement=getMobileCardPlacement(chapter.layout,progress)
const mobilePlacementClass=mobilePlacement
  ?`chapter--mobile-safe-${mobilePlacement}`
  :''
```

Apply `mobilePlacementClass` to every rendered card path, including the boat-offer article, regular operation/creator article, social-performance wrapper through a new `className` prop, and pavilion-contact article.

Update `SocialMediaPerformance` to accept `className=''` and append it to its root article. Add a focused component assertion in `src/components/SocialMediaPerformance.test.jsx` that a supplied placement class reaches the root.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
npx vitest run src/components/ChapterContent.test.jsx src/components/SocialMediaPerformance.test.jsx
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit the behavior**

```bash
git add src/components/ChapterContent.jsx src/components/ChapterContent.test.jsx src/components/SocialMediaPerformance.jsx src/components/SocialMediaPerformance.test.jsx
git commit -m "Add mobile transport-safe card zones"
```

### Task 2: Mobile Viewport-Bounded Safe Zones

**Files:**
- Modify: `src/index.css`
- Modify: `scripts/visual-qa.mjs`
- Test: `scripts/visual-qa.test.js`

**Interfaces:**
- Consumes: `.chapter--mobile-safe-top` and `.chapter--mobile-safe-bottom`.
- Produces: mobile-only bounded card placement below the menu and above lower journey controls.

- [ ] **Step 1: Add failing CSS contract tests**

Extend `scripts/visual-qa.test.js` to read `src/index.css` and assert that the mobile breakpoint includes:

```js
expect(css).toContain('.chapter--mobile-safe-top')
expect(css).toContain('.chapter--mobile-safe-bottom')
expect(css).toMatch(/max-height:\s*calc\(100(?:svh|dvh)\s*-/)
expect(css).toContain('overflow-y:auto')
```

Add a source assertion that the reduced-motion media query removes placement transitions.

- [ ] **Step 2: Run the CSS contract test and verify RED**

Run:

```bash
npx vitest run scripts/visual-qa.test.js
```

Expected: FAIL because the safe-zone CSS is absent.

- [ ] **Step 3: Implement bounded mobile safe zones**

Add mobile-only rules below the existing card rules:

```css
@media(max-width:700px){
  .chapter--mobile-safe-top,
  .chapter--mobile-safe-bottom{
    max-height:calc(100svh - 9rem);
    overflow-y:auto;
    overscroll-behavior:contain;
    transition:top .28s ease,bottom .28s ease;
  }
  .chapter--mobile-safe-top{
    top:max(4.5rem,calc(env(safe-area-inset-top) + 3.5rem));
    bottom:auto;
  }
  .chapter--mobile-safe-bottom{
    top:auto;
    bottom:max(4.2rem,calc(env(safe-area-inset-bottom) + 3.5rem));
  }
}
@media(max-width:700px) and (prefers-reduced-motion:reduce){
  .chapter--mobile-safe-top,
  .chapter--mobile-safe-bottom{transition:none}
}
```

Where an existing selector has higher specificity, update that selector so the safe-zone modifier is authoritative. Preserve all existing width, transparency, typography, and desktop rules.

- [ ] **Step 4: Add runtime viewport-boundary diagnostics**

In `scripts/visual-qa.mjs`, for mobile card states, collect the card rectangle and viewport height:

```js
const cardBounds=await page.locator('.chapter').first().evaluate(element=>{
  const rect=element.getBoundingClientRect()
  return {top:rect.top,bottom:rect.bottom,height:rect.height}
})
```

Fail when `top < 0`, `bottom > innerHeight`, or the card overlaps the fixed menu safe rectangle. Record the bounds in the existing state result for diagnosis.

- [ ] **Step 5: Run the contract tests and verify GREEN**

Run:

```bash
npx vitest run scripts/visual-qa.test.js
```

Expected: all visual-QA contract tests PASS.

- [ ] **Step 6: Commit mobile CSS and diagnostics**

```bash
git add src/index.css scripts/visual-qa.mjs scripts/visual-qa.test.js
git commit -m "Keep mobile cards inside transport-safe zones"
```

### Task 3: Regression and Visual Verification

**Files:**
- Verify: `src/components/ChapterContent.jsx`
- Verify: `src/index.css`
- Verify: `scripts/visual-qa.mjs`

**Interfaces:**
- Consumes: completed safe-zone class assignment and mobile CSS.
- Produces: evidence that all states remain functional and visually unobstructed.

- [ ] **Step 1: Run the complete automated test suite**

Run:

```bash
npm test
```

Expected: all test files PASS with no new warnings.

- [ ] **Step 2: Build the production bundle**

Run:

```bash
npm run build
```

Expected: build succeeds; the existing Vite chunk-size advisory is acceptable.

- [ ] **Step 3: Run mobile visual QA**

Start the local preview and run:

```bash
QA_BASE_URL=http://127.0.0.1:4175/ \
QA_OUTPUT_DIR=/tmp/tourist-management-transport-safe-cards \
node scripts/visual-qa.mjs --project mobile
```

Expected: representative trekker, boat, jeep, social-performance, and contact states capture without viewport-boundary or menu-overlap failures.

- [ ] **Step 4: Inspect representative captures**

Inspect:

```text
trailhead-establishing-page.png
mountain-entry-page.png
water-corridor-page.png
distant-forest-reveal-page.png
social-performance-page.png
```

Confirm that the active trekkers, all boat occupants, and the jeep remain fully visible; cards cover only secondary scenery and remain readable.

- [ ] **Step 5: Check patch hygiene**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors and only intended implementation files are modified.

- [ ] **Step 6: Commit final QA adjustments only if needed**

If visual QA required a safe-zone offset adjustment, commit only those reviewed changes:

```bash
git add src/index.css scripts/visual-qa.mjs scripts/visual-qa.test.js
git commit -m "Tune mobile transport-safe card placement"
```
