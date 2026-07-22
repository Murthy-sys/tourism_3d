# Realistic Journey Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the procedural opening car, water boat, and ice trekker with licensed, high-detail PBR 3D subjects that match the approved references and retain all existing journey behavior.

**Architecture:** A focused `journeyAssets` module owns GLTF loading, caching, normalization, and fallback. Each subject adapter exposes the same route-update contract already consumed by `indiaJourney.js` and `expeditionController.js`, while model-specific modules own materials, animation mixers, named anchors, and reference-matching accessories.

**Tech Stack:** React 18, Three.js 0.169, `GLTFLoader`, Vitest, Playwright visual QA, Vite static assets.

## Global Constraints

- The car follows the modern white retro EV in the foreground of `amb1.jpeg`.
- The boat follows `boat3d.jpeg`: teal open hull, orange-clad rower, teal oars, and orange blades.
- The trekker follows `trekker 3d.jpeg`: yellow top, dark lower clothing, purple backpack, sleeping roll, boots, and wooden walking stick.
- The supplied JPEG files guide the design but are never rendered as flat cutouts.
- Every external model must have a recorded source URL, author, and redistribution-compatible license.
- Preserve the existing environments, copy, chapter order, menu, booking, route timing, and staged handoffs.
- Do not reintroduce background audio or sound controls.
- Detailed assets may be large; visual quality takes priority over download size and frame rate.

---

## File structure

- Create `public/models/journey/` for licensed GLB files and their textures.
- Create `public/models/journey/ATTRIBUTION.md` for source and license records.
- Create `src/three/journeyAssets.js` for GLTF loading, cache behavior, model cloning, and fallback selection.
- Create `src/three/journeyAssets.test.js` for loader and fallback contracts.
- Create `src/three/realisticCar.js` for car normalization, materials, wheel anchors, lights, traveller, and route animation.
- Create `src/three/realisticCar.test.js` for car visual contracts and animation.
- Create `src/three/realisticBoat.js` for boat normalization, rower rig, oar pivots, wake anchors, and rowing animation.
- Create `src/three/realisticBoat.test.js` for boat contracts and animation.
- Create `src/three/realisticTrekker.js` for rig/material adaptation, backpack kit, stick contact, and walk animation.
- Create `src/three/realisticTrekker.test.js` for trekker contracts and animation.
- Modify `src/three/ambassador.js` to remain the synchronous car fallback.
- Modify `src/three/expeditionVehicles.js` to retain the synchronous boat and trekker fallbacks.
- Modify `src/three/indiaJourney.js` to preload and replace the opening car safely.
- Modify `src/three/expeditionController.js` to preload and replace boat/trekker safely.
- Modify `src/components/IntroGate.jsx` to begin preload before Start without delaying interaction indefinitely.
- Modify `scripts/visual-qa.mjs` and `design-qa.md` to validate the detailed models.

### Task 1: License and asset intake

**Files:**
- Create: `public/models/journey/retro-ev.glb`
- Create: `public/models/journey/rowing-boat.glb`
- Create: `public/models/journey/trekker.glb`
- Create: `public/models/journey/ATTRIBUTION.md`

**Interfaces:**
- Produces: `/models/journey/retro-ev.glb`, `/models/journey/rowing-boat.glb`, `/models/journey/trekker.glb`.
- Consumes: Sketchfab download pages and their displayed Creative Commons Attribution license metadata.

- [ ] **Step 1: Acquire and inspect the retro-futuristic car**

Use the downloadable CC Attribution model from `https://sketchfab.com/3d-models/retro-futuristic-car-0b9a8e5101ab49ef88caa8d257c620f3`. Export or convert the downloaded source to a self-contained GLB named `retro-ev.glb`. Confirm the model contains a body, four separable wheels, glazing, and front lamps; reject it if any of those elements are absent.

- [ ] **Step 2: Acquire and inspect the PBR rowboat**

Use the downloadable CC Attribution model from `https://sketchfab.com/3d-models/old-boat-a9ce4ca0cac14f448c72bb94ad193437`. Export or convert it to `rowing-boat.glb`. Confirm the boat is UV unwrapped, PBR textured, and includes two separate oars.

