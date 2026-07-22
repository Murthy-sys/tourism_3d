# Ambassador-Led Monument Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder traveller and flat chapter cards with a high-detail vintage Ambassador-led journey, realistic tourism operations, three architectural plan monuments, an integrated contact pavilion, cinematic copy, and synchronized audible sound control.

**Architecture:** A declarative timeline continues to drive React chapter content and Three.js camera state. New focused scene factories create the vehicle and architectural environments, while a vehicle controller maps normalized progress to route position, tangent, wheel motion, suspension, and lighting. A small observable audio module becomes the single source of truth for the gate and fixed sound control.

**Tech Stack:** React 18, Three.js 0.160, Web Audio API, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Visual fidelity takes priority over download size.
- Use original or clearly licensed locally stored assets; never hotlink third-party models.
- Do not copy the reference site’s proprietary assets, character, audio, code, or branding.
- Do not show conventional headers, stacked page sections, flat plan/contact card grids, or a footer after entry.
- Desktop and mobile must retain the Ambassador, all required environments, plan selection, contact journey, booking, menu, and sound.
- The opening must include a meaningful vehicle-only interval before company content.
- The Sound control must audibly mute and resume the real ambient output.
- The workspace is not a Git repository, so each task ends with a verification checkpoint rather than a commit.

---

## File Structure

- `src/journey/chapters.js`: revised content timeline and cinematic tourism copy.
- `src/journey/chapters.test.js`: timeline and opening-drive assertions.
- `src/three/ambassador.js`: high-detail vehicle factory and transform controller.
- `src/three/ambassador.test.js`: vehicle structure and route transform tests.
- `src/three/monuments.js`: operations pavilion, three plan installations, and contact pavilion.
- `src/three/monuments.test.js`: named environment structure and quality assertions.
- `src/three/regions.js`: composes the new architectural scene groups into the India world.
- `src/three/indiaJourney.js`: owns route following, camera choreography, vehicle animation, environment state, and lifecycle.
- `src/audio/ambient.js`: central sound state and observable Web Audio gain control.
- `src/audio/ambient.test.js`: mute/resume and subscription tests.
- `src/components/SoundToggle.jsx`: controlled reflection of central audio state.
- `src/components/IntroGate.jsx`: sets the same central sound state on entry.
- `src/components/ChapterContent.jsx`: concise copy and 3D-aligned accessible actions.
- `src/components/JourneyShell.jsx`: revised timeline targets and scene/content orchestration.
- `src/index.css`: cinematic text staging without visible card-grid surfaces.
- `scripts/visual-qa.mjs`: captures opening drive, operations pavilion, each plan state, contact, sound, menu, and booking.
- `design-qa.md`: final desktop/mobile visual and interaction result.

---

### Task 1: Vehicle-First Timeline and Cinematic Copy

**Files:**
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`

**Interfaces:**
- Produces: `OPENING_DRIVE_END: number`, revised `CHAPTERS`, `getChapterAtProgress(progress)`, and `getProgressForChapter(id)`.
- Consumes: existing normalized scroll progress in `JourneyShell`.

- [ ] **Step 1: Write failing timeline tests**

```js
import { CHAPTERS, OPENING_DRIVE_END, getChapterAtProgress } from './chapters'

it('reserves the opening for the Ambassador before company content', () => {
  expect(OPENING_DRIVE_END).toBeGreaterThanOrEqual(.16)
  expect(getChapterAtProgress(.08).layout).toBe('drive')
  expect(getChapterAtProgress(OPENING_DRIVE_END + .01).id).toBe('who-we-are')
})

