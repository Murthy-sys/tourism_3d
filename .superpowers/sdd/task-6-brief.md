### Task 6: Full regression and desktop/mobile visual acceptance

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- `window.__journeyQA()` returns `phase`, `biomeWeights`, `transportWeights`, `visibleMembers`, `distantVisibility`, `cameraJump`, `consoleFailures`, and `audioControls`.
- Visual QA produces desktop and mobile captures at mountain opening, distant water reveal, first handoff, water corridor, distant forest reveal, second handoff, and forest finale.

- [ ] **Step 1: Add fail-closed QA assertions**

```js
const snapshot=await page.evaluate(()=>window.__journeyQA())
if(snapshot.visibleMembers.guides!==1||snapshot.visibleMembers.tourists!==3)throw new Error('Trekking party is incomplete')
if(snapshot.audioControls!==0)throw new Error('Audio controls returned')
if(snapshot.consoleFailures.length)throw new Error(snapshot.consoleFailures.join('\n'))
if(snapshot.cameraJump>.8)throw new Error(`Camera discontinuity: ${snapshot.cameraJump}`)
if(!snapshot.distantVisibility.nextBiome)throw new Error('Upcoming biome is not visible early')
```

At each handoff require both adjacent transport weights and both adjacent biome weights to exceed `.05`.

- [ ] **Step 2: Run focused and full automated verification**

Run: `npm test -- --run`

Expected: all test files pass with no failures.

Run: `npm run build`

Expected: Vite production build succeeds; a chunk-size warning is acceptable.

- [ ] **Step 3: Run desktop visual QA**

Run: `node scripts/visual-qa.mjs --project desktop`

Expected: seven desktop screenshots, empty failure arrays, correct party count, early next-biome visibility, and overlapping handoff weights.

- [ ] **Step 4: Run mobile visual QA**

Run: `node scripts/visual-qa.mjs --project mobile`

Expected: seven mobile screenshots, no clipping or horizontal overflow, empty failure arrays, correct party count, and visible handoffs.

- [ ] **Step 5: Inspect all screenshots and repair visual defects**

Inspect every full-page and isolated WebGL capture. Reject and repair any monument/Ambassador object, artificial cone hill, flat opaque-blue water, sparse/repeated forest, late biome pop, route obstruction, floating person, unsuitable vehicle placement, camera snap, hard fade line, unreadable overlay, or clipped mobile composition. Re-run the affected automated and visual checks after each repair.

- [ ] **Step 6: Document evidence and commit**

Record viewport, progress, phase, transport weights, biome weights, party counts, distant biome visibility, camera continuity, console state, and screenshot paths in `design-qa.md`.

```bash
git add scripts/visual-qa.mjs design-qa.md
git commit -m "Verify mountain water forest journey"
```

- [ ] **Step 7: Final branch verification**

Run: `npm test -- --run && npm run build && git diff --check`

Expected: all tests pass, the production build succeeds, and `git diff --check` prints nothing.
