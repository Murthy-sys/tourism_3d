### Task 6: Continuous landscape controller and buttery camera blending

**Files:**
- Modify: `src/three/expeditionController.js`
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Delete: `src/three/iceWorld.js`
- Delete: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes: `getLandscapeWeights`, `createHillWorld`, `createTrekkingParty`, `updateTrekkingParty`.
- Produces: `getTransitionState(expeditionState)` with eased zone and transport weights.
- `transports.trekker` becomes the party root while preserving the existing key for camera compatibility.

- [ ] **Step 1: Write failing transition tests**

Assert every sampled transition has all three worlds visible, weights are continuous with maximum adjacent delta below `.08` at `.005` progress steps, forest/water and water/hills overlap during handoffs, and transport opacity also overlaps rather than toggles.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js`

Expected: FAIL because visibility is binary and ice semantics remain.

- [ ] **Step 3: Replace binary visibility**

Add all three worlds once and keep them visible. Traverse each world's materials and set opacity from zone weights while keeping opaque materials depth-writing above `.35`. Use the existing phase timing to update transports, but overlap adjacent transports during handoffs. Replace ice imports with hill imports and use the trekking party for the `trekker` transport key.

- [ ] **Step 4: Smooth camera and atmosphere**

Replace linear keyframe interpolation with `smoothstep(0,1,t)` for position and target interpolation. Add intermediate handoff keyframes centered on both physical landings. In `indiaJourney.js`, use delta-aware exponential damping `1-Math.exp(-delta*4.5)` rather than fixed `.055`, and blend fog near/far plus exposure from the same transition weights.

- [ ] **Step 5: Update semantics and hill-specific copy**

Rename the expedition phase value `ice-trek` to `hill-trek` in data, tests, overlay routing, visual QA states, and conditions. Replace “Himalayan Adventure” and snow/Himalaya-specific supporting copy with “Hill Country Trek” and lush-hill language; leave all other journey copy unchanged.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: all controller, data, camera, hill, and party tests pass.

```bash
git add src/three/expeditionController.js src/three/expeditionController.test.js src/three/journeyData.js src/three/journeyData.test.js src/three/indiaJourney.js src/three/indiaJourney.test.js src/three/hillWorld.js src/three/hillWorld.test.js src/three/trekkingParty.js src/three/trekkingParty.test.js src/three/iceWorld.js src/three/iceWorld.test.js
git commit -m "Blend expedition through continuous landscape"
```

