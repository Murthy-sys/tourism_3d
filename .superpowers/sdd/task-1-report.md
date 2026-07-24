# Task 1 report: Deterministic terrain and transition mathematics

## Files

- Created `src/three/terrain.js`
- Created `src/three/terrain.test.js`

## TDD evidence

### RED

Command: `npm test -- src/three/terrain.test.js`

Result: failed before test collection with the expected Vite import-resolution error:
`Failed to resolve import "./terrain" from "src/three/terrain.test.js"`.
This demonstrated the test exercised the missing production module.

### GREEN

Command: `npm test -- src/three/terrain.test.js`

Result: 1 test file passed; 2 tests passed.

Full verification: `npm test && git diff --check`

Result: 18 test files passed; 41 tests passed; no whitespace errors.

## Implementation review

- `smoothstep`, analytic hill height, and finite-difference hill slope use the specified deterministic equations.
- The terrain plane is rotated onto the XZ plane, receives vertex Y displacement from `heightAt(x, z)`, recomputes normals, and exposes a per-vertex `slope` buffer attribute normalized to `[0, 1]`.
- Landscape weights use the requested smooth transition ranges and normalize to a total of one.

## Commit

`2429ec5cc48070c8df5350fb642da8658c350fe8` — `Add deterministic continuous terrain`

## Concerns

None. The supplied test snippet contains two `it` groups, while its prose says three terrain assertion groups; the implementation and test file follow the provided code exactly.

## Review-fix TDD evidence

### RED

Added a regression using `heightAt(x, z) = x² + 0.5z`. It checks XZ orientation after plane rotation, Y displacement, the normal and slope attributes, every normalized slope bound, and every slope value against finite differences from that supplied function.

Command: `npm test -- src/three/terrain.test.js`

Result: failed as expected against the original geometry code: `expected 0.6857151389122009 to be close to 1`, proving geometry used global hill sampling instead of the caller's height sampler.

### GREEN

Extracted a finite-difference helper that accepts `heightAt`; `sampleHillSlope` supplies the default hill sampler, while `createTerrainGeometry` supplies its caller-provided function.

Commands:

- `npm test -- src/three/terrain.test.js` — 1 test file, 3 tests passed.
- `npm test` — 18 test files, 42 tests passed.
- `git diff --check` — passed with no whitespace errors.

## Review-fix commit

`bceff9500d9bfe8c3cd294d64712aace3d2801ad` — `Use custom terrain samplers for slopes`
