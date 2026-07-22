# India Tourism 3D Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative globe hero with a cinematic, scroll-driven South-to-North Indian tourism diorama while retaining and visually upgrading the existing portal sections and booking flow.

**Architecture:** A React-owned hero exposes normalized scroll, pointer, accessibility, and fallback state to a focused Three.js scene API. Declarative journey data drives five independently constructed regional groups, camera keyframes, regional overlays, and links to the retained destination section. Existing content components remain conventional HTML and are restyled to share the scene's tourism palette.

**Tech Stack:** React 18, Three.js 0.160, Vite 5, Vitest, Testing Library, CSS, WebGL.

## Global Constraints

- Retain the existing marquee, services, destinations, statistics, testimonials, booking, and footer sections.
- The 3D route is Kerala, Tamil temple architecture, Hampi/Deccan, Goa, Mumbai, Rajasthan, Agra, Varanasi, and the Himalayas.
- Use original procedural low-poly geometry; do not copy or hotlink proprietary assets from the reference.
- Respect `prefers-reduced-motion`, cap pixel ratio, simplify mobile rendering, and provide a usable WebGL fallback.
- Keep overlay controls keyboard accessible and preserve booking functionality.
- Do not add backend behavior or new application routes.
- This workspace is not currently a Git repository. Run each listed verification command; perform commit steps only after the owner initializes Git.

---

## Planned File Structure

- `src/three/journeyData.js`: declarative checkpoints, palette, camera keyframes, and interpolation helpers.
- `src/three/primitives.js`: reusable low-poly terrain, building, tree, water, route, and atmosphere factories.
- `src/three/regions.js`: five regional group builders assembled from primitives.
- `src/three/indiaJourney.js`: renderer lifecycle, adaptive quality, scene animation, camera travel, and disposal.
- `src/components/Hero3D.jsx`: React bridge for scene lifecycle, scroll, pointer, visibility, fallback, and reduced motion.
- `src/components/Hero.jsx`: journey viewport and accessible regional overlay.
- `src/components/JourneyOverlay.jsx`: checkpoint copy, progress, destination action, and scroll cue.
- `src/data.js`: Indian destinations and locally relevant testimonials.
- `src/index.css`: cinematic hero, regional overlays, gate, navigation, retained sections, responsive and reduced-motion styling.
- `src/test/setup.js`: DOM test setup.
- `src/three/*.test.js`, `src/components/*.test.jsx`: deterministic tests for data, interpolation, lifecycle integration, accessibility, and booking preservation.

---

### Task 1: Testing Harness and Declarative Journey Model

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `src/test/setup.js`
- Create: `src/three/journeyData.js`
- Create: `src/three/journeyData.test.js`

**Interfaces:**
- Produces: `JOURNEY_STOPS`, `CAMERA_KEYFRAMES`, `clamp01(value)`, `getJourneyState(progress)`.
- `getJourneyState(progress)` returns `{ activeIndex, activeStop, localProgress, cameraPosition, cameraTarget, palette }`.

- [ ] **Step 1: Add the test dependencies and scripts**

Add `"test": "vitest run"` and `"test:watch": "vitest"` under `scripts`. Add `@testing-library/jest-dom`, `@testing-library/react`, `jsdom`, and `vitest` under `devDependencies`, then run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` updates without audit-blocking errors.

- [ ] **Step 2: Configure Vitest and DOM setup**

Update `vite.config.js` to:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
})
```

Create `src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 3: Write the failing journey-model tests**

Create `src/three/journeyData.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { JOURNEY_STOPS, clamp01, getJourneyState } from './journeyData'

