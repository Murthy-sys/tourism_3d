# Who We Are Service Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the six existing Who We Are capability labels with the user’s exact nine promotion-service labels while preserving the approved two-column presentation.

**Architecture:** `BRAND_CAPABILITIES` in `src/journey/chapters.js` remains the single source of truth. `ChapterContent` continues to render that array without extra copy, while existing browser QA compares the live DOM against the same authoritative array on desktop and mobile.

**Tech Stack:** React 18, Vitest, Testing Library, Vite, Playwright, CSS.

## Global Constraints

- Render exactly nine labels in the approved wording, capitalization, and order.
- Add no icons, descriptions, numbering, or extra labels.
- Preserve the existing two-column `operations-proof` grid and visual treatment.
- Leave the Who We Are heading/body, creator card, 3D scene, camera, transitions, menu, and later chapters unchanged.
- Keep both `1440×900` and `390×844` overlays unclipped and free of horizontal overflow.

---

### Task 1: Replace and verify the Who We Are service labels

**Files:**
- Modify: `src/journey/chapters.test.js`
- Modify: `src/components/ChapterContent.test.jsx`
- Modify: `src/journey/chapters.js`
- Modify only if the nine rows do not fit: `src/index.css`
- Verify without modifying: `scripts/visual-qa.mjs`

**Interfaces:**
- Consumes: `BRAND_CAPABILITIES: string[]` from `src/journey/chapters.js`.
- Produces: the same exported `BRAND_CAPABILITIES` interface containing exactly nine strings.
- Renders: `.operations-proof[aria-label="What we do"] > span` in array order.

- [ ] **Step 1: Write the failing data and rendered-order tests**

Update the chapter import:

```js
import {
  BRAND_CAPABILITIES,
  CHAPTERS,
  OPENING_DRIVE_END,
  OPENING_TREK_END,
  TRAVEL_PLANS,
  getChapterAtProgress,
  getProgressForChapter,
} from './chapters'
```

Add this chapter-data test:

```js
it('lists the approved Who We Are promotion services in order',()=>{
  expect(BRAND_CAPABILITIES).toEqual([
    'Destination Promotions',
    'Tourism Campaigns',
    'Hotel & Resort Promotions',
    'Homestay Promotions',
    'Adventure Activity Promotions',
    'Travel Reels',
    'Professional Photography',
    'Cinematic Promotional Videos',
    'Tourism Brand Collaborations',
  ])
})
```

Replace the existing component capability assertions with:

```jsx
it('renders only the approved Who We Are promotion services in order',()=>{
  const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
  render(<ChapterContent chapter={chapter} progress={.19}/>)
  const proof=screen.getByLabelText('What we do')
  expect([...proof.children].map(item=>item.textContent)).toEqual([
    'Destination Promotions',
    'Tourism Campaigns',
    'Hotel & Resort Promotions',
    'Homestay Promotions',
    'Adventure Activity Promotions',
    'Travel Reels',
    'Professional Photography',
    'Cinematic Promotional Videos',
    'Tourism Brand Collaborations',
  ])
  expect(screen.queryByText('Campaign concepts')).not.toBeInTheDocument()
  expect(screen.queryByText('Audience-ready content')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- --run src/journey/chapters.test.js src/components/ChapterContent.test.jsx
```

Expected: FAIL because `BRAND_CAPABILITIES` still contains the old six labels.

- [ ] **Step 3: Replace the authoritative label array**

Replace `BRAND_CAPABILITIES` in `src/journey/chapters.js` with:

```js
export const BRAND_CAPABILITIES=[
  'Destination Promotions',
  'Tourism Campaigns',
  'Hotel & Resort Promotions',
  'Homestay Promotions',
  'Adventure Activity Promotions',
  'Travel Reels',
  'Professional Photography',
  'Cinematic Promotional Videos',
  'Tourism Brand Collaborations',
]
```

Do not change `ChapterContent.jsx`; it already renders this array directly and adds no descriptions or icons.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- --run src/journey/chapters.test.js src/components/ChapterContent.test.jsx
```

Expected: both files pass and the component exposes the exact nine labels in order.

- [ ] **Step 5: Build and run focused desktop/mobile visual QA**

Run:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

In another shell, run:

```bash
QA_BASE_URL=http://127.0.0.1:4175/ \
QA_OUTPUT_DIR=/tmp/tourist-management-services-qa \
QA_STATE=brand-collaboration-overview \
node scripts/visual-qa.mjs --project desktop

QA_BASE_URL=http://127.0.0.1:4175/ \
QA_OUTPUT_DIR=/tmp/tourist-management-services-qa \
QA_STATE=brand-collaboration-overview \
node scripts/visual-qa.mjs --project mobile
```

Expected for both: exact nine-item `layout.content.items`, `clipped:false`, no horizontal overflow, no console failures, and zero audio controls.

If either viewport reports clipping, replace only the density declarations with these fixed values and rerun both captures:

```css
.operations-proof{
  gap:.35rem 1.4rem;
  margin-top:1.35rem;
}
.operations-proof span{
  padding:.42rem 0;
}
@media(max-width:700px){
  .operations-proof{
    gap:.18rem .8rem;
    margin-top:.6rem;
  }
  .operations-proof span{
    font-size:.5rem;
    padding:.28rem 0;
  }
}
```

- [ ] **Step 6: Run final verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass, the production build exits `0` with only the existing chunk-size advisory, and `git diff --check` prints no errors.

- [ ] **Step 7: Commit and push `main`**

```bash
git add src/journey/chapters.js src/journey/chapters.test.js \
  src/components/ChapterContent.test.jsx
git add src/index.css
git commit -m "Replace Who We Are promotion services"
git push origin main
```

If visual QA did not require CSS changes, omit `git add src/index.css`. Confirm `HEAD` and `origin/main` resolve to the same commit after the push.
