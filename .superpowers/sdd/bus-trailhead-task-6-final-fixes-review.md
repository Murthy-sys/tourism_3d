# Task 6 final-fixes review

Verdict: **Changes requested.**

There are no Critical findings, one Important finding, and no Minor findings.
The terrain, softened camera rail, and `.59` framing repairs are accepted.
The remaining blocker is the Who We Are message.

## Important finding

### 1. The Who We Are panel makes unsupported partnership/outcome claims and still presents the old travel-operations offer

Evidence:

- The supplied brief says the portfolio **will be sent to** tourism boards,
  hotels, resorts, travel companies, adventure brands, and government tourism
  departments. `src/journey/chapters.js:18` changes that prospect list into
  “Sanchari Kannadiga partners with” every category. Nothing in the brief
  establishes existing partnerships with all of those organizations.
- The same sentence says the content “builds attention, trust and travel
  intent.” As written, that is an unqualified outcome claim rather than an
  intended benefit (for example, “designed to build”).
- Although the new title/body discusses brand collaborations,
  `src/components/ChapterContent.jsx:9` still renders the panel's
  `aria-label="What we do"` proof points as “Stays & transport,” “Documents &
  permits,” “24/7 journey support,” and “Private, group & corporate.”
  `src/components/ChapterContent.test.jsx:12-17` explicitly locks that old
  tourism-operations presentation. The complete Who We Are panel therefore
  gives two different answers about what Sanchari Kannadiga offers brands.

This is material in a portfolio intended for prospective institutional and
commercial partners. Rephrase the recipient list without implying unsupported
existing relationships, qualify the marketing outcomes, and make the
“What we do” proof points describe brand-collaboration capabilities.

The title is on brief, and the 53-word body is not obviously too long for the
existing operations overlay: desktop allows a 620 px panel, while the mobile
rules reduce the body to `.78rem` and compact the proof grid. No browser
capture was run in this review, as requested.

## Accepted blocker repairs

### Terrain-aligned turnout

- `src/three/hillWorld.js:486-498` passes the actual post-processed production
  terrain geometry into the trailhead builder at both quality levels.
- `src/three/trailhead.js:21-73` selects complete source triangles, copies each
  source vertex once, and raises every copied Y coordinate by the same exact
  `.03125` clearance. It preserves source winding and recomputes upward vertex
  normals. The hashed angular threshold retains a deterministic irregular
  ellipse rather than replacing the turnout with a regular rectangle or disc.
- Because the gravel is a subset of the rendered tessellation, it cannot cross
  the terrain between vertices. It owns independent position, index, and normal
  buffers; it does not retain or mutate the terrain geometry.
- `src/three/hillWorld.test.js:115-162` verifies every gravel triangle at
  desktop and mobile is a constant raised copy of a rendered terrain triangle.
  Existing trailhead/controller coverage continues to verify upward normals,
  path/obstacle/coach placement, stationary coach behavior, and idempotent
  cleanup.
- The selected turnout is only a local subset of the 20,769-vertex desktop or
  7,665-vertex mobile terrain. The copied-buffer approach is proportionate, and
  `src/three/expeditionController.js:315-323` disposes both world-owned
  geometries deterministically through the existing idempotent cleanup path.

### `.12 -> .18` softened-linear rail

- `src/three/journeyData.js:21-35` implements the approved formula exactly:
  ramp width `.2`, maximum normalized velocity `1/(1-.2)=1.25`, and
  `A(u)=u^6-3u^5+2.5u^4`, the integral of smootherstep.
- The three pieces agree in value and first and second derivative at normalized
  `.2` and `.8`. At the outer endpoints its first and second derivatives are
  zero, matching the adjacent position-smootherstep segments. The combined
  rail is therefore genuinely C2 (and consequently C1) at `.12` and `.18`.
- `src/three/journeyData.js:60-66` preserves exact keyframe copies and applies
  the new interpolation only when the `.12` keyframe is the segment start.
  The `.12` and `.18` frames and all later frames are unchanged.
- The easing derivative stays in `[0,1.25]`, so the segment is monotonic with
  no overshoot. The accepted design bound remains a maximum `.001` camera jump
  of about `.714462`, below `.8`; `src/three/journeyData.test.js:142-207`
  independently retains dense jump, boundary-velocity, and monotonicity
  regressions.

### `.59` distant-forest frame

- `src/three/journeyData.js:46-50` adds only the `.59` frame between the
  existing `.52` and `.60` frames. The exact `.60` keyframe and every later
  segment remain unchanged.
- `src/three/indiaJourney.test.js:121-156` uses the production desktop
  controller, boat members, camera resolver, projection code, and
  `1440x900` aspect ratio. It verifies one guide and all three tourists are
  rendered and fully framed.
- Both adjacent segments use smootherstep, so velocity and acceleration are
  zero on each side of `.59` and `.60`. The complete dense rail regression
  remains below `.8`.
- The retained fail-closed visual-QA state still marks `.59` as
  `nextBiome:'forest'` and rejects a snapshot where the forest is not rendered,
  preserving the early-reveal contract without changing the `.60` handoff.

## Verification

Focused review gate:

```text
npm test -- --run src/three/trailhead.test.js src/three/hillWorld.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/three/expeditionController.test.js src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx

8 files passed; 90 tests passed
```

`git diff --check` was clean for all reviewed source/test files. No browser
captures were run, and no product source, tests, staging area, or commits were
modified by this review.
