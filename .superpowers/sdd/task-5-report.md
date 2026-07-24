# Task 5 Report: Reordered Expedition and Continuous Integration

## Status

Complete.

## Commit

- `c906c0e7c0031888f78dc4bf0e2cde4c09136375` — `Reorder expedition through mountain water forest`

## Files

- `src/three/expeditionController.js`
- `src/three/expeditionController.test.js`
- `src/three/journeyData.js`
- `src/three/journeyData.test.js`
- `src/three/indiaJourney.js`
- `src/three/indiaJourney.test.js`
- `src/journey/chapters.js`
- `src/journey/chapters.test.js`
- Deleted `src/three/iceWorld.js`
- Deleted `src/three/iceWorld.test.js`

## Implementation

- Replaced the Ambassador/jungle-first and ice finale state machine with the required mountain trek, mountain-to-water, water boat, water-to-forest, forest jeep, and contact ranges.
- Added `getExpeditionTransition(state)` with exactly `mountain`, `water`, and `forest` world keys; exactly `trekker`, `boat`, and `jeep` transport keys; normalized smootherstep transport handoffs; authoritative biome weights; and a camera handoff blend.
- Constructed the hill, water, and jungle worlds once without translating their authoritative shared coordinates.
- Attached the four-person trekking party, boat, and jeep to one transport root. The outgoing transport is held at its route end, the incoming transport at its route start, and the trekking party remains separated with its guide at the mountain landing.
- Kept every biome and transport root visible while applying isolated material opacity, light-intensity, depth-write, and shadow-caster blending. Caller-owned shared materials remain unchanged.
- Replaced legacy Ambassador, travel-route, monument-region, and ice runtime wiring with the expedition controller.
- Added smootherstep camera keyframes before, at, and after both shared landings.
- Added frame-rate-independent position/target damping using `1 - Math.exp(-delta * 4.5)`.
- Blended scene background, fog color/range, exposure, hemisphere intensity, and directional-light color from the controller's biome weights.
- Set the camera far plane to `420`, retained long fog ranges, prewarmed with `renderer.compile(scene,camera)`, retained WebGL context-loss fallback, and made disposal idempotent for all constructed worlds, transports, geometries, and materials.
- Added mobile framing for the party, boat, and jeep. Party framing uses the four moving members rather than the stationary party root.
- Reordered the plan presentation to mountain on foot, water by boat, and forest by jeep while retaining all existing overlay structures and menu contracts.

## TDD

### Initial RED

- Command: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js`
- Outcome: exit 1. The local suites failed on 12 intended assertions: legacy Ambassador/jeep/boat/ice ordering, missing `getExpeditionTransition`, legacy `jungle/water/ice` world keys, and missing mobile/damping/atmosphere helpers. The run reported 47 passing tests from unaffected and discovered worktree suites.

### Additional regression RED/GREEN cycles

- Mobile party framing RED: `npm test -- src/three/indiaJourney.test.js --exclude '.worktrees/**'` failed 1/5 because `getTransportWorldPosition` did not exist.
- Mobile party framing GREEN: the same command passed 5/5 after framing the moving party members.
- Ghost-shadow RED: `npm test -- src/three/expeditionController.test.js --exclude '.worktrees/**'` failed 1/6 because zero-opacity forest meshes still cast shadows.
- Ghost-shadow GREEN: the same command passed 6/6 after shadow state was captured and weighted.
- Landing-formation RED: `npm test -- src/three/expeditionController.test.js --exclude '.worktrees/**'` failed 1/7 because all party members clamped onto the route endpoint.
- Landing-formation GREEN: the same command passed 7/7 after reserving the party's route span while holding the guide at the landing.

## Final Verification

- Command: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`
- Outcome: exit 0; 8 files and 71 tests passed, including Vitest's separately discovered nested-worktree copies. The four local Task 5 suites passed 25/25.

- Command: `npm test -- --exclude '.worktrees/**'`
- Outcome: exit 0; the complete main-worktree suite passed, 19 files and 71 tests.

- Command: `npm run build`
- Outcome: exit 0; production build completed with 51 modules transformed. Vite retained the repository's existing advisory for the 701.61 kB JavaScript chunk.

- Command: `git diff --check`
- Outcome: exit 0; no whitespace errors.

- Command: runtime legacy import/search and ice-file absence checks
- Outcome: exit 0; no Ambassador, ice-world, travel-route, or journey-ground runtime wiring remains in the Task 5 integration, and both ice-world files are absent.

