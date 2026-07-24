# Bus trailhead Task 6 shadow/artifact fix

Date: 2026-07-24

## Root cause

The desktop WebGL captures showed pitch-black triangular wedges converging at
the gravel turnout center and crossing the hill, coach, and party. The mobile
capture contained the same class of wedges even though mobile disables both
the renderer shadow map and the directional light's shadow casting, so the
initial shadow-only hypothesis was insufficient.

`createTurnoutGeometry` built the roughly 24-by-17-unit turnout as one
center-to-boundary triangle fan. Its center was at about 0.365 terrain units,
while boundary samples reached about 3.75 units. At triangle centroids, that
coarse fan departed from `sampleMountainHeight` by about 2.05-2.11 units,
creating giant floating facets that could occlude the scene. The index winding
also made all sampled vertex normals point downward. Finally, the gravel mesh
uniquely inherited `mesh()`'s `castShadow=true`; the other broad clearing
surface layers already disabled shadow casting. This could add projected
artifacts on desktop.

The fix retains the footprint, material, lighting, coach, and party
composition. It samples the turnout with seven mobile/eight desktop concentric
rings, winds triangles upward, and sets only the turnout surface's
`castShadow=false`. The surface still has `receiveShadow=true`.

## TDD evidence

Baseline:

```text
npm test -- src/three/trailhead.test.js
3 passed
```

RED after adding semantic-group surface contracts and turnout geometry
regressions:

```text
npm test -- src/three/trailhead.test.js
5 failed, 3 passed
```

The intended failures were:

- gravel `castShadow`: received `true`, expected `false`
- desktop centroid terrain deviation: `2.107162...`, expected `< 0.5`
- mobile centroid terrain deviation: `2.052737...`, expected `< 0.5`
- desktop/mobile normals: negative Y, expected `> 0`

Focused GREEN:

```text
npm test -- src/three/trailhead.test.js
8 passed
```

Relevant integration verification:

```text
npm test -- src/three/trailhead.test.js src/three/hillWorld.test.js src/three/expeditionController.test.js
3 test files passed; 37 tests passed
```

`git diff --check -- src/three/trailhead.js src/three/trailhead.test.js` also
completed successfully.

## Files changed

- `src/three/trailhead.js`
- `src/three/trailhead.test.js`
- `.superpowers/sdd/bus-trailhead-task-6-shadow-fix-report.md`

No files were staged or committed.

## Remaining concern

Per parent direction, this subtask did not rerun standalone browser captures;
the parent will perform the combined visual rerun. Automated evidence covers
the exact geometry and shadow-state causes, but the final camera-level visual
appearance remains to be confirmed in that rerun.