describe('India journey data', () => {
  it('runs south to north through every approved tourism stop', () => {
    expect(JOURNEY_STOPS.map((stop) => stop.id)).toEqual([
      'kerala', 'tamil-nadu', 'hampi', 'goa', 'mumbai',
      'rajasthan', 'agra', 'varanasi', 'himalayas',
    ])
  })

  it('clamps progress and returns stable endpoint states', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(3)).toBe(1)
    expect(getJourneyState(-1).activeStop.id).toBe('kerala')
    expect(getJourneyState(2).activeStop.id).toBe('himalayas')
  })

  it('interpolates finite camera coordinates', () => {
    const state = getJourneyState(0.55)
    expect([...state.cameraPosition, ...state.cameraTarget].every(Number.isFinite)).toBe(true)
    expect(state.localProgress).toBeGreaterThanOrEqual(0)
    expect(state.localProgress).toBeLessThanOrEqual(1)
  })
})
```

- [ ] **Step 4: Run the test and verify it fails**

Run: `npm test -- src/three/journeyData.test.js`

Expected: FAIL because `src/three/journeyData.js` does not exist.

- [ ] **Step 5: Implement the journey data and interpolation**

Create `src/three/journeyData.js` with nine stops. Each stop must define `id`, `name`, `kicker`, `description`, `region`, `href: '#destinations'`, `palette: { sky, horizon, ground, accent }`, `camera: [x,y,z]`, and `target: [x,y,z]`. Use positions that advance along negative Z in this exact sequence:

```js
const stop = (id, name, kicker, description, region, palette, camera, target) => ({
  id, name, kicker, description, region, href: '#destinations', palette, camera, target,
})

export const JOURNEY_STOPS = [
  stop('kerala', 'Kerala Backwaters', 'The journey begins in the south', 'Drift through palms, waterways and houseboat country.', 'south', { sky: '#8fc7c7', horizon: '#f4b27b', ground: '#245c4c', accent: '#ffd274' }, [0, 5, 18], [0, 1, 0]),
  stop('tamil-nadu', 'Tamil Nadu', 'Temple country', 'Enter a skyline shaped by ancient gopurams and living traditions.', 'south', { sky: '#89b9c9', horizon: '#ed9669', ground: '#8b4d35', accent: '#ffcc75' }, [9, 5, 3], [9, 2, -12]),
  stop('hampi', 'Hampi & the Deccan', 'Stone, story and empire', 'Cross boulder fields and the monumental remains of Vijayanagara.', 'deccan', { sky: '#7998b7', horizon: '#df815e', ground: '#8f4937', accent: '#f5bd69' }, [-8, 6, -16], [-5, 1, -29]),
  stop('goa', 'Goa Coast', 'Where the road meets the sea', 'Follow palms, bright facades and the Arabian Sea.', 'deccan', { sky: '#74abc4', horizon: '#f1a66f', ground: '#2f6470', accent: '#ffd87a' }, [8, 5, -34], [10, 1, -48]),
  stop('mumbai', 'Mumbai', 'Gateway to the west', 'Arrive at a harbor shaped by movement, ambition and history.', 'west-north', { sky: '#627f9f', horizon: '#df805f', ground: '#4a4d5e', accent: '#ffc46e' }, [-6, 6, -52], [-4, 2, -66]),
  stop('rajasthan', 'Rajasthan', 'Fortresses of the desert', 'Travel through ochre dunes, palace walls and desert light.', 'west-north', { sky: '#887993', horizon: '#df7759', ground: '#9e663b', accent: '#ffd078' }, [8, 6, -70], [7, 2, -84]),
  stop('agra', 'Agra', 'An icon in marble', 'Pause before the symmetry and calm of the Taj Mahal.', 'west-north', { sky: '#8098ad', horizon: '#efa082', ground: '#767b77', accent: '#fff0c8' }, [-5, 5, -88], [-3, 2, -102]),
  stop('varanasi', 'Varanasi', 'Light along the Ganges', 'Move past river steps, boats and the glow of evening rituals.', 'ganges', { sky: '#5d6684', horizon: '#df704f', ground: '#59454d', accent: '#ffbf59' }, [7, 5, -106], [7, 1, -120]),
  stop('himalayas', 'The Himalayas', 'The journey rises', 'Finish above cedar forests beneath snow-lit peaks.', 'himalayas', { sky: '#4f6682', horizon: '#cc8e7c', ground: '#34464a', accent: '#eef8ff' }, [0, 8, -126], [0, 3, -140]),
]

