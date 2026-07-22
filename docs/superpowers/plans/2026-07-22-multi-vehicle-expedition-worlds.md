# Multi-Vehicle Expedition Worlds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the Ambassador opening and Who We Are pavilion, then build a jungle jeep expedition, reflective boat journey, ice-mountain trek, staged handoffs, layered environmental audio, and complete desktop/mobile behavior.

**Architecture:** Extend the normalized journey state with expedition phases and handoff ranges. Focused Three.js factories create the jeep, boat, trekker, jungle, water, and ice worlds, while one expedition controller selects and animates the active transport. The existing React content, booking, menu, and shared audio system remain the accessible interaction layer.

**Tech Stack:** React 18, Three.js 0.160, Web Audio API, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Preserve the approved Ambassador opening and Who We Are pavilion.
- Jungle, jeep, water, boat, ice mountains, and trekker are mandatory on desktop and mobile.
- Environments must fill the viewport with foreground, midground, background, surface variation, lighting, and atmosphere.
- Avoid empty planes, isolated monument objects, generic boxes, and flat visible card grids.
- Use original geometry or locally stored assets with clear rights; never hotlink third-party models.
- Preserve booking, menu navigation, real sound mute/resume, reduced motion, and accessibility.
- The workspace is not a Git repository, so tasks end with verification checkpoints rather than commits.

---

### Task 1: Expedition Timeline and Handoffs

**Files:**
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`

**Interfaces:**
- Produces: `getExpeditionState(progress)` returning `{ phase, activeTransport, handoff, localProgress }`.
- Phases: `ambassador`, `ambassador-to-jeep`, `jungle-jeep`, `jeep-to-boat`, `water-boat`, `boat-to-trek`, `ice-trek`, `contact`.

- [ ] Write failing tests asserting ordered phases, non-zero handoff ranges, and transport selection.

```js
expect([.1,.34,.43,.55,.64,.78,.9].map(p=>getExpeditionState(p).activeTransport))
  .toEqual(['ambassador','ambassador','jeep','boat','boat','trekker','trekker'])
