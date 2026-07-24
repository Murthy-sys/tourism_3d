# Task 3 Report: Guide-led trekking party

## Outcome

Implemented the standalone four-person trekking party for later hill-world integration.

- Commit: `5d71031` (`Add guide-led trekking party`)
- Production module: `src/three/trekkingParty.js`
- Tests: `src/three/trekkingParty.test.js`

## TDD evidence

### RED

Created the party tests before the production module and ran:

```text
npm test -- src/three/trekkingParty.test.js
```

Vitest failed at import resolution with the expected error:

```text
Failed to resolve import "./trekkingParty"
Test Files 1 failed (1)
```

This confirmed the tests could not pass before the feature existed.

### GREEN

The first implementation run executed all five party tests. Four passed and the reduced-motion test exposed `-0` values on negatively signed limb assignments. The implementation was corrected to assign explicit zero to all limb pivots in reduced-motion mode.

The brief's focused verification then passed:

```text
npm test -- src/three/trekkingParty.test.js src/three/expeditionVehicles.test.js
Test Files 2 passed (2)
Tests 10 passed (10)
```

## Implementation review

- `createTrekkingParty(materials)` returns a named `THREE.Group` with four member roots.
- `party.userData.members` contains one guide and three tourists, with each entry limited to the documented `{role, phase, root, limbs, pole}` fields.
- The member factory creates higher-segment capsule/sphere geometry, layered shirt and jacket meshes, trousers, articulated arms and legs, boots and soles, hair, pack straps, pack body and pocket, roll mat, and planted trekking pole.
- Palette review:
  - Guide: deep green jacket and ochre pack.
  - Tourist 1: yellow jacket and navy trousers.
  - Tourist 2: rust jacket and charcoal trousers.
  - Tourist 3: teal jacket and tan trousers.
- Animation phases are exactly `[0, 1.37, 2.91, 4.42]`.
- Route offsets are exactly `[0, .055, .11, .165]` and are clamped after subtraction from progress.
- Each root uses its own sampled route point, replaces Y using `heightAt(x, z)`, and faces the sampled tangent.
- Opposite arms and legs swing from `sin(elapsed * 5.2 + phase)`; reduced motion sets every swing to zero while preserving travel and spacing.
- Each pole carries a tip anchor. After root placement and orientation, the update samples terrain at that tip's world X/Z and corrects pole Y so the tip contacts the terrain.
- Staged diff review and `git diff --cached --check` were clean before commit.

## Final verification

```text
npm test
Test Files 20 passed (20)
Tests 54 passed (54)
```

```text
npm run build
52 modules transformed
Build completed successfully in 1.55s
```

## Concerns

No Task 3 functional concerns. The production build reports the repository's existing non-fatal large-chunk warning (`688.60 kB` JavaScript bundle). This task deliberately leaves the party standalone because hill-world integration is assigned to a later task.

## Reviewer fix: route-facing orientation

- Follow-up commit: `f32117f` (`Fix trekking party route facing`)
- Defect: the yaw calculation aligned each member's local `+Z` axis with the sampled route tangent, so the model's actual local forward axis (`-Z`) faced exactly backward.

### Follow-up RED

Added a regression test that transforms `(0, 0, -1)` through each member root's world matrix and compares it with that member's own sampled curve tangent.

```text
npm test -- src/three/trekkingParty.test.js
expected -1.0000000000000002 to be greater than 0
Test Files 1 failed (1)
Tests 1 failed | 5 passed (6)
```

The dot product near `-1` confirmed a 180-degree orientation error.

### Follow-up GREEN

Changed the yaw to `atan2(-tangent.x, -tangent.z)`, which maps local `-Z` to the normalized route tangent.

```text
npm test -- src/three/trekkingParty.test.js
Test Files 1 passed (1)
Tests 6 passed (6)
```

### Follow-up verification and self-review

```text
npm test
Test Files 20 passed (20)
Tests 55 passed (55)
```

```text
npm run build
52 modules transformed
Build completed successfully in 1.55s
```

Self-review confirmed the fix is isolated to yaw orientation: route sampling and spacing, terrain planting, world-space pole correction, phase animation, and reduced-motion behavior are unchanged. `git diff --cached --check` passed before commit. No new concerns were introduced; the existing non-fatal large-bundle warning remains.
