# Task 6 Mountain-Entry Framing Fix

## Root cause

At desktop progress `0.12`, the production controller is healthy:

- `opening.departureWeight` is exactly `1`.
- The trekking transport is fully weighted, mounted, and ancestor-visible.
- The guide and three tourists remain intentionally distributed along the
  mountain route. Their world-space roots are:
  - guide: `[2.000478, 3.019853, 22.005837]`
  - tourist 1: `[2.392626, 1.609470, 25.698582]`
  - tourist 2: `[3.006044, 0.614809, 29.476477]`
  - tourist 3: `[3.153328, 0.314891, 33.421040]`

The old desktop frame was the fault. Its camera
`[7, 8.4, 30.5]` sat inside the 11.4-unit-long procession and targeted
`[2, 4.2, 20]`, near the lead guide rather than the party centerline.
Production projection evidence was:

- guide: rendered and fully framed
- tourist 1: rendered but clipped at NDC `minY=-1.355235`
- tourist 2: not rendered, NDC `minY=-3.377131`
- tourist 3: not rendered, NDC `minY=-27.840340`

This rules out controller visibility and a bad party layout. The camera
keyframe/root targeting was the cause.

## RED

Added a regression to `src/three/indiaJourney.test.js` that creates the real
desktop expedition controller, updates the real state at `0.12`, resolves the
production camera at `1440×900`, and requires:

- `visibleMembers: {guides: 1, tourists: 3}`
- `opening.fullyFramedMembers: {guides: 1, tourists: 3}`

Command:

`npm test -- --run src/three/indiaJourney.test.js`

Result: expected failure, 1 failed / 19 passed. The received evidence was
`visibleMembers: {guides: 1, tourists: 1}` and
`fullyFramedMembers: {guides: 1, tourists: 0}`.

## Minimal fix

Changed only the `0.12` desktop keyframe to:

- camera: `[8, 7, 40]`
- target: `[2.6, 1.9, 28.5]`

This keeps the camera behind the last tourist and targets the measured party
centerline. Because that increases the distance to the retained `0.18`
keyframe, only the `0.12 → 0.18` segment uses linear interpolation. All other
segments retain smootherstep, and all keyframes at `0.18` and `>=0.28` remain
unchanged.

## GREEN and numerical proof

At the repaired frame, every member is rendered and fully framed:

- guide NDC Y: `[0.359224, 0.626645]`
- tourist 1 NDC Y: `[0.048897, 0.380979]`
- tourist 2 NDC Y: `[-0.351439, 0.053552]`
- tourist 3 NDC Y: `[-0.865200, -0.273300]`

The complete dense rail's measured maximum adjacent jump is `0.660527` at
progress `0.559`, below the existing `0.8` limit.

Focused command:

`npm test -- --run src/three/journeyData.test.js src/three/indiaJourney.test.js src/three/expeditionController.test.js`

Result: 3 files passed, 57/57 tests passed.

## Changed files

- `src/three/journeyData.js`
- `src/three/journeyData.test.js`
- `src/three/indiaJourney.test.js`
- `.superpowers/sdd/bus-trailhead-task-6-framing-fix-report.md`

No route, controller, party, component, or QA-harness source was changed.
Nothing was staged or committed.

## Concerns

The parent agent requested that the combined browser capture remain in the
main Task 6 run. This subtask therefore provides exact production-controller
projection evidence rather than a standalone screenshot. The browser
`mountain-entry` capture at desktop `1440×900` remains the final runtime gate.
