# Task 2 Report: Lush realistic hill-country world

## Outcome

Implemented `createHillWorld(materials, quality)` and `updateHillWorld(world, elapsed)` in `src/three/hillWorld.js`, with a focused behavioral suite in `src/three/hillWorld.test.js`.

Product commit: `1170249 Build realistic lush hill country`.

The world now provides:

- A 64x72 displaced terrain mesh with 96x108 desktop and 56x72 mobile segments.
- Grass, earth, and exposed-rock vertex colors selected from the vertically scaled terrain slope, using the specified colors and a rough, smooth-shaded vertex-color material.
- Three non-conical displaced terrain ribbons at Z -38, -50, and -62, with progressively lower saturation and opacity.
- Deterministic clustered broadleaf and pine-like vegetation placed only below visual slope 1.1.
- Deterministic rock outcrops placed only at or above visual slope 1.1.
- A 30-control-point terrain-clamped route and narrow earth ribbon from Z 16 to Z -30.
- A timber-and-stone landing at the low route start and a wood-and-stone lodge at the final route anchor.
- Eight translucent mist volumes placed in local terrain depressions; `updateHillWorld` changes only each volume's X coordinate.
- Required `userData.route`, `userData.heightAt`, `userData.mist`, `userData.landing`, and `userData.copyAnchor` fields.

The ice-world files remain temporarily because `expeditionController.js` still imports them. The approved overall plan explicitly migrates that caller and deletes both ice files in Task 6.

## TDD evidence

### RED 1: public module contract

Command:

```text
npm test -- src/three/hillWorld.test.js
```

Observed failure before production code existed:

```text
FAIL src/three/hillWorld.test.js
Error: Failed to resolve import "./hillWorld" from "src/three/hillWorld.test.js". Does the file exist?
Test Files 1 failed (1)
```

### GREEN 1: hill-world contract

Command:

```text
npm test -- src/three/hillWorld.test.js
```

Observed after implementation:

```text
Test Files 1 passed (1)
Tests 4 passed (4)
```

### RED 2: mist valley semantics

During self-review, a new assertion checked that every mist center is below the mean height of four surrounding samples. It failed against the first placement:

```text
FAIL hill world > drifts exactly eight mist volumes horizontally
AssertionError: expected 13.275691626960503 to be less than 12.44646037840836
Tests 1 failed | 3 passed (4)
```

The volumes were moved to deterministic local depressions.

### GREEN 2: focused terrain and hill suite

Command:

```text
npm test -- src/three/hillWorld.test.js src/three/terrain.test.js
```

Observed:

```text
Test Files 2 passed (2)
Tests 7 passed (7)
```

## Final verification

### Full automated suite

Command:

```text
npm test
```

Observed:

```text
Test Files 19 passed (19)
Tests 46 passed (46)
```

### Production build

Command:

```text
npm run build
```

Observed: Vite transformed 52 modules and completed the production build successfully. It emitted the pre-existing advisory that the main minified chunk is above 500 kB; this is non-failing and outside Task 2.

### Static audit

- `git diff --check`: clean.
- No `Math.random`, `ConeGeometry`, glacier, snow, or ice-name usage in `hillWorld.js`.
- Task scope contains only `src/three/hillWorld.js` and `src/three/hillWorld.test.js`; `.superpowers/sdd` is a coordination/evidence directory and is not included in the product commit.

## Self-review

- All named objects in the brief exist.
- All forbidden ice object names are absent from the hill world.
- Desktop/mobile resolution minimums are asserted.
- All three terrain color bands are asserted.
- Ridge shape, count, positions, and opacity ordering are asserted.
- Forest and rock slope constraints are asserted.
- Route control count, terrain following, landing/lodge anchors, and copy anchor are asserted.
- Mist count, valley placement, horizontal-only animation, and non-mist immobility are asserted.

## Concerns

None blocking. The existing Vite chunk-size advisory remains. Ice-world deletion is deliberately deferred until its controller caller migrates in Task 6.

---

## Reviewer-finding follow-up

Follow-up product commit: `0b56dbb Harden hill world terrain integration`.

### Findings verified