expect(getExpeditionState(.39).handoff).toBe('ambassador-to-jeep')
expect(getExpeditionState(.60).handoff).toBe('jeep-to-boat')
expect(getExpeditionState(.72).handoff).toBe('boat-to-trek')
```

- [ ] Run `npm test -- src/three/journeyData.test.js src/journey/chapters.test.js` and confirm failure because the expedition API is absent.
- [ ] Implement explicit phase ranges and align plan focus with jungle, water, and ice phases.
- [ ] Run the focused tests and expect PASS.

---

### Task 2: Jeep, Boat, and Trekker

**Files:**
- Create: `src/three/expeditionVehicles.js`
- Create: `src/three/expeditionVehicles.test.js`
- Modify: `src/three/ambassador.js`

**Interfaces:**
- Produces: `createExpeditionJeep(materials)`, `createExpeditionBoat(materials)`, `createTrekker(materials)`, `updateJeep`, `updateBoat`, and `updateTrekker`.
- Each object exposes named moving parts through `userData`.

- [ ] Write failing tests that require four jeep wheels, visible traveller, detailed boat hull and wake anchors, and a trekker with articulated limbs, backpack, and walking pole.
- [ ] Run `npm test -- src/three/expeditionVehicles.test.js` and confirm module-resolution failure.
- [ ] Build an open expedition jeep with roll cage, spare wheel, luggage, suspension, lights, seats, and the same traveller identity.
- [ ] Build a detailed boat with shaped hull, canopy, railings, seating, motor, navigation light, traveller, and wake anchors.
- [ ] Build an articulated trekker with torso, head, arms, legs, backpack, boots, and pole.
- [ ] Implement route tangent, wheel, pitch/roll, limb-cycle, and reduced-motion updates.
- [ ] Run the focused test and expect PASS.

---

### Task 3: Dense Jungle World

**Files:**
- Create: `src/three/jungleWorld.js`
- Create: `src/three/jungleWorld.test.js`

**Interfaces:**
- Produces: `createJungleWorld(materials, quality)` with `forest-track`, `ranger-outpost`, `jungle-mist`, and layered vegetation groups.

- [ ] Write a failing test requiring foreground canopy, midground undergrowth, background trees, a curved track, mist, rocks, vines, water puddles, and a ranger outpost.
- [ ] Run `npm test -- src/three/jungleWorld.test.js` and confirm failure.
- [ ] Implement varied trunks, roots, broadleaf canopies, hanging vines, ferns, grasses, rocks, puddles, terrain mounds, fog planes/particles, light shafts, and a trailhead structure.
- [ ] Use reduced counts on mobile without removing any named layer.
- [ ] Run the focused test and expect PASS.

---

### Task 4: Reflective Water World

**Files:**
- Create: `src/three/waterWorld.js`
- Create: `src/three/waterWorld.test.js`

**Interfaces:**
- Produces: `createWaterWorld(materials, quality)` and `updateWaterWorld(world, elapsed, boat)`.

- [ ] Write a failing test requiring reflective water, shoreline, jetty, rock formations, reeds, landing lights, wake geometry, and environmental anchors.
- [ ] Run `npm test -- src/three/waterWorld.test.js` and confirm failure.
- [ ] Implement a layered water surface with normal-like vertex movement, color reflection, transparent shallows, shore vegetation, jetty, rocks, haze, boat spline, and animated wake.
- [ ] Run the focused test and expect PASS.

---

### Task 5: Ice Mountains and Trek Route

**Files:**
- Create: `src/three/iceWorld.js`
- Create: `src/three/iceWorld.test.js`

**Interfaces:**
- Produces: `createIceWorld(materials, quality)` and `updateIceWorld(world, elapsed, trekker)`.

- [ ] Write a failing test requiring glacier, layered mountain ranges, ice cliffs, trek path, base camp, drifting snow, cairns, and a contact shelter.
- [ ] Run `npm test -- src/three/iceWorld.test.js` and confirm failure.
- [ ] Implement multiple mountain depth layers, snow caps, translucent blue ice, glacier crevasses, path markers, footprints, tents/shelter, cold fog, snow particles, and cold/warm contrast lighting.
- [ ] Run the focused test and expect PASS.

---

### Task 6: Expedition Controller and Scene Integration

**Files:**
- Create: `src/three/expeditionController.js`
- Create: `src/three/expeditionController.test.js`
- Modify: `src/three/regions.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`

**Interfaces:**
- Produces: `createExpeditionController(scene, materials, quality)` returning `{ update(state, elapsed, reducedMotion), dispose() }`.

- [ ] Write failing tests for exactly one visible active transport, overlapping handoff staging, correct world visibility, and stable mobile world inclusion.
- [ ] Run focused tests and confirm failure.
- [ ] Compose the three worlds at separated route coordinates.
- [ ] Create all transports once, update only the active/handoff pair, and fade or move them through staged checkpoints without popping.
- [ ] Replace the prior plan-monument visibility rules with jungle, water, and ice world visibility.
- [ ] Add expedition-specific camera keyframes that reveal environment scale before copy.
- [ ] Run focused controller, region, renderer, and journey tests and expect PASS.

---

### Task 7: Integrated Plan Copy and Booking

**Files:**
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/components/ChapterContent.test.jsx`
- Modify: `src/components/JourneyShell.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes expedition phase and plan focus.
- Produces one environment-aligned active plan inscription and accessible booking action.

- [ ] Write failing tests requiring jungle, water, and ice plan labels and exactly three accessible booking actions.
- [ ] Run component tests and confirm failure.
- [ ] Position jungle copy at the ranger outpost, water copy at the jetty, and Himalayan copy at base camp without visible card surfaces.
- [ ] Preserve booking prefill and keyboard/touch interaction.
- [ ] Run component and booking tests and expect PASS.

---

### Task 8: Environmental Sound Layers

**Files:**
- Modify: `src/audio/ambient.js`
- Modify: `src/audio/ambient.test.js`

**Interfaces:**
- Produces: `setAmbientEnvironment(environment)` supporting `journey`, `jungle`, `water`, and `mountain`.

- [ ] Write failing tests asserting environment state publication and one master mute controlling every layer.
- [ ] Run the audio test and confirm failure.
- [ ] Add filtered procedural layers for jungle movement, water wash, and mountain wind, crossfaded by phase and routed through the existing master gain.
- [ ] Ensure Sound off ramps the shared master gain to zero within 120ms.
- [ ] Run the focused audio test and expect PASS.

---

### Task 9: Desktop, Mobile, and Final Verification

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

- [ ] Capture Ambassador, Who We Are, jungle jeep, water boat, ice trekker, each handoff, contact, menu, and booking at 1440×900 and 390×844.
- [ ] Assert active transport, active world, sound mute/resume, menu jump, booking prefill/submission, no conventional sections, no overflow, and no console errors.
- [ ] Visually verify every world has foreground, midground, background, distinctive light, surface variation, and no empty-plane presentation.
- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run build` and require success; the existing Three.js chunk-size advisory remains non-blocking.
- [ ] Run `node scripts/visual-qa.mjs desktop` and `node scripts/visual-qa.mjs mobile` and require all assertions to pass.
- [ ] Update `design-qa.md` and end it with `final result: passed` only after P0/P1/P2 issues are resolved.
