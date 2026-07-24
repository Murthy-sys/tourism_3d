### Task 5: Reorder the expedition and blend every transition

**Files:**
- Modify: `src/three/expeditionController.js`
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`
- Delete: `src/three/iceWorld.js`
- Delete: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes `getBiomeWeights`, `createHillWorld`, `createTrekkingParty`, `createWaterWorld`, and `createJungleWorld`.
- Produces `getExpeditionTransition(state): {worlds,transports,cameraBlend}`.
- `worlds` keys are exactly `mountain`, `water`, and `forest`.
- `transports` keys are exactly `trekker`, `boat`, and `jeep`.

- [ ] **Step 1: Write failing state-order and continuity tests**

```js
it('uses the required biome and transport order',()=>{
  expect([.05,.5,.9].map(p=>getExpeditionState(p).activeTransport)).toEqual(['trekker','boat','jeep'])
  expect([.05,.5,.9].map(p=>getExpeditionState(p).biome)).toEqual(['mountain','water','forest'])
  expect(JSON.stringify(getExpeditionState(.5))).not.toMatch(/ambassador|monument|ice/i)
})

it('keeps worlds active and adjacent transports overlapping',()=>{
  const mountainHandoff=getExpeditionTransition(getExpeditionState(.34))
  expect(Object.keys(mountainHandoff.worlds)).toEqual(['mountain','water','forest'])
  expect(mountainHandoff.transports.trekker).toBeGreaterThan(.05)
  expect(mountainHandoff.transports.boat).toBeGreaterThan(.05)
  const forestHandoff=getExpeditionTransition(getExpeditionState(.68))
  expect(forestHandoff.transports.boat).toBeGreaterThan(.05)
  expect(forestHandoff.transports.jeep).toBeGreaterThan(.05)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js`

Expected: FAIL because the current order starts with Ambassador/jungle and uses binary world visibility.

- [ ] **Step 3: Define the new journey phases**

Use these progress ranges:

```js
if(p<.28)return{phase:'mountain-trek',biome:'mountain',activeTransport:'trekker',localProgress:p/.28}
if(p<.42)return{phase:'trek-to-boat',biome:'mountain-water',activeTransport:'trekker',localProgress:(p-.28)/.14}
if(p<.60)return{phase:'water-boat',biome:'water',activeTransport:'boat',localProgress:(p-.42)/.18}
if(p<.74)return{phase:'boat-to-jeep',biome:'water-forest',activeTransport:'boat',localProgress:(p-.60)/.14}
if(p<.94)return{phase:'forest-jeep',biome:'forest',activeTransport:'jeep',localProgress:(p-.74)/.20}
return{phase:'contact',biome:'forest',activeTransport:'jeep',localProgress:(p-.94)/.06}
```

Update plan focus and chapter labels without removing existing overlay content.

- [ ] **Step 4: Replace scene composition and binary visibility**

Instantiate mountain, water, and forest once at shared coordinates. Attach the party, boat, and jeep to the scene or a shared transport root so their route points remain in the same coordinate space. Keep all biome roots visible. Capture base material state once and apply biome/transport opacity weights without mutating shared materials. Remove Ambassador creation/update, monument visibility, travel-route, and expedition ice imports.

- [ ] **Step 5: Blend transports, camera, fog, and lighting**

Use `smootherstep` over the full `.28–.42` and `.60–.74` handoff ranges. Place both transports at the same physical landing, overlap opacity, and hold each inactive transport at its endpoint. Add camera keyframes before, at, and after both landings; interpolate position and target with smootherstep plus delta-based damping `1-Math.exp(-delta*4.5)`. Blend background, fog near/far, exposure, hemisphere intensity, and directional-light color from the same biome weights. Use camera far plane `420` and fog far values that preserve the distant water and forest silhouettes.

- [ ] **Step 6: Prewarm and harden navigation**

Call `renderer.compile(scene,camera)` after world construction. Ensure menu progress jumps update camera and target through damping rather than direct assignment. Keep mobile framing for the four-person party and each landing. Retain WebGL context-loss fallback and dispose every new geometry/material on unmount.

- [ ] **Step 7: Run GREEN and commit**

Run: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`

Expected: all reordered journey, continuous transition, overlay, and camera tests pass.

```bash
git add src/three/expeditionController.js src/three/expeditionController.test.js src/three/journeyData.js src/three/journeyData.test.js src/three/indiaJourney.js src/three/indiaJourney.test.js src/journey/chapters.js src/journey/chapters.test.js src/three/iceWorld.js src/three/iceWorld.test.js
git commit -m "Reorder expedition through mountain water forest"
```

