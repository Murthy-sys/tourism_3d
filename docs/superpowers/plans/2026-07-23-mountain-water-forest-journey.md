# Mountain–Water–Forest Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the cinematic expedition as a realistic, continuously visible mountain → water → dense forest journey with trekker → boat → jeep transport handoffs.

**Architecture:** All three biome roots coexist in one shared coordinate system and use broad smootherstep transition weights instead of binary visibility. Shared mountain-shore and forest-inlet landmarks align terrain, routes, transports, and camera rails; deterministic builders provide natural terrain, reflective water, and layered forest detail. The existing React overlay and business content remain intact while Three.js scene orchestration is replaced.

**Tech Stack:** React 18, Three.js 0.160, custom BufferGeometry, MeshPhysicalMaterial/MeshStandardMaterial, Vitest, Playwright visual QA, Vite.

## Global Constraints

- The environment order is exactly mountain → water → forest.
- The traveler order is exactly guide with three tourists → rowing boat → jeep.
- Remove all monuments, the Ambassador car, and the car-to-jeep handoff from the cinematic journey.
- Keep Who We Are, plans, routes, booking, contact, menu, desktop/mobile behavior, and no-audio behavior.
- Keep the next biome visible from the current biome before reaching its transition boundary.
- Use broad overlapping transitions with no hard pop, camera snap, or vehicle crossing unsuitable terrain.
- Do not use snow, ice, Himalayan imagery, or cone-shaped mountains.
- Visual quality takes priority over performance optimization.

---

## File structure

- Create `src/three/terrain.js` and `src/three/terrain.test.js` for deterministic natural terrain, height/slope sampling, smootherstep weights, and shared landmarks.
- Create `src/three/hillWorld.js` and `src/three/hillWorld.test.js` for the mountain opening, descending trail, vegetation, rock, mist, and water landing.
- Create `src/three/trekkingParty.js` and `src/three/trekkingParty.test.js` for one guide and three tourists.
- Modify `src/three/waterWorld.js` and its test for reflective/depth water, shaped banks, shorelines, wake, and distant forest.
- Modify `src/three/jungleWorld.js` and its test for dense near/mid/far vegetation, forest inlet, landing, and collision-free jeep route.
- Modify `src/three/expeditionController.js`, `src/three/journeyData.js`, `src/three/indiaJourney.js`, and tests for reordered states, shared coordinates, continuous weights, prewarming, and camera/atmosphere blending.
- Modify `src/journey/chapters.js` and its test only where chapter labels must match the reordered natural biomes.
- Modify `scripts/visual-qa.mjs` and `design-qa.md` for desktop/mobile transition evidence.
- Delete `src/three/iceWorld.js` and its test after hill migration.
- Keep `src/three/monuments.js` available only for non-expedition legacy callers if one remains; remove all imports and runtime objects from the cinematic expedition.

### Task 1: Shared terrain, landmarks, and transition mathematics

**Files:**
- Create: `src/three/terrain.js`
- Create: `src/three/terrain.test.js`

**Interfaces:**
- Produces `LANDMARKS: {mountainStart, mountainLanding, forestLanding, forestEnd}` as frozen `[x,y,z]` arrays.
- Produces `smootherstep(edge0, edge1, value): number`.
- Produces `sampleMountainHeight(x, z): number`.
- Produces `sampleMountainSlope(x, z): number`.
- Produces `createTerrainGeometry(options): THREE.PlaneGeometry`.
- Produces `getBiomeWeights(progress): {mountain:number, water:number, forest:number}`.

- [ ] **Step 1: Write failing deterministic and overlap tests**