it('uses the approved nationwide tourism-management message', () => {
  const about = CHAPTERS.find(({ id }) => id === 'who-we-are')
  expect(about.body).toMatch(/design, coordinate and manage journeys across India/i)
  expect(about.body).not.toMatch(/South Indian/i)
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/journey/chapters.test.js`

Expected: FAIL because `OPENING_DRIVE_END` and the `drive` layout do not exist.

- [ ] **Step 3: Implement the revised chapter ranges and copy**

```js
export const OPENING_DRIVE_END = .18

export const CHAPTERS = [
  { id:'home', menuLabel:'Home', title:'The road is calling.', kicker:'WanderLux', body:'A journey across India begins here.', progressStart:0, progressEnd:OPENING_DRIVE_END, layout:'drive' },
  { id:'who-we-are', menuLabel:'Who We Are', title:'Journeys, managed completely.', kicker:'Who we are', body:'We don’t simply book holidays. We design, coordinate and manage journeys across India—from the first conversation to the moment you return home.', progressStart:OPENING_DRIVE_END, progressEnd:.38, layout:'operations' },
  { id:'plans', menuLabel:'Plans', title:'Three ways into India.', kicker:'Curated journeys', body:'Choose a direction. We will shape every detail around you.', progressStart:.38, progressEnd:.72, layout:'monument-plans' },
  { id:'contact', menuLabel:'Contact', title:'Where should we take you next?', kicker:'Begin a journey', body:'Tell us what you imagine. We will make the route real.', progressStart:.72, progressEnd:1, layout:'pavilion-contact' },
]
```

Keep What We Do, Trip Routes, and Stories reachable through their content inside the operations and route environments, but remove them as competing full-screen card grids.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/journey/chapters.test.js`

Expected: PASS.

- [ ] **Step 5: Checkpoint**

Confirm the timeline has an 18% vehicle-only opening and no company content before `who-we-are`.

---

### Task 2: High-Detail Ambassador and Traveller

**Files:**
- Create: `src/three/ambassador.js`
- Create: `src/three/ambassador.test.js`
- Modify: `src/three/primitives.js`

**Interfaces:**
- Produces: `createAmbassador(materials): THREE.Group` and `updateAmbassador(vehicle, curve, progress, elapsed, reducedMotion): void`.
- Vehicle `userData` exposes `wheels: THREE.Object3D[]`, `body`, `traveller`, `headlights`, and `lastProgress`.

- [ ] **Step 1: Write failing structure and motion tests**

```js
import * as THREE from 'three'
import { createAmbassador, updateAmbassador } from './ambassador'
import { createMaterials, disposeObject3D } from './primitives'

it('builds a detailed Ambassador with traveller and four wheels', () => {
  const car = createAmbassador(createMaterials())
  expect(car.name).toBe('ambassador-vehicle')
  expect(car.userData.wheels).toHaveLength(4)
  expect(car.userData.traveller.name).toBe('ambassador-traveller')
  expect(car.getObjectByName('ambassador-headlights')).toBeTruthy()
  disposeObject3D(car)
})

it('follows and faces the route tangent while rotating its wheels', () => {
  const car = createAmbassador(createMaterials())
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,-10)])
  updateAmbassador(car, curve, .5, 1, false)
  expect(car.position.z).toBeCloseTo(-5, 1)
  expect(car.userData.wheels[0].rotation.x).not.toBe(0)
  disposeObject3D(car)
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/three/ambassador.test.js`

Expected: FAIL because `ambassador.js` does not exist.

- [ ] **Step 3: Build the detailed vehicle factory**

Create an original Three.js group with a rounded hood, cabin, roof, trunk, bumpers, chrome grille, glass, mirrors, door seams, handles, number plates, headlight meshes, taillights, detailed four-part wheels, seats, steering wheel, and a visible seated traveller. Use bevelled/lathed geometry and PBR materials instead of boxes alone. Store moving parts in `userData`.

```js
export function createAmbassador(materials) {
  const car = new THREE.Group()
  car.name = 'ambassador-vehicle'
  const wheels = []
  // Assemble locally created body, cabin, chrome, glass, lights, wheels,
  // interior, steering wheel, and traveller meshes here.
  car.userData = { wheels, body, traveller, headlights, lastProgress: 0 }
  car.scale.setScalar(.78)
  return car
}
```

- [ ] **Step 4: Implement the route controller**

```js
export function updateAmbassador(car, curve, progress, elapsed, reducedMotion) {
  const p = THREE.MathUtils.clamp(progress, 0, 1)
  const position = curve.getPointAt(p)
  const tangent = curve.getTangentAt(Math.min(.999, p + .001)).normalize()
  car.position.copy(position)
  car.position.y = .28 + (reducedMotion ? 0 : Math.sin(elapsed * 5) * .015)
  car.rotation.y = Math.atan2(tangent.x, tangent.z)
  const distance = Math.abs(p - car.userData.lastProgress) * curve.getLength()
  car.userData.wheels.forEach(wheel => { wheel.rotation.x -= distance / .24 })
  car.userData.lastProgress = p
}
```

- [ ] **Step 5: Run the focused test**

Run: `npm test -- src/three/ambassador.test.js`

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Render the vehicle alone and confirm it reads unmistakably as a vintage Ambassador from front three-quarter and rear three-quarter views.

---

### Task 3: Architectural Tourism Environments

**Files:**
- Create: `src/three/monuments.js`
- Create: `src/three/monuments.test.js`
- Modify: `src/three/regions.js`

**Interfaces:**
- Produces: `createOperationsPavilion(materials, quality)`, `createPlanMonuments(materials, quality)`, and `createContactPavilion(materials, quality)`.
- Each root group has stable names and `userData.anchors` positions for accessible overlay alignment.

- [ ] **Step 1: Write failing environment tests**

```js
import { createMaterials, disposeObject3D } from './primitives'
import { createOperationsPavilion, createPlanMonuments, createContactPavilion } from './monuments'

it('creates a working nationwide tourism operations pavilion', () => {
  const pavilion = createOperationsPavilion(createMaterials(), 'desktop')
  expect(pavilion.name).toBe('tourism-operations-pavilion')
  expect(pavilion.getObjectByName('route-planning-table')).toBeTruthy()
  expect(pavilion.getObjectByName('guide-meeting-point')).toBeTruthy()
  expect(pavilion.userData.anchors.copy).toBeDefined()
  disposeObject3D(pavilion)
})

it('creates three distinct plan monuments and a contact pavilion', () => {
  const plans = createPlanMonuments(createMaterials(), 'desktop')
  expect(plans.children.filter(({ userData }) => userData.planId)).toHaveLength(3)
  const contact = createContactPavilion(createMaterials(), 'desktop')
  expect(contact.name).toBe('contact-pavilion')
  disposeObject3D(plans); disposeObject3D(contact)
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/three/monuments.test.js`

Expected: FAIL because the monument factories do not exist.

- [ ] **Step 3: Create the nationwide operations pavilion**

Build a believable architectural pavilion with columns, roof structure, warm interior light, route-planning table, dimensional India route, luggage, transport desk, guide meeting point, itinerary board, and human silhouettes. Store the copy anchor at the pavilion’s main wall.

- [ ] **Step 4: Create three visually distinct plan monuments**

Build:

```js
const PLAN_INSTALLATIONS = [
  { id:'southern-discovery', language:'coastal colonnade', materials:['ivory','water','leaf'] },
  { id:'heritage-india', language:'sandstone ceremonial gateway', materials:['sand','stone','gold'] },
  { id:'himalayan-adventure', language:'stone-and-timber mountain shelter', materials:['dark','wood','snow'] },
]
```

Each installation must include layered silhouettes, stairs or plinths, depth, local lighting, a route inscription surface, and a semantic anchor. Do not use one generic box with different colors.

- [ ] **Step 5: Create the contact pavilion**

Build a stone, timber, and glass overlook pavilion with a lit interior, seating, route table, traveller luggage, mountain framing, and a dedicated copy/action anchor.

- [ ] **Step 6: Compose the environments into the region world**

Add the operations pavilion near the end of the opening drive, plans across the middle route, and contact pavilion in the Himalayas. Preserve geographic scenery around them so architecture feels grounded rather than isolated.

- [ ] **Step 7: Run monument and region tests**

Run: `npm test -- src/three/monuments.test.js src/three/regions.test.js`

Expected: PASS, with mobile using reduced detail counts without removing named environments.

- [ ] **Step 8: Checkpoint**

Capture each environment without HTML overlays and verify recognizable architecture, depth, lighting, scale, and distinct plan identities.

---

### Task 4: Renderer Choreography and Vehicle Camera

**Files:**
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`

**Interfaces:**
- Consumes: `createAmbassador`, `updateAmbassador`, revised camera keyframes, and named monument groups.
- Produces: scene API remains `setProgress`, `setPointer`, `setReducedMotion`, `pause`, `resume`, and `dispose`.

- [ ] **Step 1: Add failing choreography tests**

```js
it('keeps the opening camera focused on the moving Ambassador', () => {
  const opening = getJourneyState(.08)
  expect(opening.phase).toBe('vehicle-intro')
  expect(opening.vehicleVisible).toBe(true)
  expect(opening.contentVisible).toBe(false)
})

it('exposes the three plan focus states in journey order', () => {
  expect([.44,.55,.66].map(p => getJourneyState(p).planFocus)).toEqual([0,1,2])
})
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `npm test -- src/three/journeyData.test.js src/three/indiaJourney.test.js`

Expected: FAIL because `phase`, `vehicleVisible`, `contentVisible`, and `planFocus` are absent.

- [ ] **Step 3: Add phase metadata and revised camera keyframes**

Return explicit `phase`, `vehicleVisible`, `contentVisible`, `planFocus`, `cameraPosition`, `cameraTarget`, and palette values from `getJourneyState(progress)`. Ensure the first 18% tracks the moving car from multiple cinematic angles before the pavilion reveal.

- [ ] **Step 4: Replace the sphere with the Ambassador**

```js
const routeCurve = new THREE.CatmullRomCurve3(routePoints)
const vehicle = createAmbassador(materials)
scene.add(vehicle)

// inside animate
updateAmbassador(vehicle, routeCurve, progress, clock.getElapsedTime(), reducedMotion)
vehicle.visible = state.vehicleVisible
```

Use the vehicle’s position as the opening camera target and blend to architectural anchors during content phases. Add headlight bloom-like sprites or emissive meshes without requiring a postprocessing stack.

- [ ] **Step 5: Run renderer and journey tests**

Run: `npm test -- src/three/journeyData.test.js src/three/indiaJourney.test.js`

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Verify Start → vehicle arrival → uninterrupted drive → operations pavilion → three plan installations → contact pavilion with no camera teleport, clipping, or vehicle disappearance.

---

### Task 5: Centralized Sound State

**Files:**
- Modify: `src/audio/ambient.js`
- Create: `src/audio/ambient.test.js`
- Modify: `src/components/SoundToggle.jsx`
- Modify: `src/components/IntroGate.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `startAmbient(enabled)`, `setAmbientEnabled(enabled)`, `getAmbientEnabled()`, and `subscribeAmbient(listener)`.
- Consumers receive the real current enabled state rather than keeping independent local copies.

- [ ] **Step 1: Write failing central-state tests**

```js
import { getAmbientEnabled, setAmbientEnabled, subscribeAmbient } from './ambient'

it('publishes mute and resume state changes', () => {
  const states = []
  const unsubscribe = subscribeAmbient(value => states.push(value))
  setAmbientEnabled(true)
  setAmbientEnabled(false)
  unsubscribe()
  expect(states).toEqual([true, false])
  expect(getAmbientEnabled()).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- src/audio/ambient.test.js`

Expected: FAIL because the getter and subscription API do not exist.

- [ ] **Step 3: Implement observable audio state and immediate fade**

```js
let enabledState = false
const listeners = new Set()

export const getAmbientEnabled = () => enabledState
export const subscribeAmbient = listener => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setAmbientEnabled(enabled) {
  enabledState = Boolean(enabled)
  listeners.forEach(listener => listener(enabledState))
  if (!ctx || !masterGain) return
  const now = ctx.currentTime
  masterGain.gain.cancelScheduledValues(now)
  masterGain.gain.setValueAtTime(masterGain.gain.value, now)
  masterGain.gain.linearRampToValueAtTime(enabledState ? .18 : 0, now + .12)
}
```

- [ ] **Step 4: Make both controls consume the central state**

Use `useSyncExternalStore(subscribeAmbient, getAmbientEnabled, () => false)` in `SoundToggle`. The gate calls `startAmbient(soundOn)` once; the journey control never owns an independent sound boolean.

- [ ] **Step 5: Run audio and component tests**

Run: `npm test -- src/audio/ambient.test.js src/components/JourneyShell.test.jsx`

Expected: PASS.

- [ ] **Step 6: Checkpoint**

Start with sound, click the fixed Sound control, and confirm audible output reaches silence within 120ms; click again and confirm it resumes.

---

### Task 6: 3D-Aligned Accessible Content

**Files:**
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/components/JourneyShell.jsx`
- Modify: `src/components/JourneyMenu.jsx`
- Modify: `src/components/JourneyMenu.test.jsx`
- Modify: `src/components/JourneyShell.test.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: revised chapter layouts and `TRAVEL_PLANS`.
- Produces: accessible plan buttons and contact action visually aligned to the scene monuments.

- [ ] **Step 1: Write failing presentation tests**

```jsx
it('does not render company content during the opening drive', () => {
  render(<ChapterContent chapter={CHAPTERS[0]} progress={.08} />)
  expect(screen.queryByText(/who we are/i)).not.toBeInTheDocument()
})

it('renders three accessible monument plan actions', () => {
  const plans = CHAPTERS.find(({ id }) => id === 'plans')
  render(<ChapterContent chapter={plans} progress={.5} onPlan={vi.fn()} />)
  expect(screen.getAllByRole('button', { name:/plan .* journey/i })).toHaveLength(3)
})
```

- [ ] **Step 2: Run component tests and confirm failure**

Run: `npm test -- src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx`

Expected: FAIL because the layouts and expected accessible labels have not been implemented.

- [ ] **Step 3: Replace card layouts with scene-aligned copy layers**

Render no title/body for `drive`. For `operations`, render the approved statement plus compact operational proof points without a bordered container. For `monument-plans`, render one active plan inscription per plan focus with three persistent accessible hotspots mapped to the monuments. For `pavilion-contact`, render the final statement and booking/email actions without a card surface.

- [ ] **Step 4: Replace card CSS with architectural typography**

Remove visible `.service-zone`, `.plan-displays`, `.story-monuments`, and panel backgrounds from active layouts. Use large display type, short lines, uppercase micro-labels, controlled fades, scene-aware text shadows, and anchor-specific positioning. Keep semantic controls focusable with clearly visible focus rings.

- [ ] **Step 5: Update menu targets**

Keep Home, Who We Are, Plans, Trip Routes, What We Do, Stories, Plan a Trip, and Contact discoverable. Map What We Do and Stories to meaningful progress positions inside the operations/route sequence without reinstating separate card pages.

- [ ] **Step 6: Run component tests**

Run: `npm test -- src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx src/components/BookingOverlay.test.jsx`

Expected: PASS.

- [ ] **Step 7: Checkpoint**

Confirm no visible flat card grid remains and all plan/contact interactions work with mouse, keyboard, and touch.

---

### Task 7: Full Verification and Visual QA

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: the complete local experience at `http://127.0.0.1:4173/`.
- Produces: desktop/mobile screenshots and a passing QA report.

- [ ] **Step 1: Extend the browser QA capture states**

Capture and assert:

```js
const states = [
  ['opening-drive', .08],
  ['who-we-are', .24],
  ['southern-plan', .44],
  ['heritage-plan', .55],
  ['himalayan-plan', .66],
  ['contact', .88],
]
```

Also assert the Ambassador exists in the WebGL scene through a debug-exposed scene status, company content is absent at `.08`, three plan actions are accessible, menu jumps work, booking prefills, sound state changes from on to off and back, horizontal overflow is false, and console errors are empty.

- [ ] **Step 2: Run the complete automated suite**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 3: Build production assets**

Run: `npm run build`

Expected: build succeeds. A Three.js chunk-size advisory is acceptable; compilation errors are not.

- [ ] **Step 4: Run desktop browser QA**

Run: `node scripts/visual-qa.mjs desktop`

Expected: every required state, interaction, sound toggle, booking path, overflow check, and console check passes at 1440×900.

- [ ] **Step 5: Run mobile browser QA**

Run: `node scripts/visual-qa.mjs mobile`

Expected: every required state and interaction passes at 390×844 without removing the vehicle or required environments.

- [ ] **Step 6: Compare source and implementation presentation qualities**

Review matched desktop/mobile captures for vehicle-led pacing, camera storytelling, architectural content integration, typography restraint, lighting, depth, cropping, interaction clarity, and absence of flat card grids. Fix all P0, P1, and P2 issues before continuing.

- [ ] **Step 7: Write the final QA report**

Update `design-qa.md` with automated results, desktop/mobile findings, console status, any P3-only polish, and the exact final line:

```md
final result: passed
```

- [ ] **Step 8: Final checkpoint**

Keep the verified local preview running at `http://localhost:4173/` and hand off only after the QA report passes.