- [ ] **Step 3: Acquire and inspect the hiker**

Use the downloadable CC Attribution model from `https://sketchfab.com/3d-models/sierra-the-trailblazer-1aa1024827a743848b979a5530075506`. Export or convert it to `trekker.glb`. Confirm the model has a usable humanoid hierarchy, backpack, boots, and separate trekking poles. If its download does not contain a humanoid rig, use the CC Attribution alternative at `https://sketchfab.com/3d-models/stylized-outdoor-explorer-hiker-character-963b29cbb3a9403daa62dfb54b0cb81d` only if that archive contains a usable rig.

- [ ] **Step 4: Record attribution exactly**

Create `ATTRIBUTION.md` with one section per selected asset containing title, author display name, source URL, license name, license URL `https://creativecommons.org/licenses/by/4.0/`, and a list of modifications: GLB conversion, material recoloring, scale/orientation normalization, accessory changes, and animation adaptation.

- [ ] **Step 5: Validate GLB integrity**

Run:

```bash
npx gltf-validator public/models/journey/retro-ev.glb
npx gltf-validator public/models/journey/rowing-boat.glb
npx gltf-validator public/models/journey/trekker.glb
```

Expected: all three commands exit `0`, contain no `ERROR` entries, and resolve every referenced image and buffer.

- [ ] **Step 6: Commit the licensed inputs**

```bash
git add public/models/journey
git commit -m "Add licensed journey model assets"
```

### Task 2: Cached GLTF loader and safe fallback contract

**Files:**
- Create: `src/three/journeyAssets.js`
- Create: `src/three/journeyAssets.test.js`
- Modify: `src/components/IntroGate.jsx`

**Interfaces:**
- Produces: `preloadJourneyAssets(): Promise<AssetLoadResult[]>`, `loadJourneyAsset(key, fallbackFactory): Promise<THREE.Group>`, and `clearJourneyAssetCache(): void`.
- Asset keys: `'retroEv' | 'rowingBoat' | 'trekker'`.
- Returned groups expose `userData.assetSource` equal to `'gltf'` or `'fallback'`.

- [ ] **Step 1: Write failing loader tests**

Create tests that inject a fake `loadAsync`, call `loadJourneyAsset('retroEv', fallback)`, and assert: two simultaneous calls invoke the loader once; each call receives a distinct cloned scene; a rejected load returns a fallback group tagged `assetSource: 'fallback'`; and `preloadJourneyAssets()` resolves all three keys without throwing.

- [ ] **Step 2: Run the loader tests and verify RED**

Run: `npm test -- src/three/journeyAssets.test.js`

Expected: FAIL because `journeyAssets.js` does not exist.

- [ ] **Step 3: Implement the loader**

Use one `GLTFLoader`, a `Map<string, Promise<GLTF>>`, and `SkeletonUtils.clone` for independent scene instances. Map keys to the exact public URLs from Task 1. Catch failures only at the `loadJourneyAsset` boundary, call the provided synchronous fallback factory, and tag every result in `userData`.

- [ ] **Step 4: Start preload from the gate**

Import `preloadJourneyAssets` in `IntroGate.jsx`, invoke it in a mount effect, and deliberately do not await it in `handleEnter`; Start must remain usable even if a model request fails or is slow.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- src/three/journeyAssets.test.js src/components/IntroGate.test.jsx`

Expected: both files pass and no unhandled rejection is logged.

- [ ] **Step 6: Commit**

```bash
git add src/three/journeyAssets.js src/three/journeyAssets.test.js src/components/IntroGate.jsx src/components/IntroGate.test.jsx
git commit -m "Add resilient journey model loader"
```

### Task 3: Reference-matched realistic retro EV

**Files:**
- Create: `src/three/realisticCar.js`
- Create: `src/three/realisticCar.test.js`
- Modify: `src/three/indiaJourney.js`

**Interfaces:**
- Produces: `prepareRealisticCar(scene): THREE.Group` and `updateRealisticCar(car, curve, progress, elapsed, reducedMotion): void`.
- Prepared car exposes `userData.wheels`, `userData.body`, `userData.headlights`, `userData.traveller`, and `userData.lastProgress`.

- [ ] **Step 1: Write failing car contract tests**

Build a representative imported group with named wheel/body/glass meshes. Assert that preparation produces pearl-white clearcoat body material, dark transparent glass, four wheel anchors, two emissive circular headlamp assemblies, a black roof, a visible traveller, cast/receive shadows, and the existing `ambassador-vehicle` root name. Assert route update changes position and wheel rotation.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/three/realisticCar.test.js`

