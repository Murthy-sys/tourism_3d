# Continuous Realistic Landscape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one dense continuous forest–water–hill expedition with smooth physical handoffs, realistic lush terrain, and a guide-led party of three tourists.

**Architecture:** Deterministic terrain utilities provide shared height sampling and smooth transition weights. Forest, water corridor, and hill-country modules coexist in one landscape controller; the controller blends visibility, fog, lighting, and transport states instead of switching whole worlds on and off. A dedicated trekking-party module owns four independently phased walkers and terrain-following route updates.

**Tech Stack:** React 18, Three.js 0.160, custom buffer geometry, MeshPhysicalMaterial/MeshStandardMaterial, Vitest, Playwright visual QA, Vite.

## Global Constraints

- Retain the current opening car, jungle jeep, upgraded teal rowboat, interface, menu, plans, contact experience, and booking flow. Update only snow/Himalaya-specific plan copy so it accurately describes lush hill country.
- Retain staged transport handoffs at visible physical locations.
- Do not reintroduce background audio or sound controls.
- Visual quality takes priority over performance optimization.
- Remove snow, glacier, drifting snow, icy shelter, and cone-shaped mountains.
- The hill chapter is lush green Indian hill country with valleys, grass, forest, mist, exposed rock, and winding trekking paths.
- The trekking party contains exactly one guide and three tourists.
- Desktop and mobile must retain the complete environments and party rather than deleting them for performance.

---

## File structure

- Create `src/three/terrain.js` for deterministic noise, height sampling, terrain meshes, slope values, and smoothstep weights.
- Create `src/three/terrain.test.js` for deterministic and geometric contracts.
- Create `src/three/hillWorld.js` and `src/three/hillWorld.test.js` for realistic hill terrain, trail, vegetation, mist, landing, and lodge.
- Create `src/three/trekkingParty.js` and `src/three/trekkingParty.test.js` for the guide and three tourists.
- Modify `src/three/jungleWorld.js` and its test for denser layered vegetation and marsh edge.
- Modify `src/three/waterWorld.js` and its test for a narrowing river corridor and two physical landings.
- Modify `src/three/expeditionController.js` and its test to keep zones alive and blend transition weights.
- Modify `src/three/journeyData.js` and its test to ease camera paths and rename ice-specific phase semantics to hills.
- Modify `src/three/indiaJourney.js` and its test for hill-party mobile framing and continuous atmosphere.
- Modify `scripts/visual-qa.mjs` and `design-qa.md` for the new transition and hill evidence.
- Delete `src/three/iceWorld.js` and `src/three/iceWorld.test.js` after all callers migrate.

### Task 1: Deterministic terrain and transition mathematics

**Files:**
- Create: `src/three/terrain.js`
- Create: `src/three/terrain.test.js`

**Interfaces:**
- Produces: `smoothstep(edge0, edge1, value): number`.
- Produces: `sampleHillHeight(x, z): number`, `sampleHillSlope(x, z): number`.
- Produces: `createTerrainGeometry({width, depth, segmentsX, segmentsZ, heightAt}): THREE.PlaneGeometry`.
- Produces: `getLandscapeWeights(progress): {forest:number, water:number, hills:number}`.

- [ ] **Step 1: Write failing deterministic tests**

```js
import {describe,expect,it} from 'vitest'
import {createTerrainGeometry,getLandscapeWeights,sampleHillHeight,sampleHillSlope,smoothstep} from './terrain'

describe('continuous terrain',()=>{
  it('samples deterministic non-conical hill heights',()=>{
    expect(sampleHillHeight(4,-9)).toBe(sampleHillHeight(4,-9))
    expect(new Set([-12,-6,0,6,12].map(x=>sampleHillHeight(x,-18).toFixed(3))).size).toBeGreaterThan(3)
    expect(sampleHillSlope(4,-9)).toBeGreaterThanOrEqual(0)
  })
  it('builds displaced geometry and smooth normalized weights',()=>{
    const geometry=createTerrainGeometry({width:10,depth:20,segmentsX:8,segmentsZ:12,heightAt:sampleHillHeight})
    expect(geometry.attributes.position.count).toBe(117)
    for(const p of [.55,.6,.65,.7,.75]){
      const w=getLandscapeWeights(p)
      expect(w.forest+w.water+w.hills).toBeCloseTo(1,5)
    }
    expect(smoothstep(0,1,.5)).toBeCloseTo(.5)
  })
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/terrain.test.js`

Expected: FAIL because `terrain.js` does not exist.

- [ ] **Step 3: Implement deterministic terrain**

Use a seed-free analytic combination so browser and test results match exactly:

