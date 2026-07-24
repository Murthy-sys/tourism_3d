# Task 2 — Trailhead landmarks, terrain blend, and clearing

## TDD evidence

### Terrain RED

Command: `npm test -- --run src/three/terrain.test.js`

Result: 2 failed / 2 passed. The new landmark contract failed because
`trailheadStart` and `mountainEntry` were absent. The height-continuity contract
failed because the old heightfield returned `6.457410594662759` at the turn-in
end, not more than four metres above the turnout height.

### Terrain GREEN

Command: `npm test -- --run src/three/terrain.test.js`

Result: 4 passed. The opening corridor now blends the frozen trailhead and
mountain-entry landmarks into the original mountain field; existing biome-weight
behavior remains covered and unchanged.

### Trailhead RED

Command: `npm test -- --run src/three/trailhead.test.js`

Result: failed before collecting tests with the expected error: `Failed to
resolve import "./trailhead"`.

### Trailhead GREEN

Command: `npm test -- --run src/three/terrain.test.js src/three/trailhead.test.js`

Result: 2 files passed, 7 tests passed. The deterministic clearing has all
required semantic groups, supplies its coach pose and clearance metadata, keeps
registered edge obstacles outside route/turnout/party constraints, and reduces
mobile decoration while retaining the same group hierarchy.

## Full-suite verification

Command: `npm test`

Result: 23 files passed, 130 tests passed.

## Files changed

- `src/three/terrain.js`
- `src/three/terrain.test.js`
- `src/three/trailhead.js`
- `src/three/trailhead.test.js`

## Self-review

- Reviewed the scoped diff and ran `git diff --check`; no whitespace errors.
- Confirmed all existing landmark arrays remain byte-for-byte values from the
  contract and all landmark arrays are frozen.
- Confirmed `sampleMountainSlope`, `createTerrainGeometry`, and
  `getBiomeWeights` were not changed.
- Confirmed only the shared opening ground is built: no coach, water, forest, or
  content integration is included.

## Concerns

None. The supplied trailhead implementation skeleton met its clearance and
continuity contracts without correction.