## Self-review

- Confirmed the public transition object uses the exact required key order.
- Confirmed both handoffs overlap adjacent transport opacities across their complete `.28-.42` and `.60-.74` ranges.
- Confirmed hill/water and water/forest route endpoints share the authoritative landmark coordinates.
- Confirmed the party, boat, and jeep are siblings in a common coordinate space and remain parked continuously across phase boundaries.
- Confirmed all biome roots stay visible and zero-weight geometry cannot leave ghost shadows or depth occlusion.
- Confirmed blend state is captured once and shared caller materials are neither mutated nor disposed by the controller.
- Confirmed mobile party framing follows the moving four-person formation rather than the stationary party container.
- Confirmed menu jumps only update journey progress; camera position and target continue through exponential damping.
- Confirmed controller and renderer disposal are idempotent and context-loss fallback remains connected.
- Confirmed the commit contains only the ten Task 5 source/test paths from the brief.

## Concerns

- No Task 5 implementation blocker remains.
- The production build still reports the pre-existing large-chunk advisory.
- Root `npm test` still discovers nested `.worktrees/**`; use `npm test -- --exclude '.worktrees/**'` for the isolated main-worktree suite.

## Task 5 Review Follow-up

### Commit

- `11319d809f5380e77990e9335d32b5aed8a7148e` — `Fix expedition integration review findings`

### Findings addressed

- Menu jumps now animate journey progress itself with a smootherstep `requestAnimationFrame` tween. The tween moves through the intermediate mountain-to-water and water-to-forest weights, updates the corresponding scroll position, and retains a shorter reduced-motion duration.
- Removed the remaining customer-facing Himalaya semantics from the final journey stop, first plan, and booking destination placeholder.
- Aligned the mountain route endpoint, landing deck, trekking guide, water route start, and staged boat to the same authoritative three-dimensional mountain-landing coordinate. The mountain landing deck now matches the water jetty footprint and deck-top elevation.
- Plan-overlay selection now follows the journey's authoritative `.42` and `.74` biome boundaries through `getJourneyState(progress).planFocus`.
- Jeep grounding now measures the constructed tire bounds and stores a derived ground offset; it no longer relies on a guessed chassis constant.
- Jungle palette cloning now clones only materials that are actually attached to the active scene, preventing unattached palette-clone leaks.

### Review TDD

- Expanded review RED command:
  `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx src/three/hillWorld.test.js src/three/expeditionVehicles.test.js`
- Initial outcome: exit 1 with 12 failures and 101 passes. Ten local failures reproduced the requested review findings; the other two came from the separately discovered nested worktree's duplicate-React invalid-hook failure.
- Added regressions for animated intermediate journey progress, authoritative plan focus, customer-facing terminology, full-3D landmark alignment, rendered deck alignment, measured tire grounding, and controller material-clone attachment.

### Review verification

- Exact expanded command without an exclude:
  `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx src/three/hillWorld.test.js src/three/expeditionVehicles.test.js`
- Outcome: the local requested review suites all passed. Vitest also discovered nested `.worktrees/continuous-landscape` copies, yielding 15 passing files and 111 passing tests, with only its two duplicate-React invalid-hook tests failing.

- Isolated expanded command:
  `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx src/three/hillWorld.test.js src/three/expeditionVehicles.test.js --exclude '.worktrees/**'`
- Outcome: exit 0; 8 files and 47 tests passed.

- Full isolated main-worktree command:
  `npm test -- --exclude '.worktrees/**'`
- Outcome: exit 0; 19 files and 79 tests passed.

- Build command: `npm run build`
- Outcome: exit 0; 51 modules transformed. Vite retained the repository's existing greater-than-500 kB chunk advisory; the generated JavaScript chunk was 702.26 kB (196.87 kB gzip).

- Static checks: `git diff --check` passed, and a targeted active-runtime/customer-facing search found no `Himalaya`, `snow`, or standalone `ice` semantics in the reviewed journey data, plans, booking overlay, chapter overlay, or journey shell.

### Review self-review

- Confirmed menu progress is never hard-set to the destination before the tween and crosses both transition intervals monotonically.
- Confirmed reduced-motion navigation remains animated while using the shorter specified duration.
- Confirmed the route, deck, guide, and boat assertions compare full three-dimensional positions rather than horizontal proximity alone.
- Confirmed deck-top tests derive actual mesh bounds and jeep grounding tests derive actual tire bounds.
- Confirmed plan selection is sourced from the same state machine that drives the biome blend.
- Confirmed every caller-material clone created by controller setup is reachable from an active scene object.
- Confirmed the review commit contains only the 17 implementation and regression-test files required by the six findings.

