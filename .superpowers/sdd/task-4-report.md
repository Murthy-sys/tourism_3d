# Task 4 Report: Dense Forest Finale and Boat-to-Jeep Landing

## Status

Complete.

## Commit

- `400f610` — `Build dense forest expedition finale`

## Files

- `src/three/jungleWorld.js`
- `src/three/jungleWorld.test.js`

## Implementation

- Anchored the forest inlet, timber water landing, jeep route start, and jeep route end to `LANDMARKS.forestLanding` and `LANDMARKS.forestEnd`.
- Added the required `forest-inlet`, `forest-water-landing`, `forest-near-layer`, `forest-mid-layer`, `forest-far-layer`, `jungle-undergrowth`, `jungle-vines`, and `jungle-mist` groups.
- Built deterministic hashed near/mid/far forest placement with six crown silhouettes, tapered trunks, branch forks, vines, ferns, shrubs, grass, fallen logs, roots, damp ground, puddles, mist, and sun shafts.
- Added wet inlet banks, reeds, stones, exposed roots, an overhanging branch, water, and a timber landing around the shared handoff point.
- Preserved the legacy vegetation/track/outpost object names and `createJungleWorld(materials, quality)` / `world.userData.route` interfaces.
- Desktop counts are 96 trees and 192 undergrowth objects. Mobile counts are 56 trees and 116 undergrowth objects.
- Placement and published `routeClearance` use sampled route distance minus obstacle radius for all tree trunks, rocks, inlet stones, and fallen timber. Measured clearance is `2.808643346574624`.
- Direct scene probing measured zero distance from route endpoints to both shared landmarks and placed `forest-water-landing` at `[-2, 0.25, -86]`.

## TDD and Verification

### RED

- Command: `npm test -- src/three/jungleWorld.test.js`
- Outcome: expected failure, exit 1.
- Cause: the new test could not find the required forest-layer/inlet groups (`expected undefined to be truthy`).

### GREEN

- Command: `npm test -- src/three/jungleWorld.test.js`
- Outcome: exit 0; local Task 4 tests passed (2/2). Vitest also discovered the existing isolated-worktree jungle tests, for 7/7 total.

- Command: `npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js`
- Outcome: exit 0; 4 files and 20 tests passed, including Vitest's existing isolated-worktree copies.

- Command: `npm test -- --exclude '.worktrees/**'`
- Outcome: exit 0; complete main-worktree suite passed, 20 files and 58 tests.

- Command: `npm run build`
- Outcome: exit 0; production build completed with 53 modules transformed.
- Note: Vite emitted the repository's existing large-chunk advisory for the 702.23 kB JavaScript bundle.

- Command: `git diff --check`
- Outcome: exit 0; no whitespace errors.

### Repository-wide caveat

- Command: `npm test`
- Outcome: exit 1; 164 tests passed and 5 tests failed only under `.worktrees/continuous-landscape/src/components`.
- Cause: the root Vitest invocation discovers another worktree and mixes its React renderer with the root React installation, producing invalid-hook-call failures. The same main-worktree component tests pass when `.worktrees/**` is excluded. Task 4's jungle and expedition vehicle tests passed in this run.

## Self-review

- Confirmed every required named group is present.
- Confirmed desktop and mobile density floors are exceeded.
- Confirmed all placement is deterministic and avoids row-based repetition.
- Confirmed the route begins and ends exactly at the authoritative shared landmarks.
- Confirmed route clearance is calculated from actual registered obstacles, not a fixed assertion value.
- Confirmed tree trunks are tapered, all six crown variants are exercised on both quality levels, and secondary forest detail is reduced before the main canopy on mobile.
- Confirmed legacy scene names, route exposure, outpost, rocks, puddles, and copy anchor remain available.
- Confirmed only the two requested source/test files were staged in the commit.

## Concerns

- No Task 4 implementation blocker remains.
- The root `npm test` command will continue to include `.worktrees/**` until test discovery excludes nested worktrees; use `npm test -- --exclude '.worktrees/**'` for the main-worktree suite.

## Review Follow-up

### Commit

- `1189f3e` — `Align forest landing and clearance`

### Findings addressed

- Replaced the offset jungle planks with a centered deck whose rendered geometry shares the water jetty's XZ center, walking-surface height, and approach orientation at `LANDMARKS.forestLanding`.
- Registered every rendered tree trunk, jungle rock, inlet stone, and fallen log in `world.userData.routeObstacles`.
- Recomputed `world.userData.routeClearance` from each registered object's world-space XZ bounding footprint against 1,201 route samples. This includes both the length and thickness of rotated fallen logs.
- Cloned the caller's material palette per jungle world so jungle disposal or material mutation cannot affect the shared input palette, water world, or another jungle instance.
- Added regression tests for physical deck geometry, dense independent obstacle-bound clearance inspection, mobile density floors, exact route end, deterministic non-row placement, all six crown silhouettes on mobile, and per-world material isolation.
- Kept runtime order, world translation, and legacy visibility work out of Task 4 as directed; those remain Task 5 integration concerns.

### Measured geometry

- Jungle deck full-geometry XZ center: `[-2, -86]`.
- Water deck full-geometry XZ center: `[-2, -86]`.
- Jungle and water walking-surface height: `0.51`.
- Jungle/water deck direction difference: approximately `0.00018`.
- Registered desktop obstacles: 135 (96 trunks, 22 jungle rocks, 8 inlet stones, and 9 fallen logs).
- Bound-aware desktop route clearance: `2.610233642573065`.

### Review TDD

- RED command: `npm test -- src/three/jungleWorld.test.js`
- RED outcome: exit 1; 3 expected local failures:
  - centered deck geometry was absent,
  - `world.userData.routeObstacles` was absent,
  - jungle worlds reused caller-owned materials.
- GREEN command: `npm test -- src/three/jungleWorld.test.js`
- GREEN outcome: exit 0; 8/8 local jungle tests passed, and Vitest's discovered worktree copy also passed (13/13 total).

### Review verification

- Required command: `npm test -- src/three/jungleWorld.test.js src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`
- Outcome: exit 0; 6 files and 40 tests passed, including Vitest's discovered worktree copies. Local suites passed 8 jungle, 8 water, and 8 expedition-vehicle tests.
- Command: `npm test -- --exclude '.worktrees/**'`
- Outcome: exit 0; complete main-worktree suite passed, 20 files and 64 tests.
- Command: `npm run build`
- Outcome: exit 0; production build completed with 53 modules transformed. Vite retained the existing large-chunk advisory.
- Command: `git diff --check`
- Outcome: exit 0; no whitespace errors.

### Review self-check

- Deck tests inspect rendered mesh bounds and plank surface height rather than trusting group origins.
- Clearance tests independently rebuild each registered object's bounds and compare them with 1,201 dense route samples.
- The obstacle registry exactly matches the rendered trunk/rock/stone/log set.
- Mobile floors remain 56 trees and 116 undergrowth objects; the route end remains exactly `LANDMARKS.forestEnd`.
- Tree positions are identical across independent builds and have more than 80 unique rounded X and Z values on desktop.
- Mobile retains all six named crown silhouettes.
- Material sets are disjoint from the caller palette and from another jungle world built with the same caller palette.
