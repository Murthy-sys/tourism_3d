# Task 3 — continuous trailhead-to-mountain route

## Scope

- Updated `src/three/hillWorld.js`
- Updated `src/three/hillWorld.test.js`
- Updated `src/three/trekkingParty.js`

## TDD evidence

### RED

Command:

```sh
npm test -- --run src/three/hillWorld.test.js
```

Result: failed as expected: 2 of 8 tests failed. The extended-route assertion received an undefined `routeProgress`; the expanded-terrain assertion received 13,673 vertices instead of 20,769. The existing 6 hill-world tests passed.

### GREEN

Command:

```sh
npm test -- --run src/three/terrain.test.js src/three/trailhead.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js
```

Result: 4 test files passed, 19 tests passed.

## Full-suite evidence

Command:

```sh
npm test
```

Result: 23 test files passed, 132 tests passed (7.45 s).

## Implementation

- Replaced the mountain-only route with one centripetal Catmull-Rom route through `trailheadStart`, `mountainEntry`, `mountainStart`, and `mountainLanding`.
- Exposed arc-length `routeProgress` and retained the existing public hill-world creation/update APIs.
- Expanded desktop and mobile terrain to the requested dimensions and segment counts.
- Mounted the existing trailhead clearing and exposed it in hill-world user data.
- Added the frozen standing-pose export for the later departure-animation task.

## Self-review

- Confirmed the specified staged segment and closest-progress calculations are used.
- Confirmed hill-world tests retain ridge heightfield, water destination, terrain material/detail, landing alignment, foreground rock, and shoreline regressions.
- Confirmed the diff is limited to the three requested source files; unrelated pre-existing `.superpowers/sdd` changes remain unmodified.
- `git diff --check` passed.

## Concerns

- No known concerns. Departure animation and controller/camera integration were intentionally not added; they remain for later tasks.