Expected: FAIL because `prepareRealisticCar` is unavailable.

- [ ] **Step 3: Implement car preparation**

Normalize the imported root to the current fallback's world dimensions. Identify wheels by case-insensitive `/wheel|tyre|tire/` names, body by `/body|paint|shell/`, and glass by `/glass|window|windshield/`. Apply `MeshPhysicalMaterial` to the body with `color: '#f4f5f2'`, `roughness: 0.18`, `metalness: 0.18`, and `clearcoat: 1`. Add original high-segment circular LED headlamp rings and a black panoramic roof mesh only when the source lacks those reference features.

- [ ] **Step 4: Preserve journey integration**

Create the existing procedural car immediately, then call `loadJourneyAsset('retroEv', createAmbassador)`. When resolved, copy route state and replace the fallback in the same parent without changing chapter progress. Route all later frame updates to `updateRealisticCar`, which shares the current curve-following and distance-based wheel-rotation behavior.

- [ ] **Step 5: Verify GREEN**

Run: `npm test -- src/three/realisticCar.test.js src/three/ambassador.test.js src/three/indiaJourney.test.js`

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/three/realisticCar.js src/three/realisticCar.test.js src/three/indiaJourney.js
git commit -m "Upgrade opening car to realistic retro EV"
```

### Task 4: Realistic rowboat, rower, and synchronized oars

**Files:**
- Create: `src/three/realisticBoat.js`
- Create: `src/three/realisticBoat.test.js`
- Modify: `src/three/expeditionController.js`

**Interfaces:**
- Produces: `prepareRealisticBoat(scene): THREE.Group` and `updateRealisticBoat(boat, curve, progress, elapsed, reducedMotion): void`.
- Prepared boat exposes `userData.wakeAnchors`, `userData.rower`, `userData.oars`, and `userData.rowingRig`.

- [ ] **Step 1: Write failing boat tests**

Assert that preparation creates a teal PBR hull, two independently pivoted oars with teal shafts and orange blades, a seated orange-clad rower, two wake anchors, and cast/receive shadows. Advance time by half a rowing cycle and assert both oars, both elbows, and the torso change rotation while remaining mirrored.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/three/realisticBoat.test.js`

Expected: FAIL because the realistic boat adapter does not exist.

- [ ] **Step 3: Implement boat preparation**

Normalize and recolor the imported hull to deep teal `#176f70` while retaining its normal/roughness/AO maps. Re-parent each imported oar under an oarlock pivot. Build a proportioned articulated rower from rounded high-segment geometry if the source boat has no rigged occupant; use an orange technical vest, skin material with roughness variation, dark shorts, shoes, hair, and beard.

- [ ] **Step 4: Implement the rowing cycle**

Use a four-phase sinusoidal stroke. Couple oar sweep and feather, torso lean, shoulder rotation, elbow bend, and hand travel. Preserve route following, subtle buoyancy, wake anchors, and reduced-motion behavior. Reduced motion holds the rower in a readable mid-stroke pose and disables secondary rocking.

- [ ] **Step 5: Replace the fallback safely**

