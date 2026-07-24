### Task 7: Desktop/mobile visual acceptance

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- Produces screenshots for `forest-water-transition`, `water-corridor`, `water-hill-transition`, `hill-reveal`, `trekking-party`, and `hill-contact`.

- [ ] **Step 1: Update QA state names and structural probes**

Add browser-visible QA counters for guide count, tourist count, snow/ice object count, and visible zone weights. Require `{guides:1,tourists:3,iceObjects:0}` and verify two or more zone weights are above `.05` during each handoff screenshot.

- [ ] **Step 2: Run desktop visual QA**

Run: `node scripts/visual-qa.mjs desktop`

Expected: all six new frames render, no hard pop is observed between adjacent frames, the four walkers remain on the trail, menu/booking pass, `soundControls:0`, `horizontalOverflow:false`, and `messages:[]`.

- [ ] **Step 3: Run mobile visual QA**

Run: `node scripts/visual-qa.mjs mobile`

Expected: the guide and at least two tourists are visible in the hill-party frame, both handoffs remain legible, and all interaction/error assertions pass.

- [ ] **Step 4: Run complete verification**

```bash
npm test -- --run
npm run build
node scripts/visual-qa.mjs desktop
node scripts/visual-qa.mjs mobile
```

Expected: every unit test passes, Vite exits `0`, both QA scripts exit `0`, no console errors occur, and no existing menu, booking, car, jeep, or boat behavior regresses.

- [ ] **Step 5: Record evidence and commit**

Document transition continuity, forest density, water depth, hill silhouettes, trekking-party composition, desktop/mobile framing, and all commands in `design-qa.md`.

```bash
git add scripts/visual-qa.mjs design-qa.md
git commit -m "Verify continuous realistic landscape"
```
