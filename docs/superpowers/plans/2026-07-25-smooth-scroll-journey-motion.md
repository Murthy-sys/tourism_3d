# Smooth Scroll Journey Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Smooth rapid scroll-driven movement by making transports, camera, atmosphere, and biome transitions consume one time-based rendered progress value.

**Architecture:** Add a pure journey-progress controller beside the existing renderer helpers. The existing Three.js animation loop owns and advances this controller; React continues sending raw target progress without gaining another animation loop.

**Tech Stack:** Three.js, JavaScript, Vitest, Vite.

## Global Constraints

- Use elapsed wall time, not frame count.
- Mobile uses slightly stronger stabilization than desktop.
- Large scroll jumps have a per-second velocity limit.
- Suspension-sized frame intervals cannot create a progress leap.
- Reduced-motion snaps directly to target progress.
- Transport, camera, world, and atmosphere consume the same rendered progress.
- Do not add a requestAnimationFrame loop, render pass, or React state loop.
- Preserve camera composition, routes, menu destinations, chapter content,
  adaptive resolution, and first-frame readiness.

---

### Task 1: Pure time-based progress controller

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Produces: `createJourneyProgressController({quality, reducedMotion, initial})`
  with `setTarget(value)`, `setReducedMotion(value)`, `advance(deltaSeconds)`,
  `value()`, and `target()`.

- [ ] Write failing tests proving:
  - a `0 → 1` first-frame jump is bounded by `0.65/60` on mobile and `0.85/60`
    on desktop;
  - progress never overshoots its target;
  - simulated 20, 30, 60, and 120 FPS runs reach equivalent values within
    `.02` after one second;
  - a delta above `.25` seconds does not advance progress;
  - reduced-motion snaps to target;
  - inputs are clamped to `[0,1]`.
- [ ] Run `npm test -- src/three/indiaJourney.test.js` and confirm RED because
  the controller export is missing.
- [ ] Implement the controller using:
  - response `8` and velocity `0.65 progress/second` on mobile;
  - response `10` and velocity `0.85 progress/second` on desktop;
  - `1 - exp(-delta * response)` convergence;
  - maximum step `velocity * delta`;
  - ignored non-finite or `> .25` second deltas;
  - direct snap when reduced-motion is active;
  - convergence snap when the remaining gap is below `0.00001`.
- [ ] Run the focused tests and confirm GREEN.

---

### Task 2: One synchronized rendered progress in the live journey

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: `createJourneyProgressController`, existing Three.js clock delta,
  external `setProgress`, and `setReducedMotion`.
- Produces: one rendered progress value used by `getJourneyState`,
  expedition/world updates, transport positioning, resolved camera framing,
  atmosphere, and QA state.

- [ ] Add a failing integration-policy test through a small exported
  `advanceJourneyFrame(controller, delta)` seam that returns the rendered
  progress consumed by the frame.
- [ ] Replace the animation loop's raw `progress` variable with one controller.
- [ ] At the beginning of each frame, call `advance(delta)` once and pass that
  result to `getJourneyState` and `getResolvedCameraFrame`.
- [ ] Make public `setProgress(value)` update only the controller target.
- [ ] Make public `setReducedMotion(value)` update both the renderer flag and
  controller mode.
- [ ] Preserve initial progress `0` and all readiness/render ordering.
- [ ] Run `npm test -- src/three/indiaJourney.test.js`.

---

### Task 3: Regression and full verification

**Files:**
- Verify: `src/three/indiaJourney.js`
- Verify: `src/three/indiaJourney.test.js`
- Verify: `src/three/jungleWorld.test.js`

- [ ] Run `npm test -- src/three/indiaJourney.test.js src/three/jungleWorld.test.js`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`, `git status --short`, and `git diff --stat`.
- [ ] Confirm only the journey motion helper/integration and its tests changed.
- [ ] Record the supplied mobile video as diagnosis evidence and browser
  comparison capture as unavailable unless an approved browser surface exists.