### Review concerns

- No review implementation blocker remains.
- The exact unexcluded Vitest command still discovers `.worktrees/continuous-landscape` and mixes its React copy into the root test process. The isolated main-worktree command is fully green.
- The production build still reports the pre-existing large-chunk advisory.

## Task 5 Visible-Geometry Follow-up

### Commit

- `2c0ee5595554c5ad926ccfb1ef6d93cd61f2fd26` — `Plant trekkers and stage boat at landing`

### Root cause and implementation

- Trekking-member group origins were being placed directly on the route height even though each member's articulated boot geometry extended below that origin. The updater now measures the actual current world-space boot bounds relative to each member root after limb articulation and raises the root so the boot bottom meets the intended contact surface.
- The controller measures the mountain deck's visible plank surface. Members within the deck footprint use the plank top as their contact height, while members still on the trail use the authoritative route height.
- The previous group-origin-as-contact wording was removed; the regression contract explicitly refers to member roots and visible boot bottoms.
- The boat was previously staged at route progress zero, directly through the centered dock geometry. The controller now measures the staged hull and both overlapping mountain landing decks, then derives the minimum lateral route-frame offset that clears both with a `0.24` world-unit separating-axis margin.
- The measured dock offset is smoothly reduced with smootherstep from full offset at boat progress `0` to the unchanged authoritative water route at progress `.12`. Its derivative is zero at the staging point, preventing a handoff snap.
- Shared landmark and route semantics remain unchanged: both landing roots and both route endpoints retain the exact authoritative mountain-landing coordinate.

### Geometry TDD

- RED command:
  `npm test -- src/three/expeditionController.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js src/three/expeditionVehicles.test.js src/three/waterWorld.test.js --exclude '.worktrees/**'`
- Initial outcome: exit 1; 4 focused regressions failed and 31 tests passed. The failures showed visible boot geometry missing the contact surface, boot-bottom metadata absent, the controller boat beginning with zero lateral offset, and the vehicle updater ignoring a requested dock offset.
- The first deck assertion revealed that landing posts extend above the walking surface. The regression was corrected to measure the actual BoxGeometry planks rather than treating the full deck group's maximum bound as the deck top; the visible-geometry failure remained RED.

### Geometry verification

- Focused command:
  `npm test -- src/three/expeditionController.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js src/three/expeditionVehicles.test.js src/three/waterWorld.test.js --exclude '.worktrees/**'`
- Final outcome: exit 0; 5 files and 35 tests passed.

- Full isolated main-worktree command:
  `npm test -- --exclude '.worktrees/**'`
- Final outcome: exit 0; 19 files and 81 tests passed.

- Build command: `npm run build`
- Final outcome: exit 0; 51 modules transformed. The generated JavaScript chunk was 703.57 kB (197.33 kB gzip), with Vite's existing greater-than-500 kB advisory.

- Fresh world-space measurement at expedition progress `.34` with reduced motion:
  - guide boot-bottom minus mountain plank-top: `1.1102230246251565e-16`
  - staged hull clearance from hill deck AABB: `0.7027489114589153`
  - staged hull clearance from water jetty AABB: `0.23999999999999921`
  - derived lateral dock offset: `4.602834232523054`

- `git diff --check` passed.
- A targeted search found no remaining `feet` or `party feet` terminology in the controller, trekking-party, vehicle, hill, or water implementation/tests.

### Geometry self-review

- Confirmed boot bounds are measured after the current leg rotations, so walking animation cannot reintroduce embedding or floating.
- Confirmed a per-member measured `bootBottomOffset` matches each visible boot Box3 relative to that member root.
- Confirmed the guide's visible boots meet the actual plank surface during the mountain-to-water handoff.
- Confirmed the staged hull's world-space Box3 intersects neither the hill deck nor the water jetty.
- Confirmed the dock offset decreases monotonically, changes negligibly between boat progress `0` and `.0001`, and is exactly merged onto the route by `.12`.
- Confirmed the focused test samples the geometry and merge through the real expedition controller as well as the boat updater in isolation.
- Confirmed the commit contains only the six scoped controller, party, boat, and regression-test files.

### Geometry concerns

- No visible-geometry blocker remains.
- The production build retains the repository's existing large-chunk advisory.