```js
import {describe,expect,it} from 'vitest'
import {LANDMARKS,createTerrainGeometry,getBiomeWeights,sampleMountainHeight,sampleMountainSlope,smootherstep} from './terrain'

describe('mountain-water-forest terrain contracts',()=>{
  it('creates deterministic irregular terrain without radial cone symmetry',()=>{
    expect(sampleMountainHeight(5,-9)).toBe(sampleMountainHeight(5,-9))
    expect(new Set([-12,-6,0,6,12].map(x=>sampleMountainHeight(x,-18).toFixed(3))).size).toBeGreaterThan(3)
    expect(sampleMountainSlope(5,-9)).toBeGreaterThanOrEqual(0)
    const geometry=createTerrainGeometry({width:20,depth:30,segmentsX:10,segmentsZ:12,heightAt:sampleMountainHeight})
    expect(geometry.attributes.position.count).toBe(143)
  })

  it('keeps adjacent biomes overlapping and normalized',()=>{
    expect(smootherstep(0,1,.5)).toBeCloseTo(.5)
    for(const p of [.2,.3,.4,.5,.6,.7,.8]){
      const weights=getBiomeWeights(p)
      expect(weights.mountain+weights.water+weights.forest).toBeCloseTo(1,6)
    }
    expect(getBiomeWeights(.31).mountain).toBeGreaterThan(.05)
    expect(getBiomeWeights(.31).water).toBeGreaterThan(.05)
    expect(getBiomeWeights(.66).water).toBeGreaterThan(.05)
    expect(getBiomeWeights(.66).forest).toBeGreaterThan(.05)
    expect(Object.isFrozen(LANDMARKS)).toBe(true)
  })
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/terrain.test.js`

Expected: FAIL because `terrain.js` does not exist.

- [ ] **Step 3: Implement deterministic terrain and shared landmarks**

```js
import * as THREE from 'three'

export const LANDMARKS=Object.freeze({
  mountainStart:Object.freeze([0,5,12]),
  mountainLanding:Object.freeze([2,.35,-34]),
  forestLanding:Object.freeze([-2,.25,-86]),
  forestEnd:Object.freeze([1,.2,-132]),
})
export const smootherstep=(a,b,value)=>{
  const t=THREE.MathUtils.clamp((value-a)/(b-a||1),0,1)
  return t*t*t*(t*(t*6-15)+10)
}
const ridge=(x,z)=>Math.sin(x*.17+Math.sin(z*.08))*2.5+Math.cos(z*.11-x*.09)*1.8+Math.sin((x+z)*.29)*.65
export const sampleMountainHeight=(x,z)=>Math.max(0,(ridge(x,z)+4.4)*smootherstep(-38,8,z))
export const sampleMountainSlope=(x,z)=>{
  const d=.15
  return Math.hypot(sampleMountainHeight(x+d,z)-sampleMountainHeight(x-d,z),sampleMountainHeight(x,z+d)-sampleMountainHeight(x,z-d))/(d*2)
}
export const getBiomeWeights=progress=>{
  const waterIn=smootherstep(.22,.42,progress)
  const forestIn=smootherstep(.56,.76,progress)
  const raw={mountain:1-waterIn,water:waterIn*(1-forestIn),forest:forestIn}
  const total=raw.mountain+raw.water+raw.forest
  return Object.fromEntries(Object.entries(raw).map(([key,value])=>[key,value/total]))
}
```

