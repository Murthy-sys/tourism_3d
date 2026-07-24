# Task 4 Report: Coach-Side Trekking Departure

## Status

Implemented the standing-to-walking party blend and mounted the procedural coach as static mountain scenery. Existing water/forest vehicle behavior and phase boundaries remain unchanged.

## TDD Evidence

### Party RED

Command:

```text
npm test -- --run src/three/trekkingParty.test.js
```

Result: expected failure, exit code 1. Two of seven tests failed:

- Standing members remained on route coordinates instead of the supplied trailhead poses.
- `party.userData.departureWeight` was undefined.

The other five party tests passed, confirming the failures were specific to the missing departure behavior.

### Party GREEN

The first GREEN attempt exposed a signed-zero edge case: exact standing limb assertions received `-0` from negated zero swing. The implementation now canonicalizes the counter-swing to `0` when the departure weight is zero.

Command:

```text
npm test -- --run src/three/trekkingParty.test.js
```

Result: exit code 0; 1 file passed, 7 tests passed.

### Controller RED

Command:

```text
npm test -- --run src/three/expeditionController.test.js
```

Result: expected failure, exit code 1. Four of 21 tests failed because:

- `transition.opening` did not exist.
- `controller.scenery.coach` did not exist in the three coach-related tests.

The existing 17 controller tests passed.

### Controller GREEN

Command:

```text
npm test -- --run src/three/expeditionController.test.js
```

Result: exit code 0; 1 file passed, 21 tests passed.

## Dependency Suite

Command:

```text
npm test -- --run src/three/trekkingParty.test.js src/three/expeditionController.test.js src/three/expeditionVehicles.test.js src/three/waterWorld.test.js src/three/jungleWorld.test.js
```

Result: exit code 0; 5 files passed, 68 tests passed.

## Full Suite

Command:

```text
npm test -- --run
```

Result: exit code 0; 23 files passed, 139 tests passed.

## Files Changed

- `src/three/trekkingParty.js`
- `src/three/trekkingParty.test.js`
- `src/three/expeditionController.js`
- `src/three/expeditionController.test.js`

This report was added at `.superpowers/sdd/bus-trailhead-task-4-report.md` as requested. No plan, specification, progress, camera, or QA files were modified by this task.

## Implementation and Self-Review

- `updateTrekkingParty` accepts the optional departure blend while omitted options preserve fully walking behavior.
- Standing poses are cloned into party user data and the stored departure weight is clamped.
- Position, shortest-path heading, walking amplitude, secondary motion, and boot grounding blend from planted poses into the guide-led route.
- Reduced motion suppresses idle and secondary sway without suppressing scroll-controlled route departure.
- Opening helpers map `.045` through `.12` to the standing departure and `.12` through `.28` to the existing mountain landing tail.
- `getExpeditionTransition` adds only `opening.departureWeight`; transport keys remain exactly `trekker`, `boat`, and `jeep`.
- The coach is attached to the mountain trailhead before root collection, shared-material isolation, and blend-state capture.
- The coach is returned only through `scenery.coach`; it is not added to `worlds`, `transports`, `transportRoot`, or `roots`.
- Coach ownership through the mountain root gives single, idempotent disposal.
- Boat and jeep route-progress calls and all `.28`, `.42`, `.60`, `.74`, and `.94` phase boundaries are unchanged.
- `git diff --check` passed.

## Concerns

None. The working tree contained unrelated pre-existing `.superpowers/sdd` changes and artifacts; they were left untouched and will not be included in the task commit.

## Commit

SHA: `ce33d03`

Subject: `Stage coach-side trekking departure`