- The original 5.3x4 lodge foundation used only the route endpoint's center height. Sampling its footprint found terrain from `7.8645` to `13.1157`, a `5.2512`-unit range, so the box necessarily floated on one side and clipped on the other.
- Trees, rocks, the landing, and the lodge directly referenced materials from the caller's `createMaterials()` palette. Task 6 opacity changes would therefore leak into other worlds using that palette.
- Mist volumes started at `baseX`, while the update equation evaluated to `baseX + sin(phase) * amplitude` at elapsed zero.
- The initial terrain-color test established only that all three colors appeared; it did not lock down either exact threshold boundary.

### Follow-up RED

Regression tests were added before production changes for all four findings.

Command:

```text
npm test -- src/three/hillWorld.test.js
```

Observed:

```text
Test Files 1 failed (1)
Tests 4 failed | 3 passed (7)

maps the exact slope thresholds to grass, earth and rock
  TypeError: getHillTerrainColor is not a function

owns materials independently of the shared palette and other hill worlds
  AssertionError: expected false to be true

grades the complete lodge foundation footprint to the terrain
  AssertionError: expected undefined to be truthy

drifts exactly eight mist volumes horizontally
  expected -1.7079362432685121 to be close to -2
```

### Follow-up implementation

- Added `getHillTerrainColor(slope)` and routed vertex coloring through it. Exact behavior is grass below `.8`, earth at `.8` through values below `1.45`, and rock at `1.45` and above.
- Cloned only the six supplied materials actually used by each hill-world instance. No material in one hill world aliases the shared palette or another hill world.
- Split the terrain sampler into a base height and a lodge-grade blend. The complete foundation footprint plus a mesh-cell safety margin is flat at the lodge grade, with smooth transition margins back to the analytic terrain. The named foundation's lower face sits exactly on that grade.
- Made mist motion phase-relative: `sin(elapsed * rate + phase) - sin(phase)`. Updating at elapsed zero now preserves the authored position.

### Isolated GREEN evidence

Each regression passed independently after its corresponding change:

```text
npm test -- src/three/hillWorld.test.js -t "maps the exact slope thresholds"
Tests 1 passed | 6 skipped (7)

npm test -- src/three/hillWorld.test.js -t "owns materials independently"
Tests 1 passed | 6 skipped (7)

npm test -- src/three/hillWorld.test.js -t "grades the complete lodge foundation"
Tests 1 passed | 6 skipped (7)

npm test -- src/three/hillWorld.test.js -t "drifts exactly eight mist volumes"
Tests 1 passed | 6 skipped (7)
```

The first foundation measurement exposed a test-fixture issue: `Box3.setFromObject()` measured before the detached world's parent matrices were updated. After `world.updateMatrixWorld(true)`, it measured the true world-space foundation base and the regression passed. This changed only test setup, not the production grading fix.

### Combined GREEN and final verification

Focused command:

```text
npm test -- src/three/hillWorld.test.js src/three/terrain.test.js
```

Observed:

```text
Test Files 2 passed (2)
Tests 10 passed (10)
```

Full command:

```text
npm test
```

Observed:

```text
Test Files 19 passed (19)
Tests 49 passed (49)
```

Build command:

```text
npm run build
```

Observed: Vite transformed 52 modules and completed successfully. The existing non-failing main-chunk-size advisory remains.

### Follow-up self-review

- The threshold helper is checked immediately below and exactly at both `.8` and `1.45` boundaries.
- Every generated main-terrain vertex is recomputed from `userData.heightAt` and checked against its expected grass/earth/rock color.
- The lodge test samples a 5x5 footprint grid against the foundation base and also checks more than 20 actual terrain-mesh vertices beneath the foundation.
- The flat grade extends beyond the foundation by at least one desktop terrain cell before blending, preventing edge triangles from reintroducing gaps or clipping.
- Every material reached by traversing one hill world is disjoint from the caller palette and from a second hill world built from the same palette.
- Only used palette entries are cloned, so there are no unattached material clones to leak.
- `updateHillWorld(world, 0)` preserves all initial mist X positions, while a later update still changes only X.
- `git diff --check` is clean.

### Follow-up concerns

None blocking. The non-failing Vite chunk-size advisory and the planned Task 6 ice-world migration remain unchanged.
