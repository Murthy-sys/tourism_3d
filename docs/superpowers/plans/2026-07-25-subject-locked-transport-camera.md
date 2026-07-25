# Subject-Locked Transport Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the active trekkers, boat, or jeep as the primary camera subject while preserving route context and the existing coach opening.

**Architecture:** Add one pure transport-framing function that returns a camera and target relative to the active transport. Route both mobile and desktop resolved frames through that function after the coach opening, retaining the existing damped runtime camera and adaptive renderer unchanged.

**Tech Stack:** Three.js, JavaScript, Vitest, Vite.

## Global Constraints

- Trekkers, boat, and jeep remain close to viewport center throughout their travel stages.
- Camera targets include a small forward route offset.
- Trekkers use a wider elevated trailing view, boat a lower closer view, and jeep a moderately elevated trailing view.
- Mobile and desktop share the same subject-lock behavior with viewport-specific offsets.
- Preserve the exact coach opening frame and blend into the trekker framing.
- Preserve routes, transport models, timing, damping, adaptive mobile rendering, first-frame readiness, UI, and world content.

---

### Task 1: Pure transport-relative framing

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Produces: `getTransportCamera(quality, transport, [x,y,z]) -> {camera:number[], target:number[]}`.
- Preserves: `getMobileTransportCamera(transport, position)` as a compatibility wrapper.

- [ ] **Step 1: Write failing framing tests**

Add `getTransportCamera` to the test imports. For each quality and transport,
assert that translating the transport position translates camera and target by
the same amount. Assert these composition relationships rather than duplicating
the private framing table:

```js
it.each(['mobile','desktop'])(
  'locks every transport to the %s camera frame',
  quality=>{
    for(const transport of ['trekker','boat','jeep']){
      const origin=getTransportCamera(quality,transport,[0,0,0])
      const moved=getTransportCamera(quality,transport,[3,2,-11])
      expect(moved.camera.map((value,index)=>value-origin.camera[index]))
        .toEqual([3,2,-11])
      expect(moved.target.map((value,index)=>value-origin.target[index]))
        .toEqual([3,2,-11])
      expect(origin.target[2]).toBeLessThan(0)
      expect(origin.camera[2]).toBeGreaterThan(0)
    }
  },
)
```

Add a transport-specific relationship test:

```js
it('uses transport-specific subject distances and elevations',()=>{
  const trekker=getTransportCamera('desktop','trekker',[0,0,0])
  const boat=getTransportCamera('desktop','boat',[0,0,0])
  const jeep=getTransportCamera('desktop','jeep',[0,0,0])
  expect(trekker.camera[1]).toBeGreaterThan(jeep.camera[1])
  expect(jeep.camera[1]).toBeGreaterThan(boat.camera[1])
  expect(trekker.camera[2]).toBeGreaterThan(jeep.camera[2])
  expect(jeep.camera[2]).toBeGreaterThan(boat.camera[2])
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: FAIL because `getTransportCamera` is missing.

- [ ] **Step 3: Implement the framing table and helper**

Add mobile and desktop entries for `trekker`, `boat`, and `jeep`. Each entry
contains `camera:[x,y,z]`, `targetY`, and `lookAheadZ`; `lookAheadZ` is negative
because all three authoritative routes travel toward decreasing world `z`.

Use these initial composition values:

```js
const TRANSPORT_FRAMING={
  mobile:{
    trekker:{camera:[7,12,15],targetY:-.2,lookAheadZ:-2},
    boat:{camera:[2.4,1.5,5.5],targetY:.5,lookAheadZ:-1.25},
    jeep:{camera:[.4,1.7,5.7],targetY:.9,lookAheadZ:-1.5},
  },
  desktop:{
    trekker:{camera:[6,8.5,13],targetY:-.2,lookAheadZ:-2.5},
    boat:{camera:[3,2.2,7],targetY:.5,lookAheadZ:-1.75},
    jeep:{camera:[2.5,3.2,8],targetY:.9,lookAheadZ:-2},
  },
}
```

Return camera and target offsets relative to `[x,y,z]`, rounded with the
existing helper. Make `getMobileTransportCamera` delegate to
`getTransportCamera('mobile', ...)`.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: all focused tests pass.

---

### Task 2: Resolve every travel stage around its active subject

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: `getTransportCamera`, `getResolvedCameraFrame`, active transport,
  progress, current transport world position.
- Produces: transport-relative desired frames after the coach opening.

- [ ] **Step 1: Write failing resolution tests**

Replace the test that expects later desktop frames to equal the cinematic rail.
For representative trekker, boat, and jeep states, assert:

```js
expect(getResolvedCameraFrame({
  quality,
  progress,
  state,
  transportPosition,
})).toEqual(
  getTransportCamera(
    quality,
    state.expedition.activeTransport,
    transportPosition,
  ),
)
```

Cover both `mobile` and `desktop` at progress `.2`, `.52`, and `.84`.

Keep the existing coach-opening test and add a desktop opening assertion:

```js
expect(getResolvedCameraFrame({
  quality:'desktop',
  progress:0,
  state:openingState,
  transportPosition,
})).toEqual({
  camera:openingState.cameraPosition,
  target:openingState.cameraTarget,
})
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: later desktop travel frames still follow the cinematic rail.

- [ ] **Step 3: Implement resolved subject framing**

- Compute `transportFrame` with `getTransportCamera`.
- For non-trekker stages and progress at or after `.12`, return
  `transportFrame` for both qualities.
- Preserve the current mobile opening frame through `.045`, then blend it into
  the trekker transport frame through `.12`.
- For desktop progress below `.12`, blend the current cinematic frame into the
  trekker transport frame with the same `.045`–`.12` smootherstep, keeping
  progress `0` exact.
- Do not change runtime damping or maximum camera step.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: focused tests pass.

---

### Task 3: Centering and handoff regression coverage

**Files:**
- Modify: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: production expedition controller, transport world positions,
  resolved camera frames, `getProjectedObjectBounds`.
- Produces: regression evidence for screen centering, framing, and handoff
  continuity.

- [ ] **Step 1: Add production centering tests**

Create the production expedition controller for both mobile and desktop. At
progress `.2`, `.52`, and `.84`:

- Update the controller to the journey state.
- Resolve the active transport's world position and camera frame.
- Create a `PerspectiveCamera` using the production FOV and viewport aspect.
- Point it at the resolved target.
- Assert the active transport is rendered and fully framed.
- Assert its projected NDC horizontal center has absolute value below `.3` and
  its vertical center has absolute value below `.35`.

- [ ] **Step 2: Add handoff continuity tests**

Resolve frames immediately before and after `.42` and `.74` using production
transport positions. Assert the desired camera positions differ by less than
`12` world units and desired targets differ by less than `8` world units.
Separately apply the production damping to each handoff and assert the actual
one-frame camera and target movement never exceeds the existing `.78` cap.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: all centering, framing, opening, and handoff tests pass.

---

### Task 4: Full verification

**Files:**
- Verify: `src/three/indiaJourney.js`
- Verify: `src/three/indiaJourney.test.js`

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Confirm `git status --short` and `git diff --stat` show only the intended
  camera implementation and test changes.
- [ ] Record mobile/desktop visual capture as unavailable unless an approved
  browser surface becomes available.