Implement `createTerrainGeometry` by rotating a segmented plane, replacing each vertex Y with `heightAt(x,z)`, computing normals, and attaching a normalized `slope` buffer attribute.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- src/three/terrain.test.js`

Expected: all terrain tests pass.

```bash
git add src/three/terrain.js src/three/terrain.test.js
git commit -m "Add shared expedition terrain contracts"
```

### Task 2: Natural mountain opening and guide-led trekking party

**Files:**
- Create: `src/three/hillWorld.js`
- Create: `src/three/hillWorld.test.js`
- Create: `src/three/trekkingParty.js`
- Create: `src/three/trekkingParty.test.js`

**Interfaces:**
- Consumes `LANDMARKS`, `sampleMountainHeight`, `sampleMountainSlope`, and `createTerrainGeometry`.
- Produces `createHillWorld(materials, quality): THREE.Group`.
- Produces `updateHillWorld(world, elapsed): void`.
- Produces `createTrekkingParty(materials): THREE.Group`.
- Produces `updateTrekkingParty(party, curve, progress, elapsed, reducedMotion, heightAt): void`.
- Hill `userData` exposes `route`, `heightAt`, `landing`, and `distantWaterAnchor`.

- [ ] **Step 1: Write failing hill and party tests**

```js
it('builds a natural mountain opening with a visible water destination',()=>{
  const world=createHillWorld(createMaterials(),'desktop')
  ;['hill-terrain','hill-ridges','hill-rock-faces','hill-vegetation','hill-mist','hill-trail','mountain-water-landing','distant-water-glint']
    .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  ;['glacier','drifting-snow','ice-foreground','monument']
    .forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
  expect(world.userData.route.getPoints(24).every(point=>Math.abs(point.y-world.userData.heightAt(point.x,point.z))<.3)).toBe(true)
})