export const CAMERA_KEYFRAMES = JOURNEY_STOPS.map(({ camera, target }) => ({ camera, target }))
export const clamp01 = (value) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => a.map((value, index) => lerp(value, b[index], t))

export function getJourneyState(progress) {
  const value = clamp01(progress)
  const scaled = value * (JOURNEY_STOPS.length - 1)
  const activeIndex = Math.min(Math.floor(scaled), JOURNEY_STOPS.length - 1)
  const nextIndex = Math.min(activeIndex + 1, JOURNEY_STOPS.length - 1)
  const localProgress = nextIndex === activeIndex ? 1 : scaled - activeIndex
  const current = JOURNEY_STOPS[activeIndex]
  const next = JOURNEY_STOPS[nextIndex]
  return {
    activeIndex,
    activeStop: current,
    localProgress,
    cameraPosition: lerp3(current.camera, next.camera, localProgress),
    cameraTarget: lerp3(current.target, next.target, localProgress),
    palette: current.palette,
  }
}
```

- [ ] **Step 6: Run tests and checkpoint**

Run: `npm test -- src/three/journeyData.test.js`

Expected: 3 tests PASS. If Git is initialized, commit with `git add package.json package-lock.json vite.config.js src/test src/three/journeyData* && git commit -m "test: define India journey model"`.

---

### Task 2: Reusable Low-Poly Primitives and Regional Scene Builders

**Files:**
- Create: `src/three/primitives.js`
- Create: `src/three/regions.js`
- Create: `src/three/regions.test.js`

**Interfaces:**
- Produces: `createMaterials()`, `createTerrain()`, `createWater()`, `createTree()`, `createBuilding()`, `createTemple()`, `createDome()`, `createMountain()`, `createRoute()`, `disposeObject3D(root)`.
- Produces: `createIndiaRegions(materials, quality)` returning a `THREE.Group` whose child names are `south`, `deccan`, `west-north`, `ganges`, and `himalayas`.

- [ ] **Step 1: Write the failing regional contract tests**

Create `src/three/regions.test.js`:

```js
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createIndiaRegions } from './regions'
import { createMaterials, disposeObject3D } from './primitives'

