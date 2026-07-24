# Task 6 Independent Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mountain → water → forest journey visually credible and make its desktop/mobile acceptance harness prove rendered party, biome, transport, camera, layout, and corpus continuity.

**Architecture:** Preserve the existing single-scene expedition controller, but distinguish authoritative route landmarks from physically separated vehicle staging poses. Move QA from scene-root flags and theoretical keyframes to active rendered occupants, material-weighted/frustum-tested worlds, and observed runtime camera metrics. Repair the common scene construction causes—ridge panels, the rotated water basin, opacity ordering, and over-wide forest exclusions—rather than editing individual screenshots.

**Tech Stack:** React, Three.js, Vite, Vitest, Playwright.

## Global Constraints

- Keep the required mountain → water → forest phase order and seven QA progress states.
- Keep one visible guide and three visible tourists/occupants throughout active transport states.
- Keep both neighboring biome and transport weights above `.05` at handoffs.
- Generate exactly one final seven-state desktop corpus and one final seven-state mobile corpus after affected-state development runs.
- Do not add optional unrelated polish or external assets.

---

### Task 1: Lock rendered-continuity and runtime-QA contracts

**Files:**
- Modify: `src/three/indiaJourney.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `scripts/visual-qa.mjs`
- Modify: `vite.config.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Produces: `getRenderedWorldVisibility(worlds, weights, camera)`.
- Produces: `createCameraJumpTracker()` with `observe(camera,target)`, `reset(camera,target)`, and `value()`.
- Produces: `getJourneyQASnapshot({state,transition,worlds,transports,camera,cameraJump,...})`.

- [ ] Add failing tests proving off-frustum/zero-weight worlds are not rendered-visible, active boat/jeep occupants are counted instead of trekker children, observed camera jumps reset, and non-finite jumps are rejected.
- [ ] Run `npm test -- --run src/three/indiaJourney.test.js` and confirm the new assertions fail for missing rendered visibility, active occupants, and runtime metrics.
- [ ] Implement the rendered visibility and camera tracker interfaces, wire a real `resetQAMetrics`, and strengthen the harness to clear output, validate every active biome/transport, require a mobile overlay, validate before capture, and reject missing/non-finite jumps.
- [ ] Add `exclude: ['.worktrees/**']` to Vite's test config.
- [ ] Re-run the focused suite and confirm it passes.

### Task 2: Preserve live opacity through biome blending

**Files:**
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/expeditionController.js`
- Test: `src/three/expeditionController.test.js`

**Interfaces:**
- Consumes: each blend state's captured static material opacity.
- Produces: reset-before-animation and `liveOpacity * weight` application without per-frame compounding.

- [ ] Add a failing controller regression that animates a material opacity, applies a fractional biome weight, and expects the animated value—not the captured base—to be multiplied.
- [ ] Run the focused controller suite and confirm the new assertion fails.
- [ ] Change blend application to multiply current live opacity after static reset and world animation.
- [ ] Re-run the focused controller suite and confirm it passes.

### Task 3: Add real four-person boat/jeep continuity and separated handoff poses

**Files:**
- Modify: `src/three/expeditionVehicles.test.js`
- Modify: `src/three/expeditionVehicles.js`
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/expeditionController.js`
- Test: `src/three/expeditionVehicles.test.js`
- Test: `src/three/expeditionController.test.js`

**Interfaces:**
- Produces: `transport.userData.members`, each with `role` of `guide` or `tourist`.
- Produces: a forest shore staging progress used at and after `boat-to-jeep`.

- [ ] Add failing tests requiring one guide plus three visible occupants in boat and jeep and non-intersecting boat/jeep world bounds at the `.67` handoff.
- [ ] Run the two focused suites and confirm occupant-count and bounds assertions fail.
- [ ] Add compact seated passengers to the existing boat/jeep geometry and derive a shore staging progress whose actual jeep bounds clear the docked boat bounds.
- [ ] Map forest-jeep progress continuously from the shore staging pose to route end.
- [ ] Re-run the two focused suites and confirm they pass.

### Task 4: Repair mountain, water, and forest construction causes

**Files:**
- Modify: `src/three/hillWorld.test.js`
- Modify: `src/three/hillWorld.js`
- Modify: `src/three/waterWorld.test.js`
- Modify: `src/three/waterWorld.js`
- Modify: `src/three/jungleWorld.test.js`
- Modify: `src/three/jungleWorld.js`
- Test: the three matching world suites.

**Interfaces:**
- Produces: subdivided/lower mountain backdrop geometry without viewport-sized triangles.
- Produces: an unrotated basin with layered depth/specular/reflection and varied shore detail.
- Produces: separate crown and undergrowth camera clearances with denser, varied mid/far vegetation.

- [ ] Add failing geometry/material/density tests for maximum ridge triangle span, basin rotation, multi-layer water optical contrast/shore variation, and forest camera-corridor density.
- [ ] Run the three world suites and confirm the new assertions fail.
- [ ] Replace broad ridge panels with denser smooth bands, remove the accidental basin rotation, deepen water/shore optical variation, and reduce only the low vegetation exclusion while retaining full-crown sightlines.
- [ ] Re-run the three world suites and confirm they pass.

### Task 5: Visual and branch acceptance

**Files:**
- Modify: `design-qa.md`
- Modify: `.superpowers/sdd/task-6-report.md`

**Interfaces:**
- Consumes: `/tmp/tourist-management-visual-qa/{desktop,mobile}`.

- [ ] Run affected mobile mountain, water, handoff, and forest states plus affected desktop water/handoff states; inspect each page and WebGL capture.
- [ ] Repair only reproduced blockers and re-run their focused tests/captures.
- [ ] Run one final full desktop corpus and one final full mobile corpus; inspect all 28 images.
- [ ] Run exact `npm test -- --run`, `npm run build`, and `git diff --check`.
- [ ] Update evidence/report with exact outcomes, stage only Task 6 review files, and commit.