it('creates one guide and three independently phased tourists',()=>{
  const party=createTrekkingParty(createMaterials())
  expect(party.userData.members).toHaveLength(4)
  expect(party.userData.members.filter(member=>member.role==='guide')).toHaveLength(1)
  expect(party.userData.members.filter(member=>member.role==='tourist')).toHaveLength(3)
  expect(new Set(party.userData.members.map(member=>member.phase)).size).toBe(4)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Build natural terrain and mountain depth**

Create a 72×78 displaced foreground terrain with 112×120 desktop segments and 64×76 mobile segments. Color vertices by height and slope using grass `#49683c`, soil `#6b5841`, and rock `#59615e`. Build three irregular displaced ridge ribbons behind it with progressively cooler, lighter materials. Add deterministic rock outcrops, bushes, grass clusters, and varied hill trees outside a 1.3-unit trail corridor.

- [ ] **Step 4: Build the descending trail and water reveal**

Create 32 route points from `LANDMARKS.mountainStart` to `LANDMARKS.mountainLanding`; set each Y to `sampleMountainHeight(x,z)+.08`. Add a narrow earth ribbon, wet stones and reeds near the bottom, a timber landing, mist pockets, and a broad low-opacity `distant-water-glint` plane framed between ridges so water is visible from the opening camera.

- [ ] **Step 5: Build and animate the four-person trekking party**

Use an articulated member factory with head, hair, layered torso, trousers, boots, backpack, straps, roll mat, arms, legs, and walking pole. Give the guide a green jacket and ochre pack; use distinct navy/yellow, rust/charcoal, and teal/tan tourist palettes. Store phases `[0,1.37,2.91,4.42]` and route offsets `[0,.055,.11,.165]`. Plant every root at `heightAt(x,z)`, face the route tangent, animate opposite limbs, and disable secondary sway under reduced motion.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: hill and party tests pass.

```bash
git add src/three/hillWorld.js src/three/hillWorld.test.js src/three/trekkingParty.js src/three/trekkingParty.test.js
git commit -m "Build natural mountain trekking opening"
```

### Task 3: Reflective water corridor and mountain-to-boat landing

**Files:**
- Modify: `src/three/waterWorld.js`
- Modify: `src/three/waterWorld.test.js`
- Modify: `src/three/expeditionVehicles.js`
- Modify: `src/three/expeditionVehicles.test.js`

**Interfaces:**
- Consumes `LANDMARKS.mountainLanding` and `LANDMARKS.forestLanding`.
- Preserves `createWaterWorld`, `updateWaterWorld`, `createExpeditionBoat`, and `updateBoat`.
- Water `userData` exposes `route`, `mountainLanding`, `forestLanding`, `surfaceMaterials`, and `forestSightline`.

- [ ] **Step 1: Write failing realistic-water tests**

```js
it('creates a shaped reflective corridor with two aligned landings',()=>{
  const water=createWaterWorld(createMaterials(),'desktop')
  ;['water-depth-layer','water-reflection-layer','water-shallows','curved-river-banks','mountain-water-landing','forest-water-landing','distant-forest-silhouette']
    .forEach(name=>expect(water.getObjectByName(name)).toBeTruthy())
  expect(water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(2)
  expect(water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
  expect(water.userData.surfaceMaterials.every(material=>material.roughness<.45)).toBe(true)
})

it('keeps the articulated boat and visible wake',()=>{
  const boat=createExpeditionBoat(createMaterials())
  expect(boat.getObjectByName('boat-rower')).toBeTruthy()
  expect(boat.getObjectByName('boat-oar-left')).toBeTruthy()
  expect(boat.getObjectByName('boat-oar-right')).toBeTruthy()
  expect(boat.getObjectByName('boat-wake')).toBeTruthy()
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: FAIL because the depth/reflection/shoreline groups and shared landing alignment are absent.

- [ ] **Step 3: Build a believable water body**

Replace the flat rectangular presentation with a curved 50-unit corridor. Use a dark depth mesh beneath a translucent `MeshPhysicalMaterial` surface with `roughness:.18`, `metalness:.05`, `transmission:.12`, `clearcoat:1`, and depth-based blue-green vertex colors. Add a second reflection mesh, independently animated wave vertices, pale shallows, wet stones, foam accents, reeds, bank shadows, and curved irregular bank meshes.

- [ ] **Step 4: Align the route, wake, and distant forest**

Construct the boat curve from the two shared landmarks with gentle lateral bends. Orient landings to route tangents. Add multiple overlapping dark-green canopy silhouette bands at the forest end so the forest is readable from mid-water. Update the wake behind the boat from its route tangent and animate oars, ripples, reflection layer, and surface layer at different frequencies.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: water and boat tests pass.

```bash
git add src/three/waterWorld.js src/three/waterWorld.test.js src/three/expeditionVehicles.js src/three/expeditionVehicles.test.js
git commit -m "Build realistic reflective water corridor"
```

### Task 4: Dense forest finale and boat-to-jeep landing

**Files:**
- Modify: `src/three/jungleWorld.js`
- Modify: `src/three/jungleWorld.test.js`

**Interfaces:**
- Consumes `LANDMARKS.forestLanding` and `LANDMARKS.forestEnd`.
- Preserves `createJungleWorld(materials, quality)` and `world.userData.route`.
- Adds `forest-inlet`, `forest-water-landing`, `forest-near-layer`, `forest-mid-layer`, `forest-far-layer`, `jungle-undergrowth`, `jungle-vines`, and `jungle-mist`.

- [ ] **Step 1: Write failing forest-density and clearance tests**

```js
it('creates layered dense forest around a clear jeep route',()=>{
  const world=createJungleWorld(createMaterials(),'desktop')
  ;['forest-inlet','forest-water-landing','forest-near-layer','forest-mid-layer','forest-far-layer','jungle-undergrowth','jungle-vines','jungle-mist']
    .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
  expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(180)
  expect(world.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
  expect(world.userData.routeClearance).toBeGreaterThanOrEqual(1.4)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/jungleWorld.test.js`

Expected: FAIL because layered groups, density counters, and shared inlet alignment are absent.

- [ ] **Step 3: Build the inlet and physical handoff**

Create wet banks, reeds, roots, puddles, stones, overhanging branches, and a timber landing around `LANDMARKS.forestLanding`. Start the jeep curve at the landing and end at `LANDMARKS.forestEnd`. Keep all trunks, rocks, and fallen timber at least 1.4 units from sampled route points.

- [ ] **Step 4: Build dense near/mid/far forest**

Use deterministic hashed placement rather than rows. Create at least six crown silhouettes, tapered trunks, branch forks, vines, ferns, shrubs, grass, fallen logs, roots, damp soil, puddles, low mist, and sparse sun shafts. Desktop minimums are 90 trees and 180 undergrowth objects; mobile minimums are 55 and 110. Preserve canopy silhouette and transition landmarks before reducing secondary instances.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js`

Expected: forest and jeep tests pass.

```bash
git add src/three/jungleWorld.js src/three/jungleWorld.test.js
git commit -m "Build dense forest expedition finale"
```

### Task 5: Reorder the expedition and blend every transition

**Files:**
- Modify: `src/three/expeditionController.js`
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`
- Delete: `src/three/iceWorld.js`
- Delete: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes `getBiomeWeights`, `createHillWorld`, `createTrekkingParty`, `createWaterWorld`, and `createJungleWorld`.
- Produces `getExpeditionTransition(state): {worlds,transports,cameraBlend}`.
- `worlds` keys are exactly `mountain`, `water`, and `forest`.
- `transports` keys are exactly `trekker`, `boat`, and `jeep`.

- [ ] **Step 1: Write failing state-order and continuity tests**

```js
it('uses the required biome and transport order',()=>{
  expect([.05,.5,.9].map(p=>getExpeditionState(p).activeTransport)).toEqual(['trekker','boat','jeep'])
  expect([.05,.5,.9].map(p=>getExpeditionState(p).biome)).toEqual(['mountain','water','forest'])
  expect(JSON.stringify(getExpeditionState(.5))).not.toMatch(/ambassador|monument|ice/i)
})

it('keeps worlds active and adjacent transports overlapping',()=>{
  const mountainHandoff=getExpeditionTransition(getExpeditionState(.34))
  expect(Object.keys(mountainHandoff.worlds)).toEqual(['mountain','water','forest'])
  expect(mountainHandoff.transports.trekker).toBeGreaterThan(.05)
  expect(mountainHandoff.transports.boat).toBeGreaterThan(.05)
  const forestHandoff=getExpeditionTransition(getExpeditionState(.68))
  expect(forestHandoff.transports.boat).toBeGreaterThan(.05)
  expect(forestHandoff.transports.jeep).toBeGreaterThan(.05)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js`

Expected: FAIL because the current order starts with Ambassador/jungle and uses binary world visibility.

- [ ] **Step 3: Define the new journey phases**

Use these progress ranges:

```js
if(p<.28)return{phase:'mountain-trek',biome:'mountain',activeTransport:'trekker',localProgress:p/.28}
if(p<.42)return{phase:'trek-to-boat',biome:'mountain-water',activeTransport:'trekker',localProgress:(p-.28)/.14}
if(p<.60)return{phase:'water-boat',biome:'water',activeTransport:'boat',localProgress:(p-.42)/.18}
if(p<.74)return{phase:'boat-to-jeep',biome:'water-forest',activeTransport:'boat',localProgress:(p-.60)/.14}
if(p<.94)return{phase:'forest-jeep',biome:'forest',activeTransport:'jeep',localProgress:(p-.74)/.20}
return{phase:'contact',biome:'forest',activeTransport:'jeep',localProgress:(p-.94)/.06}
```

Update plan focus and chapter labels without removing existing overlay content.

- [ ] **Step 4: Replace scene composition and binary visibility**

Instantiate mountain, water, and forest once at shared coordinates. Attach the party, boat, and jeep to the scene or a shared transport root so their route points remain in the same coordinate space. Keep all biome roots visible. Capture base material state once and apply biome/transport opacity weights without mutating shared materials. Remove Ambassador creation/update, monument visibility, travel-route, and expedition ice imports.

- [ ] **Step 5: Blend transports, camera, fog, and lighting**

Use `smootherstep` over the full `.28–.42` and `.60–.74` handoff ranges. Place both transports at the same physical landing, overlap opacity, and hold each inactive transport at its endpoint. Add camera keyframes before, at, and after both landings; interpolate position and target with smootherstep plus delta-based damping `1-Math.exp(-delta*4.5)`. Blend background, fog near/far, exposure, hemisphere intensity, and directional-light color from the same biome weights. Use camera far plane `420` and fog far values that preserve the distant water and forest silhouettes.

- [ ] **Step 6: Prewarm and harden navigation**

Call `renderer.compile(scene,camera)` after world construction. Ensure menu progress jumps update camera and target through damping rather than direct assignment. Keep mobile framing for the four-person party and each landing. Retain WebGL context-loss fallback and dispose every new geometry/material on unmount.

- [ ] **Step 7: Run GREEN and commit**

Run: `npm test -- src/three/journeyData.test.js src/three/expeditionController.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`

Expected: all reordered journey, continuous transition, overlay, and camera tests pass.

```bash
git add src/three/expeditionController.js src/three/expeditionController.test.js src/three/journeyData.js src/three/journeyData.test.js src/three/indiaJourney.js src/three/indiaJourney.test.js src/journey/chapters.js src/journey/chapters.test.js src/three/iceWorld.js src/three/iceWorld.test.js
git commit -m "Reorder expedition through mountain water forest"
```

### Task 6: Full regression and desktop/mobile visual acceptance

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- `window.__journeyQA()` returns `phase`, `biomeWeights`, `transportWeights`, `visibleMembers`, `distantVisibility`, `cameraJump`, `consoleFailures`, and `audioControls`.
- Visual QA produces desktop and mobile captures at mountain opening, distant water reveal, first handoff, water corridor, distant forest reveal, second handoff, and forest finale.

- [ ] **Step 1: Add fail-closed QA assertions**

```js
const snapshot=await page.evaluate(()=>window.__journeyQA())
if(snapshot.visibleMembers.guides!==1||snapshot.visibleMembers.tourists!==3)throw new Error('Trekking party is incomplete')
if(snapshot.audioControls!==0)throw new Error('Audio controls returned')
if(snapshot.consoleFailures.length)throw new Error(snapshot.consoleFailures.join('\n'))
if(snapshot.cameraJump>.8)throw new Error(`Camera discontinuity: ${snapshot.cameraJump}`)
if(!snapshot.distantVisibility.nextBiome)throw new Error('Upcoming biome is not visible early')
```

At each handoff require both adjacent transport weights and both adjacent biome weights to exceed `.05`.

- [ ] **Step 2: Run focused and full automated verification**

Run: `npm test -- --run`

Expected: all test files pass with no failures.

Run: `npm run build`

Expected: Vite production build succeeds; a chunk-size warning is acceptable.

- [ ] **Step 3: Run desktop visual QA**

Run: `node scripts/visual-qa.mjs --project desktop`

Expected: seven desktop screenshots, empty failure arrays, correct party count, early next-biome visibility, and overlapping handoff weights.

- [ ] **Step 4: Run mobile visual QA**

Run: `node scripts/visual-qa.mjs --project mobile`

Expected: seven mobile screenshots, no clipping or horizontal overflow, empty failure arrays, correct party count, and visible handoffs.

- [ ] **Step 5: Inspect all screenshots and repair visual defects**

Inspect every full-page and isolated WebGL capture. Reject and repair any monument/Ambassador object, artificial cone hill, flat opaque-blue water, sparse/repeated forest, late biome pop, route obstruction, floating person, unsuitable vehicle placement, camera snap, hard fade line, unreadable overlay, or clipped mobile composition. Re-run the affected automated and visual checks after each repair.

- [ ] **Step 6: Document evidence and commit**

Record viewport, progress, phase, transport weights, biome weights, party counts, distant biome visibility, camera continuity, console state, and screenshot paths in `design-qa.md`.

```bash
git add scripts/visual-qa.mjs design-qa.md
git commit -m "Verify mountain water forest journey"
```

- [ ] **Step 7: Final branch verification**

Run: `npm test -- --run && npm run build && git diff --check`

Expected: all tests pass, the production build succeeds, and `git diff --check` prints nothing.
