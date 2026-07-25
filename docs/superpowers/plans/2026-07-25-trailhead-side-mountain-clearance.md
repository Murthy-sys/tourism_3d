# Trailhead Side-Mountain Clearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the opening’s green side-mountain edge physically behind the complete coach silhouette.

**Architecture:** Preserve the existing terrain heightfield and turnout blend, but make the turnout envelope asymmetric: slightly wider on the coach-nose side and deeper behind the coach. This lowers only the terrain samples responsible for the visible overlap and continues to blend through the existing smootherstep function.

**Tech Stack:** Three.js geometry, JavaScript, Vitest, Playwright screenshots

## Global Constraints

- Change only the terrain-height calculation and focused regression coverage.
- Do not change the coach, camera, route, materials, UI, or render order.
- Preserve the mountain outside the trailhead opening.
- Keep the terrain transition smooth.

---

### Task 1: Add Production Coach-Side Terrain Clearance

**Files:**
- Modify: `src/three/terrain.js`
- Test: `src/three/terrain.test.js`

**Interfaces:**
- Consumes: existing `sampleMountainHeight(x, z)`.
- Produces: an asymmetric turnout envelope with the same return type and public API.

- [ ] Add a failing regression test proving the coach-side samples at `(6, 28)` and `(4, 26)` stay within `0.08` of `openingFloor(z)`, while a distant sample such as `(-24, 24)` remains natural mountain terrain.
- [ ] Run `npx vitest run src/three/terrain.test.js` and verify RED because the coach-side terrain currently rises above the opening floor.
- [ ] Replace the fixed turnout radii with `12` on the left, `15` on the coach-nose/right side, `9` toward the camera, and `13` behind the coach. Keep the same center, smootherstep bounds, and maximum blend with the route corridor.
- [ ] Run `npx vitest run src/three/terrain.test.js` and verify GREEN.

### Task 2: Verify Terrain and Opening Frames

**Files:**
- Verify: `src/three/hillWorld.test.js`
- Verify: `src/three/trailhead.test.js`
- Verify: `src/three/tourCoach.test.js`

**Interfaces:**
- Consumes: corrected `sampleMountainHeight`.
- Produces: regression evidence without changing other systems.

- [ ] Run `npx vitest run src/three/terrain.test.js src/three/hillWorld.test.js src/three/trailhead.test.js src/three/tourCoach.test.js`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Capture the opening at `390x844` and `1440x900`.
- [ ] Confirm the green mountain begins behind the coach and no longer touches the roof/nose silhouette.
- [ ] Run `git diff --check` and leave implementation changes uncommitted.
