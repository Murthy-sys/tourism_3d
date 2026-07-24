# Task 4 Report: Dense forest and physical marsh landing

## Outcome

Implemented the deterministic dense jungle, undergrowth layers, marsh edge, and route-aligned timber landing in `src/three/jungleWorld.js`, with contract coverage in `src/three/jungleWorld.test.js`.

- Product commit: `e727b09` (`Densify forest and add marsh landing`)
- Preserved interfaces: `createJungleWorld(materials, quality)` and `world.userData.route`
- Added named groups: `jungle-undergrowth`, `jungle-vines`, `jungle-fallen-timber`, `forest-marsh-edge`, and `forest-landing`
- Added `world.userData.landing`, referencing the named landing group

## TDD evidence

### RED

Extended `jungleWorld.test.js` before modifying production code, then ran:

```text
npm test -- src/three/jungleWorld.test.js
```

Observed the expected three contract failures:

```text
Test Files 1 failed (1)
Tests 3 failed (3)

contains dense layered vegetation, timber, marsh edge and landing
  expected undefined to be truthy

keeps the mobile forest dense enough for a continuous canopy
  expected 10 to be greater than or equal to 32

aligns the physical landing with the jeep route endpoint
  Cannot read properties of undefined (reading 'position')
```

This confirmed that the new named layers, density, and landing reference did not exist before implementation.

### GREEN

The first implementation run reached a JavaScript parse error caused by one missing closing parenthesis in the nested landing-pile loop. `node --check` identified the exact line; the isolated syntax correction was applied without changing the tests.

The required focused verification then passed:

```text
npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js
Test Files 2 passed (2)
Tests 8 passed (8)
```

## Implementation review

- Replaced index-row tree placement with a deterministic index-and-salt hash sampler.
- Candidate placement reserves a sampled corridor around the full jeep route.
- Canopy candidates use a marsh-proximity density factor, producing progressively fewer trees near the water-side endpoint.
- Desktop creates 58 trees; mobile creates 34 trees.
- Every quality includes all six crown silhouettes across icosahedral, conical, broad spherical, dodecahedral, layered, and octahedral forms.
- Trees have tapered trunks, paired branch forks, deterministic yaw, crown selection, scale, and height.
- The undergrowth layer contains deterministic fern, broad-leaf, and grass-clump geometry: 243 meshes on desktop and 120 on mobile.
- Dedicated vine and fallen-timber groups scale their counts down for mobile.
- The marsh edge extends beyond the route endpoint with dark soil, shallow reflective pools, reeds, exposed roots, and wet clear-coated stones.
- The timber landing is oriented to the route tangent and placed 1.6 world units beyond the endpoint, inside the six-unit handoff contract.
- Existing rocks, puddles, mist, ranger outpost, lighting, copy anchor, and track interfaces remain present.
- No vehicle or UI files were changed.

## Final verification

Focused contract and vehicle suite:

```text
npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js
Test Files 2 passed (2)
Tests 8 passed (8)
```

Full automated suite:

```text
npm test
Test Files 20 passed (20)
Tests 57 passed (57)
```

Production build:

```text
npm run build
52 modules transformed
Build completed successfully in 1.60s
```

Static checks:

- `node --check src/three/jungleWorld.js`: passed.
- `git diff --check`: passed.
- `git diff --cached --check`: passed before commit.
- Staged scope contained exactly the two Task 4 source/test files.

## Self-review

- Re-read every Task 4 acceptance item against the final diff.
- Verified all five required group names and the `userData.landing` identity in tests.
- Verified desktop/mobile tree and undergrowth minimums in tests.
- Verified route-to-landing distance in tests.
- Confirmed the fallback placement is also hash-based, so no index-row layout remains.
- Confirmed the forest route is created once and shared by the track and `world.userData.route`.
- Confirmed internal materials are reachable from world meshes and therefore cleaned by the existing `disposeObject3D` traversal.
- Confirmed the product commit changes no vehicle, controller, or UI file.

## Concerns

No Task 4 functional concerns. The production build retains the repository's non-failing large-chunk advisory (`694.08 kB` main JavaScript bundle), which is outside this task's scope.

---

## Reviewer fix: jungle material isolation

- Follow-up commit: `72737e8` (`Isolate jungle world materials`)
- Finding: trees, fallen timber, rocks, puddles, the landing, and the outpost directly reused seven materials from the caller palette. Disposing or fading the jungle could therefore mutate materials still used by the jeep or later zones.

### Follow-up RED

Added a material-identity regression before changing production code. It collects every material reachable from two mobile jungle instances and a jeep created from the same palette, then checks that each jungle is disjoint from the caller palette, from the other jungle, and from the representative transport.

```text
npm test -- src/three/jungleWorld.test.js
Test Files 1 failed (1)
Tests 1 failed | 3 passed (4)

owns materials independently of the shared palette, other jungles and transports
  expected false to be true
```

The failure occurred on the first caller-palette identity assertion, confirming the reported alias.

### Follow-up implementation

- Cloned exactly the seven supplied materials used by the jungle at the `createJungleWorld` boundary: `wood`, `leaf`, `leaf2`, `stone`, `water`, `sand`, and `dark`.
- Routed every jungle mesh that previously consumed caller materials through those per-world clones.
- Kept the existing custom ground, track, mist, undergrowth, marsh, and landing-plank materials per-instance as before.
- Preserved all public world interfaces, geometry, colors, density, placement, and route behavior.

### Follow-up GREEN and final verification

Focused jungle regression:

```text
npm test -- src/three/jungleWorld.test.js
Test Files 1 passed (1)
Tests 4 passed (4)
```

Full automated suite:

```text
npm test
Test Files 20 passed (20)
Tests 58 passed (58)
```

Production build:

```text
npm run build
52 modules transformed
Build completed successfully in 1.82s
```

### Follow-up self-review

- A static search confirms the caller parameter is now referenced only by the seven-entry clone expression.
- The regression proves both caller-to-jungle and jungle-to-jungle identity isolation.
- The jeep material-set assertion is a representative cross-zone integration guard for transport fading/disposal.
- Because the jungle's water clone is also disjoint from the caller palette, water-zone consumers of the shared water material cannot be mutated through the jungle puddles.
- `git diff --check` and `git diff --cached --check` passed before commit.

### Follow-up concerns

No blocking concerns. The existing non-failing Vite large-chunk advisory remains (`694.18 kB` main JavaScript bundle).