```js
export const smoothstep=(a,b,v)=>{const t=THREE.MathUtils.clamp((v-a)/(b-a||1),0,1);return t*t*(3-2*t)}
const wave=(x,z)=>Math.sin(x*.19+Math.sin(z*.11))*1.8+Math.cos(z*.12-x*.07)*1.25+Math.sin((x+z)*.31)*.42
export const sampleHillHeight=(x,z)=>Math.max(0,(wave(x,z)+3.2)*smoothstep(8,-28,z))
export const sampleHillSlope=(x,z)=>Math.hypot(sampleHillHeight(x+.15,z)-sampleHillHeight(x-.15,z),sampleHillHeight(x,z+.15)-sampleHillHeight(x,z-.15))/.3
export const getLandscapeWeights=p=>{
  const waterIn=smoothstep(.54,.62,p),hillIn=smoothstep(.69,.77,p)
  const forest=1-waterIn,water=waterIn*(1-hillIn),hills=hillIn
  const total=forest+water+hills
  return{forest:forest/total,water:water/total,hills:hills/total}
}
```

Create a rotated plane, set each vertex Y from `heightAt(x,z)`, compute normals, and attach normalized slope values as a `slope` buffer attribute.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm test -- src/three/terrain.test.js`

Expected: 3 terrain assertions groups pass.

```bash
git add src/three/terrain.js src/three/terrain.test.js
git commit -m "Add deterministic continuous terrain"
```

### Task 2: Lush realistic hill-country world

**Files:**
- Create: `src/three/hillWorld.js`
- Create: `src/three/hillWorld.test.js`
- Delete after migration: `src/three/iceWorld.js`
- Delete after migration: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes: `sampleHillHeight`, `sampleHillSlope`, `createTerrainGeometry`.
- Produces: `createHillWorld(materials, quality): THREE.Group`.
- Produces: `updateHillWorld(world, elapsed): void`.
- Hill `userData` contains `route`, `heightAt`, `mist`, `landing`, and `copyAnchor`.

- [ ] **Step 1: Write failing hill-world test**

```js
it('creates lush non-conical hill country without ice assets',()=>{
  const world=createHillWorld(createMaterials(),'desktop')
  ;['hill-terrain','hill-ridges','hill-forest','hill-rock-faces','hill-mist','hill-trail','hill-landing','hill-lodge'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  ;['glacier','drifting-snow','ice-foreground','ice-midground','ice-background'].forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
  expect(world.userData.route.getPoints(20).every(p=>Math.abs(p.y-world.userData.heightAt(p.x,p.z))<.25)).toBe(true)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/hillWorld.test.js`

Expected: FAIL because `createHillWorld` is unavailable.

- [ ] **Step 3: Build terrain and material layers**

Create a 64×72 world with at least 96×108 desktop segments and 56×72 mobile segments. Apply vertex colors by slope: grass `#496b35` below slope `.8`, earth `#66513a` between `.8–1.45`, and exposed rock `#59605b` above `1.45`. Use a vertex-color `MeshStandardMaterial` with roughness `.92` and `flatShading:false`.

- [ ] **Step 4: Add irregular ridges and depth layers**

Build three displaced terrain ribbons at increasing negative Z offsets rather than cone meshes. Reduce saturation and opacity for distant layers. Add deterministic rock outcrops on steep samples and clustered broadleaf/pine-like hill trees only where slope is below `1.1`.

- [ ] **Step 5: Add route, landing, mist, and lodge**

Sample 30 trail control points from Z `16` to `-30`, set Y to terrain height plus `.08`, and construct a narrow earth ribbon that follows the points. Add a timber-and-stone landing at the low trail start and a wood/stone lodge at the final contact anchor. Add eight translucent mist volumes in valleys; animate only their slow horizontal drift.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/hillWorld.test.js src/three/terrain.test.js`

Expected: all terrain and hill tests pass.

```bash
git add src/three/hillWorld.js src/three/hillWorld.test.js src/three/terrain.js
git commit -m "Build realistic lush hill country"
```

### Task 3: Guide-led trekking party

**Files:**
- Create: `src/three/trekkingParty.js`
- Create: `src/three/trekkingParty.test.js`

**Interfaces:**
- Produces: `createTrekkingParty(materials): THREE.Group`.
- Produces: `updateTrekkingParty(party, curve, progress, elapsed, reducedMotion, heightAt): void`.
- Party `userData.members` is an array of four entries `{role, phase, root, limbs, pole}`.

- [ ] **Step 1: Write failing party tests**

```js
it('creates one guide and three visually varied tourists',()=>{
  const party=createTrekkingParty(createMaterials())
  expect(party.userData.members).toHaveLength(4)
  expect(party.userData.members.filter(m=>m.role==='guide')).toHaveLength(1)
  expect(party.userData.members.filter(m=>m.role==='tourist')).toHaveLength(3)
  expect(new Set(party.userData.members.map(m=>m.phase)).size).toBe(4)
  expect(party.getObjectByName('guide-backpack')).toBeTruthy()
})

it('keeps every member separated and planted on terrain',()=>{
  updateTrekkingParty(party,curve,.65,2,false,(x,z)=>x*.03-z*.01)
  const positions=party.userData.members.map(m=>m.root.position.clone())
  positions.forEach(p=>expect(p.y).toBeCloseTo(p.x*.03-p.z*.01,.2))
  for(let i=1;i<positions.length;i++)expect(positions[i].distanceTo(positions[i-1])).toBeGreaterThan(.45)
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/trekkingParty.test.js`

Expected: FAIL because `trekkingParty.js` does not exist.

- [ ] **Step 3: Build four detailed articulated members**

Extract the current trekker body construction into a reusable member factory. Increase sphere/capsule segments, add layered shirt/jacket meshes, trousers, boots with soles, hair, straps, pack body, roll mat, and pole. Give the guide a deep green jacket and ochre pack; give tourists yellow/navy, rust/charcoal, and teal/tan palettes. Use phases `[0,1.37,2.91,4.42]` and spacing offsets `[0,.055,.11,.165]`.

- [ ] **Step 4: Implement route spacing and ground contact**

For each member, sample `curve.getPointAt(clamp(progress-offset))`, replace Y with `heightAt(x,z)`, face the route tangent, and animate opposite limbs from `sin(elapsed*5.2+phase)`. Compute pole Y correction from the terrain height at its world X/Z. Reduced motion sets swing to zero but retains spacing and route travel.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/trekkingParty.test.js src/three/expeditionVehicles.test.js`

Expected: party tests and existing vehicle tests pass.

```bash
git add src/three/trekkingParty.js src/three/trekkingParty.test.js
git commit -m "Add guide-led trekking party"
```

### Task 4: Dense forest and physical marsh landing

**Files:**
- Modify: `src/three/jungleWorld.js`
- Modify: `src/three/jungleWorld.test.js`

**Interfaces:**
- Preserves: `createJungleWorld(materials, quality)` and `world.userData.route`.
- Adds named groups: `jungle-undergrowth`, `jungle-vines`, `jungle-fallen-timber`, `forest-marsh-edge`, `forest-landing`.

- [ ] **Step 1: Extend the failing forest contract**

Assert all five new named groups exist; desktop has at least 55 trees and 140 undergrowth meshes; mobile has at least 32 trees and 70 undergrowth meshes; and the route endpoint is within six world units of `forest-landing`.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/jungleWorld.test.js`

Expected: FAIL because the new layers and density are absent.

- [ ] **Step 3: Implement deterministic density and variation**

Replace index-row placement with a deterministic hash function based on index. Create at least six crown silhouettes, branch forks, trunk taper, ferns, broad leaves, grass clumps, vines, fallen logs, roots, and wet stones. Reserve a corridor around the jeep path and progressively reduce canopy density toward the marsh edge.

- [ ] **Step 4: Build the marsh and handoff landing**

Extend damp ground toward the water-side end using dark soil, shallow reflective patches, reeds, roots, and a timber landing aligned to the jeep endpoint. Store it as `world.userData.landing`.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/jungleWorld.test.js src/three/expeditionVehicles.test.js`

Expected: forest and jeep tests pass.

```bash
git add src/three/jungleWorld.js src/three/jungleWorld.test.js
git commit -m "Densify forest and add marsh landing"
```

### Task 5: Connected reflective water corridor

**Files:**
- Modify: `src/three/waterWorld.js`
- Modify: `src/three/waterWorld.test.js`

**Interfaces:**
- Preserves: `createWaterWorld`, `updateWaterWorld`, `world.userData.route`, and boat wake behavior.
- Adds: `forest-water-landing`, `hill-water-landing`, `river-banks`, `water-shallows`, `water-reflection-layer`.

- [ ] **Step 1: Extend the failing water contract**

Assert all five new groups exist, route start lies near the forest landing, route end lies near the hill landing, and the bank separation at the route end is less than at its start.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/waterWorld.test.js`

Expected: FAIL because the connected river corridor is absent.

- [ ] **Step 3: Build the narrowing corridor**

Replace the rectangular shoreline slabs with shaped bank meshes whose inner edge narrows from 12 units to 5 units along Z. Add a lighter transparent shallow-water strip along each bank, wet-rock materials, reed clusters, and tree density that increases again near the hill landing.

- [ ] **Step 4: Improve surface depth cues**

Keep the existing water material and add a second low-opacity reflection layer with subtle vertex displacement. In `updateWaterWorld`, animate the two layers at different amplitudes and update the wake without changing the upgraded boat.

- [ ] **Step 5: Run GREEN and commit**

Run: `npm test -- src/three/waterWorld.test.js src/three/expeditionVehicles.test.js`

Expected: water and boat tests pass.

```bash
git add src/three/waterWorld.js src/three/waterWorld.test.js
git commit -m "Connect water corridor to forest and hills"
```

### Task 6: Continuous landscape controller and buttery camera blending

**Files:**
- Modify: `src/three/expeditionController.js`
- Modify: `src/three/expeditionController.test.js`
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Delete: `src/three/iceWorld.js`
- Delete: `src/three/iceWorld.test.js`

**Interfaces:**
- Consumes: `getLandscapeWeights`, `createHillWorld`, `createTrekkingParty`, `updateTrekkingParty`.
- Produces: `getTransitionState(expeditionState)` with eased zone and transport weights.
- `transports.trekker` becomes the party root while preserving the existing key for camera compatibility.

- [ ] **Step 1: Write failing transition tests**

Assert every sampled transition has all three worlds visible, weights are continuous with maximum adjacent delta below `.08` at `.005` progress steps, forest/water and water/hills overlap during handoffs, and transport opacity also overlaps rather than toggles.

- [ ] **Step 2: Run RED**

Run: `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js`

Expected: FAIL because visibility is binary and ice semantics remain.

- [ ] **Step 3: Replace binary visibility**

Add all three worlds once and keep them visible. Traverse each world's materials and set opacity from zone weights while keeping opaque materials depth-writing above `.35`. Use the existing phase timing to update transports, but overlap adjacent transports during handoffs. Replace ice imports with hill imports and use the trekking party for the `trekker` transport key.

- [ ] **Step 4: Smooth camera and atmosphere**

Replace linear keyframe interpolation with `smoothstep(0,1,t)` for position and target interpolation. Add intermediate handoff keyframes centered on both physical landings. In `indiaJourney.js`, use delta-aware exponential damping `1-Math.exp(-delta*4.5)` rather than fixed `.055`, and blend fog near/far plus exposure from the same transition weights.

- [ ] **Step 5: Update semantics and hill-specific copy**

Rename the expedition phase value `ice-trek` to `hill-trek` in data, tests, overlay routing, visual QA states, and conditions. Replace “Himalayan Adventure” and snow/Himalaya-specific supporting copy with “Hill Country Trek” and lush-hill language; leave all other journey copy unchanged.

- [ ] **Step 6: Run GREEN and commit**

Run: `npm test -- src/three/expeditionController.test.js src/three/journeyData.test.js src/three/indiaJourney.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: all controller, data, camera, hill, and party tests pass.

```bash
git add src/three/expeditionController.js src/three/expeditionController.test.js src/three/journeyData.js src/three/journeyData.test.js src/three/indiaJourney.js src/three/indiaJourney.test.js src/three/hillWorld.js src/three/hillWorld.test.js src/three/trekkingParty.js src/three/trekkingParty.test.js src/three/iceWorld.js src/three/iceWorld.test.js
git commit -m "Blend expedition through continuous landscape"
```

### Task 7: Desktop/mobile visual acceptance

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `design-qa.md`

**Interfaces:**
- Produces screenshots for `forest-water-transition`, `water-corridor`, `water-hill-transition`, `hill-reveal`, `trekking-party`, and `hill-contact`.

- [ ] **Step 1: Update QA state names and structural probes**

Add browser-visible QA counters for guide count, tourist count, snow/ice object count, and visible zone weights. Require `{guides:1,tourists:3,iceObjects:0}` and verify two or more zone weights are above `.05` during each handoff screenshot.

- [ ] **Step 2: Run desktop visual QA**

Run: `node scripts/visual-qa.mjs desktop`

Expected: all six new frames render, no hard pop is observed between adjacent frames, the four walkers remain on the trail, menu/booking pass, `soundControls:0`, `horizontalOverflow:false`, and `messages:[]`.

- [ ] **Step 3: Run mobile visual QA**

Run: `node scripts/visual-qa.mjs mobile`

Expected: the guide and at least two tourists are visible in the hill-party frame, both handoffs remain legible, and all interaction/error assertions pass.

- [ ] **Step 4: Run complete verification**

```bash
npm test -- --run
npm run build
node scripts/visual-qa.mjs desktop
node scripts/visual-qa.mjs mobile
```

Expected: every unit test passes, Vite exits `0`, both QA scripts exit `0`, no console errors occur, and no existing menu, booking, car, jeep, or boat behavior regresses.

- [ ] **Step 5: Record evidence and commit**

Document transition continuity, forest density, water depth, hill silhouettes, trekking-party composition, desktop/mobile framing, and all commands in `design-qa.md`.

```bash
git add scripts/visual-qa.mjs design-qa.md
git commit -m "Verify continuous realistic landscape"
```
