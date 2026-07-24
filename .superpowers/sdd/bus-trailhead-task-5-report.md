# Task 5 Report: Continuous Desktop/Mobile Opening Cameras

## Status

Implemented the approved desktop trailhead camera beats, the mobile opening hold-to-trekker blend, projected object framing evidence, and locked retained expedition/content boundaries.

## TDD evidence

### Journey-data RED

Command:

`npm test -- --run src/three/journeyData.test.js`

Result: expected failure, 1 failed / 15 passed. The new opening assertion received the old `[5,15,18]` camera instead of `[8.5,3.8,46]`.

### Journey-data GREEN

Command:

`npm test -- --run src/three/journeyData.test.js`

Result: 16/16 passed after replacing only the opening keyframes and returning exact keyframe copies at exact progress stops.

The exact-copy branch was needed because interpolating at `.08` produced `2.5999999999999996` rather than the required public value `2.6`. Between-keyframe interpolation is unchanged.

### India-journey RED

Command:

`npm test -- --run src/three/indiaJourney.test.js`

Result: expected failure, 4 failed / 11 passed. Failures identified the missing camera resolver, projected-bounds helper, and opening QA evidence.

### India-journey GREEN

Command:

`npm test -- --run src/three/indiaJourney.test.js`

Result: 15/15 passed.

### Focused camera/QA/chapter gate

Command:

`npm test -- --run src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`

Result: 3 files passed, 37/37 tests passed.

### Full suite

Command:

`npm test`

Result: 23 files passed, 146/146 tests passed.

`git diff --check` also passed with no whitespace errors. A production build was not run because the task brief does not require one.

## Files

- `src/three/journeyData.js`
- `src/three/journeyData.test.js`
- `src/three/indiaJourney.js`
- `src/three/indiaJourney.test.js`
- `src/journey/chapters.test.js`

This report is the only additional task artifact. `src/journey/chapters.js`, `scripts/visual-qa.mjs`, component files, world files, and planning/progress artifacts were not modified by Task 5.

## Self-review

- Desktop opening keyframes are exact at `0`, `.08`, `.12`, and `.18`.
- All camera keyframe values from `.28` onward are unchanged.
- Dense desktop sampling keeps each camera/target rail step at or below `.8`.
- Expedition phase boundaries remain exact at `.28`, `.42`, `.60`, `.74`, and `.94`.
- Content ranges remain `0–.14`, `.14–.28`, `.28–.94`, and `.94–1`.
- Mobile holds the coach composition through `.045`, blends with `smootherstep`, and equals existing trekker framing at `.12`.
- Existing mobile boat and jeep framing remains unchanged.
- The resolver is used for both initial camera setup and animation frames.
- Pointer response, damping, the `.78` maximum runtime camera step, atmosphere, and no-audio behavior remain unchanged.
- Projected bounds retain the required public return contract and fail closed for absent, hidden, or empty objects.
- Opening QA evidence includes departure weight, coach mount/render/full-frame state and world matrix, plus fully framed guide/tourist counts.
- Visual-debug discovery includes coach and trailhead objects without changing the visual-QA harness.

## Concerns

None. Three.js projection is based on the world-space `Box3` corners, with frustum intersection determining `rendered` and all NDC axes determining `fullyFramed`, as required.

## Review blocker fix: fail-closed projected visibility

### RED

Command:

`npm test -- --run src/three/indiaJourney.test.js`

Result: expected failure, 1 file failed with 4 failed / 15 passed. The new
regressions showed that a hidden only mesh, a zero-opacity only mesh, and a
`material.visible=false` only mesh each incorrectly reported
`rendered:true` and `fullyFramed:true`. A hidden oversized descendant also
incorrectly expanded coverage from `0.040404` to `1` and changed
`fullyFramed` from `true` to `false`.

### GREEN

Command:

`npm test -- --run src/three/indiaJourney.test.js`

Result: 1 file passed, 19/19 tests passed after projected bounds were changed
to union only genuinely renderable mesh geometry bounding boxes transformed
by each mesh's `matrixWorld`.

### Task 5 focused gate

Command:

`npm test -- --run src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`

Result: 3 files passed, 41/41 tests passed.

### Review-fix files changed

- `src/three/indiaJourney.js`
- `src/three/indiaJourney.test.js`
- `.superpowers/sdd/bus-trailhead-task-5-report.md`

### Review-fix concerns

None. Projected visibility now ignores meshes hidden by their hierarchy,
materials hidden with `material.visible=false`, and materials at negligible
opacity. Hidden descendants cannot enlarge the reported object bounds.
