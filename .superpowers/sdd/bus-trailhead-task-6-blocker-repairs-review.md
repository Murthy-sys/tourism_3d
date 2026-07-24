# Task 6 blocker-repairs review

Reviewed commits:

- `620a1b2` — Repair trailhead terrain artifacts
- `5d3a4d0` — Frame full party at mountain entry

Verdict: **Changes requested / Task 6 acceptance remains blocked.**

There are no Critical findings. There are two Important findings and no Minor
findings.

## Important findings

### 1. The new linear camera segment is position-continuous but not motion-smooth

Evidence:

- `src/three/journeyData.js:26` marks the new `.12` keyframe as
  `interpolation:'linear'`.
- `src/three/journeyData.js:47-49` consequently uses linear interpolation for
  the complete `.12 -> .18` segment, while the incoming `.08 -> .12` and
  outgoing `.18 -> .28` segments remain smootherstep.
- The `.08` and `.12` targets are also identical
  (`src/three/journeyData.js:25-26`), so target motion comes to a complete stop
  before `.12` and then immediately accelerates at the constant linear rate.

The rail remains C0-continuous and its `.001` progress jump on the linear
segment is about `0.571569`, so it does stay below the established `.8`
positional jump limit. That does not satisfy the separate continuous,
butter-smooth movement requirement, however. Numerical one-sided derivatives
show the discontinuities clearly:

- At `.12`, camera velocity changes from approximately `[0,0,0]` to
  `[-58.33,46.67,-566.67]` progress-units, while target velocity changes from
  `[0,0,0]` to `[-43.33,18.33,-541.67]`.
- At `.18`, those nonzero linear velocities drop immediately to approximately
  zero as the next smootherstep segment begins.

Thus the repair introduces an abrupt start at mountain entry and abrupt
braking at `.18`, changing behavior at a later retained keyframe. Runtime
damping and the `.78` per-frame cap soften position changes but do not make
the desired rail velocity continuous.

The regressions do not catch this:

- `src/three/journeyData.test.js:96-107` locks endpoint positions only.
- `src/three/journeyData.test.js:139-152` checks only adjacent positional
  distance, not one-sided velocity.
- `src/three/indiaJourney.test.js:82-120` proves static party framing at exactly
  `.12`, not movement through `.12` or `.18`.

The camera rail needs to preserve full-party framing without introducing
these boundary velocity discontinuities, and the regression should exercise
motion on both sides of the affected boundaries.

### 2. The concentric turnout still intersects the rendered terrain, especially on mobile

Evidence:

- `src/three/trailhead.js:22-32` samples seven mobile/eight desktop radial rings
  directly from `heightAt`.
- `src/three/trailhead.js:38-46` triangulates those rings independently of the
  underlying terrain grid.
- `src/three/trailhead.test.js:26-37` checks only triangle centroids against the
  analytic height function, and `src/three/trailhead.test.js:130-146` accepts
  up to `.5` units of absolute deviation. It does not compare the gravel
  surface to the actual independently triangulated `hill-terrain` mesh or
  sample between triangle centroids.

A read-only ray-intersection diagnostic compared the gravel mesh with the
actual terrain geometry at each production quality over a `.4`-unit grid:

- Desktop: the gravel ranged from `.355812` below to `.479561` above the
  rendered terrain; 50 of 2,004 turnout samples were below it.
- Mobile: the gravel ranged from `.379092` below to `.304639` above the
  rendered terrain; 134 of 1,992 turnout samples were below it.

Because the gravel crosses from above to below the opaque terrain rather than
remaining a consistently offset surface, parts can disappear into the hill
and the crossings can produce the same class of seams/z-fighting artifacts
this commit is intended to remove. The current centroid-only analytic test
passes while missing those rendered-surface intersections.

The turnout should stay consistently above (or share tessellation with) the
actual production terrain at both qualities, with a regression that compares
the two rendered meshes across triangle interiors.

## Confirmed good behavior

- The turnout winding is upward and deterministic.
- Broad clearing surfaces receive shadows without casting them.
- Desktop and mobile retain the same semantic trailhead groups; mobile uses
  proportionately lower tessellation (468 turnout triangles versus 1,080 on
  desktop).
- The production desktop frame at `.12` contains one guide and all three
  tourists.
- The coach/party/world cleanup path remains idempotent in the existing
  integration coverage.

## Verification

Focused changed-file tests:

```text
npm test -- --run src/three/trailhead.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js
3 files passed; 44 tests passed
```

Focused Task 6/core regression suite (excluding the uncommitted visual-QA
worktree files):

```text
npm test -- --run src/three/tourCoach.test.js src/three/trailhead.test.js src/three/terrain.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/components/Hero3D.test.jsx src/components/JourneyShell.test.jsx
11 files passed; 99 tests passed
```

`git diff --check 620a1b2^..5d3a4d0` was clean. No browser captures were run,
and the existing uncommitted Task 6 QA files were not modified.