describe('regional scene builders', () => {
  it('creates every regional group in journey order', () => {
    const root = createIndiaRegions(createMaterials(), 'desktop')
    expect(root.children.map((child) => child.name)).toEqual([
      'south', 'deccan', 'west-north', 'ganges', 'himalayas',
    ])
    disposeObject3D(root)
  })

  it('uses fewer meshes for mobile quality', () => {
    const materials = createMaterials()
    const desktop = createIndiaRegions(materials, 'desktop')
    const mobile = createIndiaRegions(materials, 'mobile')
    const count = (root) => root.getObjectsByProperty('isMesh', true).length
    expect(count(mobile)).toBeLessThan(count(desktop))
    expect(desktop).toBeInstanceOf(THREE.Group)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/three/regions.test.js`

Expected: FAIL because `regions.js` and `primitives.js` do not exist.

- [ ] **Step 3: Implement the primitive factories**

In `src/three/primitives.js`, export factories built only from Three.js geometries. Use shared `MeshStandardMaterial` values for sandstone, ivory, foliage, water, road, dark stone, snow, and accent. `createTree` must compose a cylinder trunk and low-detail icosahedron canopy; `createTemple` must stack tapered boxes; `createDome` must use a half-sphere and cylinder; `createMountain` must use cone geometry; `createRoute(points, material)` must return a tube along a `CatmullRomCurve3`. Implement disposal exactly as:

```js
export function disposeObject3D(root) {
  const geometries = new Set()
  const materials = new Set()
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.filter(Boolean).forEach((material) => materials.add(material))
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
}
```

- [ ] **Step 4: Build the five regional groups**

In `src/three/regions.js`, position the groups at Z values matching the data model. South includes animated water plane, houseboat silhouette, palms, and a temple tower. Deccan includes Hampi-style stone columns, boulders, palms, and bright coastal buildings. West/North includes a gateway arch, desert dunes, fort walls, and an ivory domed monument. Ganges includes stepped boxes, water, boats, and lamps. Himalayas includes layered mountains, snow caps, and cedar trees. Use `quality === 'mobile' ? 4 : 10` as the repeated-object density and do not load external models or textures.

- [ ] **Step 5: Run tests and production build**

Run: `npm test -- src/three/regions.test.js && npm run build`

Expected: 2 tests PASS and Vite build succeeds. If Git is initialized, commit with `git add src/three/primitives.js src/three/regions.js src/three/regions.test.js && git commit -m "feat: build low-poly India regions"`.

---

### Task 3: Renderer Lifecycle, Camera Journey, Atmosphere, and Fallback Signal

**Files:**
- Create: `src/three/indiaJourney.js`
- Create: `src/three/indiaJourney.test.js`
- Delete: `src/three/globe.js`

**Interfaces:**
- Consumes: `createIndiaRegions`, `createMaterials`, `disposeObject3D`, `getJourneyState`.
- Produces: `createIndiaJourney(canvas, options)` returning `{ setProgress(number), setPointer(x,y), setReducedMotion(boolean), pause(), resume(), dispose() }`.
- `options` is `{ quality: 'desktop'|'mobile', reducedMotion: boolean, onContextLost: () => void }`.

- [ ] **Step 1: Write renderer integration tests with a mocked WebGL renderer**

Create `src/three/indiaJourney.test.js` and mock `THREE.WebGLRenderer` with spies for `setPixelRatio`, `setSize`, `render`, and `dispose`. Assert that `createIndiaJourney` caps pixel ratio at 2, `setProgress(1)` moves the camera toward the Himalayan keyframe, `pause()` cancels rendering, the `webglcontextlost` handler calls `preventDefault()` and `onContextLost`, and `dispose()` removes listeners and calls the renderer's `dispose()`.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: FAIL because `indiaJourney.js` does not exist.

- [ ] **Step 3: Implement the renderer shell**

Create a scene with fog, perspective camera, hemisphere light, directional sunrise light, the regional root, route tube, and low-count ambient particles. Configure output color space and shadows only for desktop quality. Use:

```js
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'mobile' ? 1.25 : 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = quality === 'desktop'
```

`setProgress` stores `clamp01(value)`. Each frame calls `getJourneyState(progress)`, eases the camera and target toward that state, adds pointer parallax only when reduced motion is false, animates water/route/particles through named objects, updates fog and background colors, and renders once. Use `ResizeObserver`, `visibilitychange`, `webglcontextlost`, and `webglcontextrestored`. On unrecoverable context loss call `onContextLost`.

- [ ] **Step 4: Implement complete cleanup**

`dispose()` must cancel the animation frame, disconnect the observer, remove context and visibility listeners, dispose the regional root and renderer, and clear the canvas dimensions. Delete `src/three/globe.js` only after the new module tests pass.

- [ ] **Step 5: Verify lifecycle and build**

Run: `npm test -- src/three/indiaJourney.test.js && npm run build`

Expected: lifecycle tests PASS and build succeeds. If Git is initialized, commit with `git add src/three src/three/globe.js && git commit -m "feat: add scroll-driven India renderer"`.

---

### Task 4: Accessible React Hero and Journey Overlay

**Files:**
- Modify: `src/components/Hero3D.jsx`
- Modify: `src/components/Hero.jsx`
- Create: `src/components/JourneyOverlay.jsx`
- Create: `src/components/Hero.test.jsx`

**Interfaces:**
- `Hero3D({ progress, reducedMotion, onFallback })` owns canvas lifecycle.
- `JourneyOverlay({ stop, index, count, onExplore })` renders the accessible checkpoint UI.
- `Hero` owns progress and active-stop state and passes normalized progress to `Hero3D`.

- [ ] **Step 1: Write the failing hero behavior tests**

Mock `createIndiaJourney` and render `Hero`. Assert:

```js
expect(screen.getByRole('heading', { name: /Kerala Backwaters/i })).toBeInTheDocument()
expect(screen.getByRole('link', { name: /Explore Kerala Backwaters/i })).toHaveAttribute('href', '#destinations')
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '1')
expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '9')
```

Also stub `matchMedia('(prefers-reduced-motion: reduce)')` and assert `setReducedMotion(true)` is called. Trigger `onFallback` from the mock and assert the fallback region remains visible and destination navigation remains present.

- [ ] **Step 2: Run the hero tests and verify failure**

Run: `npm test -- src/components/Hero.test.jsx`

Expected: FAIL because the current hero contains the old headline and no journey progress.

- [ ] **Step 3: Implement the React-to-Three bridge**

In `Hero3D.jsx`, create the scene once and store it in a ref. Add window pointer movement, document visibility, and prop effects that call `setProgress` and `setReducedMotion`. Catch initialization errors, log `console.warn('India 3D journey failed to initialize:', error)`, and call `onFallback()`.

- [ ] **Step 4: Implement the 900vh guided hero and overlay**

`Hero` must render a `900vh` journey section containing a sticky `100vh` stage. Compute progress from `getBoundingClientRect()` using:

```js
const travel = Math.max(1, section.offsetHeight - window.innerHeight)
const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / travel))
```

Use `getJourneyState(progress)` for overlay copy. `JourneyOverlay` renders the regional kicker, stop name, description, progressbar (`aria-valuenow={index + 1}`), an explore link, and a scroll cue. When fallback is active, add a visible `role="status"` message reading “Showing the cinematic travel preview.” without exposing an error.

- [ ] **Step 5: Verify hero behavior**

Run: `npm test -- src/components/Hero.test.jsx && npm run build`

Expected: hero tests PASS and build succeeds. If Git is initialized, commit with `git add src/components/Hero* src/components/JourneyOverlay.jsx && git commit -m "feat: connect accessible India journey hero"`.

---

### Task 5: India Tourism Content and Existing Section Preservation

**Files:**
- Modify: `src/data.js`
- Modify: `src/components/Destinations.jsx`
- Modify: `src/components/Booking.jsx`
- Create: `src/components/PortalSections.test.jsx`

**Interfaces:**
- `destinations` remains an array consumed by `Destinations`.
- Each destination becomes `{ id, slug, name, state, tag, gradient, journeyStop }`.

- [ ] **Step 1: Write failing content and booking regression tests**

Render `Destinations` and assert Kerala, Hampi, Goa, Rajasthan, Agra, Varanasi, and the Himalayas appear. Render `Booking`, fill required fields, submit, and assert “Request received.” appears; click “Submit another” and assert the form returns.

- [ ] **Step 2: Run the regression test and verify failure**

Run: `npm test -- src/components/PortalSections.test.jsx`

Expected: destination assertions FAIL because the current data is international.

- [ ] **Step 3: Replace destination and testimonial copy**

Replace the six international cards with nine Indian cards matching the journey. Use real state/region labels and gradients only; no remote image URLs. Update testimonials to Indian tourism trips. Change the booking destination placeholder to “e.g. Kerala or Rajasthan”. Preserve the form state and success behavior unchanged.

- [ ] **Step 4: Add journey anchoring**

Give each destination card `id={\`destination-${d.slug}\`}` and `data-journey-stop={d.journeyStop}`. Keep the section id `destinations` so all hero checkpoint actions have a valid target.

- [ ] **Step 5: Verify retained portal behavior**

Run: `npm test -- src/components/PortalSections.test.jsx && npm run build`

Expected: all content and booking tests PASS. If Git is initialized, commit with `git add src/data.js src/components/Destinations.jsx src/components/Booking.jsx src/components/PortalSections.test.jsx && git commit -m "content: focus portal on Indian tourism"`.

---

### Task 6: Cinematic Visual System, Responsive Quality, and Entry Sequence

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/IntroGate.jsx`
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/Navbar.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Preserve the current app phases: `loading`, `gate`, and `site`.
- Preserve `IntroGate({ onEnter })`, `Preloader({ onDone })`, and `Navbar({ soundOn })`.

- [ ] **Step 1: Add static structure assertions**

Extend `Hero.test.jsx` to assert a sticky journey stage, overlay, booking CTA, menu button, sound control, and fallback class exist. Add an App test using fake timers to verify loading advances to the entry gate and entering reveals the site.

- [ ] **Step 2: Run tests and verify the new assertions fail**

Run: `npm test -- src/components/Hero.test.jsx src/App.test.jsx`

Expected: FAIL on the new cinematic structure and revised entry copy.

- [ ] **Step 3: Replace the old hero CSS**

Remove globe, orbit, floating-card, and old centered hero rules. Add styles for `.journey`, `.journey__stage`, `.journey__canvas`, `.journey__vignette`, `.journey-overlay`, `.journey-overlay__copy`, `.journey-progress`, `.journey-fallback`, and `.journey__scroll`. Use `position: sticky`, layered gradients, `clamp()` typography, translucent borders, text shadows, and safe contrast. Make the canvas cover the viewport.

- [ ] **Step 4: Restyle retained sections and controls**

Update tokens to sandstone gold, river blue, tropical green, deep indigo, and warm ivory. Apply route-line motifs and restrained glass surfaces to service, destination, statistics, testimonial, and booking panels. Restyle the navbar as a minimal right/edge overlay while keeping the mobile drawer functional. Update gate copy to “Your journey through India begins in the south.” and loader label to “India, one journey at a time.”

- [ ] **Step 5: Add explicit responsive and motion rules**

At widths below `768px`, shorten overlay copy width, reduce heading size, place controls inside safe-area padding, and hide decorative metadata. Add:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
  .journey { min-height: 160vh; }
}
```

Ensure focus-visible styles use a 2px warm-ivory outline with 3px offset.

- [ ] **Step 6: Verify UI and build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite emits a successful production build. If Git is initialized, commit with `git add src package.json package-lock.json vite.config.js && git commit -m "style: deliver cinematic India tourism portal"`.

---

### Task 7: Browser QA, Performance Checks, and Release Gate

**Files:**
- Create: `design-qa.md`
- Modify: any files from Tasks 1–6 only when a verified defect requires a fix.

**Interfaces:**
- Consumes the complete local app.
- Produces `design-qa.md` ending in exactly `final result: passed` or `final result: blocked`.

- [ ] **Step 1: Start the local app**

Run: `npm run dev -- --host 0.0.0.0 --port 4173 --strictPort`

Expected: Vite serves the site on port 4173 with no startup errors.

- [ ] **Step 2: Verify desktop behavior at 1440×900**

Check the loader, entry gate, sound choice, menu, nine scroll checkpoints, route movement, camera framing, every Explore action, transition to existing sections, destination cards, testimonials, booking submit/reset, and footer. Record console errors and visible layout defects.

- [ ] **Step 3: Verify mobile behavior at 390×844**

Check reduced object density, no horizontal overflow, readable overlays, usable menu, touch-safe calls to action, the complete retained page, booking fields, and stable scrolling.

- [ ] **Step 4: Verify accessibility and fallbacks**

Emulate reduced motion and confirm the shorter journey and disabled nonessential motion. Force `createIndiaJourney` to throw in development and confirm the cinematic fallback, navigation, and booking remain usable. Tab through the page and confirm visible focus order.

- [ ] **Step 5: Record and fix QA findings**

Write `design-qa.md` with sections for source qualities, desktop, mobile, interactions, accessibility, performance, console, P0–P3 findings, fixes, and final result. Fix all P0, P1, and P2 issues, recapture, and repeat the checks. Do not block handoff on optional P3 polish.

- [ ] **Step 6: Run the final release gate**

Run: `npm test && npm run build`

Expected: all tests PASS, build succeeds, and `design-qa.md` ends with `final result: passed`. If visual capture is unavailable, set `final result: blocked` and do not claim visual completion. If Git is initialized, commit with `git add . && git commit -m "test: verify India tourism 3D experience"`.

