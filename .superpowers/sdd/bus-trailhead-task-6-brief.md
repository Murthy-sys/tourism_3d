### Task 6: Expand fail-closed visual QA and verify the complete journey

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `scripts/visual-qa.test.js`
- Modify: `design-qa.md`
- Verify unchanged: `src/components/Hero3D.jsx`
- Verify unchanged: `src/components/JourneyShell.jsx`

**Interfaces:**
- The visual corpus contains ten states: four opening states plus the retained `.26`, `.35`, `.50`, `.59`, `.67`, and `.84` states.
- Every opening state asserts the coach remains mounted with one unchanged world matrix.
- Establishing states require the full coach and all four travelers fully framed.
- Departure requires the coach rendered, the complete party visible, and exact smootherstep evidence.
- Mountain entry requires departure weight `1`, the complete party visible, and the coach still mounted.
- Every state keeps the current camera, console, audio, biome, transport, handoff, early-reveal, and mobile-layout assertions.

- [ ] **Step 1: Strengthen the visual-QA source contract before changing the harness**

Add these tests to `scripts/visual-qa.test.js`:

```js
it('captures every approved trailhead beat before the retained journey states',()=>{
  ;[
    "name:'trailhead-establishing'",
    "name:'travelers-beside-coach'",
    "name:'trailhead-departure'",
    "name:'mountain-entry'",
    "name:'distant-water-reveal'",
    "name:'mountain-water-handoff'",
    "name:'water-corridor'",
    "name:'distant-forest-reveal'",
    "name:'water-forest-handoff'",
    "name:'forest-finale'",
  ].forEach(name=>expect(source).toContain(name))
})

it('fails closed on coach framing, stationary placement, party framing, and departure weight',()=>{
  expect(source).toContain('snapshot.opening.coach.mounted')
  expect(source).toContain('snapshot.opening.coach.fullyFramed')
  expect(source).toContain('snapshot.opening.coach.rendered')
  expect(source).toContain('snapshot.opening.fullyFramedMembers')
  expect(source).toContain('snapshot.opening.departureWeight')
  expect(source).toContain('Coach world matrix changed')
  expect(source).toContain("hasOwnProperty.call(snapshot.transportWeights,'coach')")
})
```

- [ ] **Step 2: Run the visual-QA unit test to verify RED**

Run: `npm test -- --run scripts/visual-qa.test.js`

Expected: FAIL because the four trailhead states and coach/departure assertions are absent.

- [ ] **Step 3: Replace the old mountain-opening state with four explicit opening states**

Start `states` in `scripts/visual-qa.mjs` with:

```js
const states=[
  {
    name:'trailhead-establishing',
    progress:0,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:0,coach:'fully-framed',party:'fully-framed'},
  },
  {
    name:'travelers-beside-coach',
    progress:.035,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:0,coach:'fully-framed',party:'fully-framed'},
  },
  {
    name:'trailhead-departure',
    progress:.08,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{
      departureWeight:.4376849383,
      coach:'rendered',
      party:'visible',
    },
  },
  {
    name:'mountain-entry',
    progress:.12,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:1,coach:'mounted',party:'visible'},
  },
```

Append the six existing state objects at `.26`, `.35`, `.50`, `.59`, `.67`, and `.84` without changing their expectations.

- [ ] **Step 4: Add fail-closed opening assertions before screenshot writes**

Declare one module-scope baseline immediately before `assertSnapshot` so the
assertion function and every capture share it:

```js
let coachWorldMatrix
```

Add this block in `assertSnapshot` after the active transport check:

```js
if(Object.prototype.hasOwnProperty.call(snapshot.transportWeights,'coach')){
  throw new Error('Coach was added to expedition transport weights')
}
if(!snapshot.opening?.coach?.mounted){
  throw new Error('Coach is not mounted as trailhead scenery')
}
if(!snapshot.opening.coach.worldMatrix?.length){
  throw new Error('Coach world matrix evidence is unavailable')
}
if(!coachWorldMatrix){
  coachWorldMatrix=[...snapshot.opening.coach.worldMatrix]
}else if(
  snapshot.opening.coach.worldMatrix.some(
    (value,index)=>Math.abs(value-coachWorldMatrix[index])>1e-6
  )
){
  throw new Error('Coach world matrix changed')
}
if(state.opening){
  if(
    Math.abs(
      snapshot.opening.departureWeight-state.opening.departureWeight
    )>1e-6
  ){
    throw new Error(
      `${state.name} departure weight mismatch: `+
      `${snapshot.opening.departureWeight}`
    )
  }
  if(
    state.opening.coach==='fully-framed'&&
    !snapshot.opening.coach.fullyFramed
  ){
    throw new Error(`${state.name} does not fully frame the coach`)
  }
  if(
    state.opening.coach==='rendered'&&
    !snapshot.opening.coach.rendered
  ){
    throw new Error(`${state.name} does not render the coach`)
  }
  if(state.opening.party==='fully-framed'){
    const framed=snapshot.opening.fullyFramedMembers
    if(framed.guides!==1||framed.tourists!==3){
      throw new Error(`${state.name} does not fully frame the party`)
    }
  }
}
```

