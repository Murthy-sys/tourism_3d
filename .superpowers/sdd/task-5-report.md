# Task 5 report: connected reflective water corridor

## Status

Complete. `createWaterWorld`, `updateWaterWorld`, `world.userData.route`, `world.userData.water`, `world.userData.wake`, `copyAnchor`, the legacy named scenery, and boat-wake attachment behavior are preserved. The upgraded boat implementation was not modified.

Commit: `8401720` (`Connect water corridor to forest and hills`)

## Implementation

- Replaced rectangular shore slabs with indexed, curved bank strips whose inner-edge separation narrows from 12 units at the forest side to 5 units at the hill side.
- Added route-aligned `forest-water-landing` and `hill-water-landing` structures.
- Added transparent edge shallows, wet rocks, reeds, and tree placement weighted toward the hill landing.
- Added a low-opacity displaced `water-reflection-layer`; it and `reflective-water` animate at different frequencies and amplitudes.
- Raised shallows and banks above the reflective surface to prevent corridor edges from being visually flooded.
- Cloned all caller palette materials used by the water world and created all water-specific materials per world. No material instance is shared with the caller, another water world, jungle scenery, or expedition boat.

## TDD evidence

- RED: `npm test -- src/three/waterWorld.test.js` — 3 expected failures for missing corridor groups/reflection and shared materials.
- Additional RED from self-review: bank elevation assertion failed at `-0.08 > 0.018`, proving the reflective surface covered the new bank mesh.
- GREEN focused: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js` — 2 files, 8 tests passed.
- GREEN full: `npm test` — 20 files, 60 tests passed.
- Build: `npm run build` — succeeded; existing Vite chunk-size warning remains (`696.19 kB` minified app chunk).
- Diff validation: `git diff --check` — clean.

## Concerns

- No functional concerns found.
- The pre-existing Vite large-chunk warning is unchanged and outside Task 5 scope.

## Major-review follow-up

Commit: `38699c3` (`Expose shallows and clear landing docks`)

- Reversed both shallow strips from the land side to the water side of their bank inner edges and corrected their triangle winding. Each strip now exposes 1.35 units laterally into the channel with upward-facing normals.
- Shifted the forest landing 4 units toward the left bank and the hill landing 3.3 units toward the right bank while preserving the route endpoints. The upgraded boat hull now clears the decks by 0.497 and 0.425 units respectively.
- RED: `npm test -- src/three/waterWorld.test.js` — the lateral exposure was `0` instead of greater than `1`, and endpoint hull/deck clearance was `0` instead of greater than `0.25`.
- GREEN focused: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js` — 2 files, 10 tests passed.
- GREEN full: `npm test` — 20 files, 62 tests passed.
- Build: `npm run build` — succeeded; the existing Vite chunk-size warning remains (`696.22 kB` minified app chunk).
- Diff validation: `git diff --check` — clean.