In `expeditionController.js`, add the procedural boat synchronously and replace it when `loadJourneyAsset('rowingBoat', createExpeditionBoat)` resolves. Preserve visibility, route state, and the water-world wake reference.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm test -- src/three/realisticBoat.test.js src/three/expeditionVehicles.test.js src/three/expeditionController.test.js src/three/waterWorld.test.js`

Expected: all tests pass.

```bash
git add src/three/realisticBoat.js src/three/realisticBoat.test.js src/three/expeditionController.js
git commit -m "Add realistic animated rowing sequence"
```

### Task 5: Rigged trekker and planted walking-stick animation

**Files:**
- Create: `src/three/realisticTrekker.js`
- Create: `src/three/realisticTrekker.test.js`
- Modify: `src/three/expeditionController.js`

**Interfaces:**
- Produces: `prepareRealisticTrekker(scene, animations): THREE.Group` and `updateRealisticTrekker(trekker, curve, progress, elapsed, reducedMotion): void`.
- Prepared trekker exposes `userData.mixer`, `userData.walkAction`, `userData.backpack`, `userData.sleepingRoll`, `userData.stick`, and `userData.stickHand`.

- [ ] **Step 1: Write failing trekker tests**

Use a small test skeleton with hips, spine, upper/lower limbs, hands, and feet. Assert preparation applies a yellow upper garment and dark lower garment, creates or retains a purple backpack and sleeping roll, parents a wooden stick to one hand, enables shadows, and exposes a playable walk action. Assert update advances the mixer and alternates the stick plant with the opposite foot.

- [ ] **Step 2: Verify RED**

Run: `npm test -- src/three/realisticTrekker.test.js`

Expected: FAIL because the realistic trekker adapter does not exist.

- [ ] **Step 3: Implement trekker preparation**

Normalize the rig, keep the source skinning, and retarget the best walk clip to a loop. Recolor garment meshes by semantic name and material slot. Add a detailed purple backpack, top sleeping roll, straps, buckles, and wooden stick only where the source lacks them. Parent accessories to the spine and hand bones so they follow animation.

- [ ] **Step 4: Implement route and contact timing**

Advance the animation mixer from elapsed delta, follow the existing ice route, align the root to route tangent, and use the walk phase to add a small stick-pivot correction at ground contact. In reduced motion, pause secondary accessory motion and use a stable planted pose.

- [ ] **Step 5: Replace the fallback safely**

Extend the expedition controller's async replacement path for `loadJourneyAsset('trekker', createTrekker)`. Preserve the `ice-trekker` root name so current camera-follow code continues to work.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npm test -- src/three/realisticTrekker.test.js src/three/expeditionVehicles.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js src/three/iceWorld.test.js`

Expected: all tests pass.

```bash
git add src/three/realisticTrekker.js src/three/realisticTrekker.test.js src/three/expeditionController.js
git commit -m "Add realistic animated ice trekker"
```

### Task 6: Lighting, visual QA, and release evidence

**Files:**
- Modify: `src/three/indiaJourney.js`
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- Consumes: detailed car, boat, and trekker roots from Tasks 3–5.
- Produces: desktop/mobile screenshots and a final QA record.

- [ ] **Step 1: Add visual readiness checks**

Extend `visual-qa.mjs` to wait for `[data-journey-assets="ready"]` with a bounded timeout, then record `assetSource` for the car, boat, and trekker through a development-only `window.__journeyQA` snapshot. Fail the script if any subject reports `fallback` during the production-asset run.

- [ ] **Step 2: Run focused visual QA and inspect frames**

Run:

```bash
node scripts/visual-qa.mjs desktop
node scripts/visual-qa.mjs mobile
```

Expected: `soundControls: 0`, `horizontalOverflow: false`, `messages: []`, `bookingSubmitted: true`, and all three asset sources equal `gltf`. Inspect opening-drive, water-boat, ice-trek, both adjoining handoffs, menu, and booking screenshots.

- [ ] **Step 3: Tune only integration parameters**

Adjust model-local scale, offsets, exposure, shadow bias, and material intensity in the three adapter modules. Do not shorten the journey, remove scene geometry, or reduce the detailed assets to satisfy framing.

- [ ] **Step 4: Run complete verification**

```bash
npm test -- --run
npm run build
node scripts/visual-qa.mjs desktop
node scripts/visual-qa.mjs mobile
```

Expected: every unit test passes, Vite exits `0`, both visual scripts exit `0`, no console errors occur, and all existing interaction checks remain green.

- [ ] **Step 5: Update QA evidence and commit**

Update `design-qa.md` with the three asset titles, source/license status, observed desktop/mobile framing, animation results, handoff results, fallback test result, and the final commands.

```bash
git add src/three scripts/visual-qa.mjs design-qa.md public/models/journey/ATTRIBUTION.md
git commit -m "Verify realistic journey models"
```
