# Task 3 report

## Status

Implemented and committed.

## Files

- `src/three/waterWorld.js`
- `src/three/waterWorld.test.js`
- `src/three/expeditionVehicles.js`
- `src/three/expeditionVehicles.test.js`

## Commit

`919e51d` — `Build realistic reflective water corridor`

## TDD and verification

- RED: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`
  - Exit 1.
  - The new water test failed because the layered corridor objects were absent.
  - The new boat test failed because `boat-oar-left`, `boat-oar-right`, and the boat-owned wake were absent.
- GREEN (fresh final run): `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`
  - Exit 0.
  - 4 test files passed, 19 tests passed, 0 failed.
  - Vitest also discovered the corresponding tests under `.worktrees/continuous-landscape`.
- Build: `npm run build`
  - Exit 0.
  - 53 modules transformed; production bundle built successfully.
  - Vite emitted its non-blocking chunk-size warning for the 695.99 kB JavaScript bundle.
- Diff validation: `git diff --cached --check`
  - Exit 0.

## Implementation summary

- Replaced the rectangular water plane with a curved route from `LANDMARKS.mountainLanding` to `LANDMARKS.forestLanding`.
- Added dark depth, physical reflective surface, independent reflection, shallows, irregular banks, bank shadows, wet stones, foam, reeds, and animated wave vertices.
- Added route-aligned mountain and forest landings plus three overlapping dark-green forest silhouette bands.
- Exposed `route`, `mountainLanding`, `forestLanding`, `surfaceMaterials`, and `forestSightline` through water `userData`.
- Preserved the teal articulated rowboat and legacy port/starboard names while adding left/right oar names, a boat-owned visible wake, corrected forward alignment, route-tangent wake alignment, and independent oar/ripple/water animation frequencies.

## Self-review

- Confirmed route endpoints match the two shared landmarks within the specified tolerance.
- Confirmed required object names are reachable from the scene graph.
- Confirmed all exposed surface materials have roughness below `.45`, and the main surface uses the requested physical material values.
- Confirmed existing hull color, rower, blade, wake-anchor, rowing animation, and transport movement tests remain green.
- Confirmed only the four Task 3 implementation/test files were included in the commit.

## Concerns

- The focused Vitest command also discovers tests inside `.worktrees/continuous-landscape` because the repository test configuration does not exclude `.worktrees`; all discovered tests passed.
- The production build retains the existing Vite bundle-size warning; Task 3 does not alter bundling strategy.

## Review-fix verification

### Focused tests

Command: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

```text
> wanderlux-tourism@1.0.0 test
> vitest run src/three/waterWorld.test.js src/three/expeditionVehicles.test.js


 RUN  v2.1.9 /Users/apple/Desktop/tourist-management

 ✓ .worktrees/continuous-landscape/src/three/expeditionVehicles.test.js (5 tests) 66ms
 ✓ src/three/expeditionVehicles.test.js (7 tests) 95ms
 ✓ src/three/waterWorld.test.js (8 tests) 185ms
 ✓ .worktrees/continuous-landscape/src/three/waterWorld.test.js (6 tests) 190ms

 Test Files  4 passed (4)
      Tests  26 passed (26)
   Start at  11:02:13
   Duration  751ms (transform 86ms, setup 294ms, collect 207ms, tests 536ms, environment 928ms, prepare 153ms)
```

Exit code: `0`

### Production build

Command: `npm run build`

```text
> wanderlux-tourism@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 53 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.90 kB │ gzip:   0.50 kB
dist/assets/index-Cb7CXXl5.css   29.32 kB │ gzip:   6.60 kB
dist/assets/index-CuS_jbFP.js   696.51 kB │ gzip: 194.04 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 1.00s
```

Exit code: `0`

### Review fixes covered

- Both river-bank meshes now compute upward-facing normals.
- Water uses seven vertices across each station, depth-colored from deep center to shallow edges, with cross-width wave phase and recomputed 2D normals.
- The physical surface injects explicit Fresnel terrain/sky reflection into the Three.js physical shader.
- The corridor narrows by more than three units per side into the forest inlet.
- Visible mountain and forest deck bounds are centered on their shared landmarks.
- The boat-owned wake is the only wake in the combined water scene.
- Left/right animated oar groups and port/starboard compatibility groups all contain visible oar geometry.
- Every animated foam and boat-wake child owns its material, preventing opacity coupling.