The existing `visibleMembers` check already enforces one guide and three tourists for departure, mountain entry, and every later active transport. Preserve the existing rule that `assertSnapshot` runs before `page.screenshot`.

- [ ] **Step 5: Include opening evidence in the emitted QA result**

Add:

```js
opening:snapshot.opening,
```

to each object pushed into `results`.

- [ ] **Step 6: Run the visual-QA source tests to verify GREEN**

Run: `npm test -- --run scripts/visual-qa.test.js`

Expected: PASS.

- [ ] **Step 7: Run the focused automated regression suite**

Run:

```bash
npm test -- --run src/three/tourCoach.test.js src/three/trailhead.test.js src/three/terrain.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js src/components/Hero3D.test.jsx src/components/JourneyShell.test.jsx scripts/visual-qa.test.js
```

Expected: PASS with no failed test files. `Hero3D` and `JourneyShell` remain unchanged and prove Start, menu/progress driving, fallback, and no-audio behavior still work.

- [ ] **Step 8: Run the complete automated suite and production build**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected:
- All Vitest files pass.
- Vite completes a production build; the existing chunk-size advisory may remain non-blocking.
- `git diff --check` produces no output.

- [ ] **Step 9: Start the production preview for visual evidence**

In terminal A run:

```bash
npm run preview -- --host 127.0.0.1
```

Expected: Vite reports a local preview URL at `http://127.0.0.1:4173/`.

- [ ] **Step 10: Capture all ten states on desktop and mobile**

In terminal B run:

```bash
QA_OUTPUT_DIR=/tmp/tourist-management-bus-qa node scripts/visual-qa.mjs --project desktop
QA_OUTPUT_DIR=/tmp/tourist-management-bus-qa node scripts/visual-qa.mjs --project mobile
```

Expected:
- Both commands exit `0`.
- Each reports `stateCount: 10`.
- `/tmp/tourist-management-bus-qa/desktop` contains 20 images.
- `/tmp/tourist-management-bus-qa/mobile` contains 20 images.
- No state reports console failures, audio controls, camera jump above `.8`, coach movement, missing party members, a missing active biome/transport, or a clipped mobile overlay.

- [ ] **Step 11: Inspect every desktop and mobile capture**

Inspect all 40 images and reject the run if any capture shows:

- a cropped coach or traveler at `trailhead-establishing` or `travelers-beside-coach`;
- a top-of-mountain opening angle;
- a flat plaza, monument, decorative card, hard terrain seam, or scene pop;
- coach/body, traveler/coach, boot/ground, vehicle/deck, or route/vegetation intersection;
- walking in place at progress `0`;
- a moving or disappearing coach;
- a camera snap between the trailhead, mountain, water, and forest states;
- an unreadable overlay, missing content, sound control, or horizontal mobile overflow;
- a regression in reflective water, boat handoff, dense forest, jeep handoff, or forest finale.

The accepted opening must show a believable parked premium coach with its door open, one guide and three tourists beside it, then a smooth departure across natural gravel into real mountain terrain.

- [ ] **Step 12: Record the verified evidence in `design-qa.md`**

Update `design-qa.md` with:

- the final automated test and build counts from Step 8;
- the ten exact state names and progress values;
- desktop `1440×900` and mobile `390×844`;
- the emitted coach mounted/rendered/fully-framed, party, departure-weight, camera-jump, console, audio, and layout evidence;
- the screenshot roots from Step 10;
- an explicit visual acceptance statement for the coach, open door, four travelers, natural clearing, foothill entry, later mountain, water, and forest;
- any non-blocking Vite advisory stated as non-blocking;
- no claim of acceptance for a capture that was not inspected.

- [ ] **Step 13: Re-run final verification after documentation**

Run:

```bash
npm test -- --run
npm run build
git diff --check
git status --short --branch
```

Expected:
- All tests and the production build pass again.
- `git diff --check` is silent.
- The branch is `main`.
- Only the intended implementation, test, QA harness, plan/spec, and `design-qa.md` changes are present.

- [ ] **Step 14: Commit the verified trailhead experience**

```bash
git add scripts/visual-qa.mjs scripts/visual-qa.test.js design-qa.md
git commit -m "Verify cinematic bus trailhead opening"
```

After the commit, run:

```bash
git status --short --branch
git log --oneline -7
```

Expected: a clean `main` worktree containing the six feature commits, with no merge or cherry-pick from `feature/continuous-realistic-landscape`.
