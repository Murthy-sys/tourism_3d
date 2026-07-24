### Task 3: Extend the mountain route and compose the trailhead

**Files:**
- Modify: `src/three/hillWorld.js`
- Modify: `src/three/hillWorld.test.js`
- Consume: `src/three/trailhead.js`
- Consume later: `src/three/trekkingParty.js`

**Interfaces:**
- Preserves `createHillWorld(materials,quality='desktop'): THREE.Group` and `updateHillWorld(world,elapsed): void`.
- Produces one continuous `THREE.CatmullRomCurve3` through `trailheadStart → mountainEntry → mountainStart → mountainLanding`.
- Hill `userData` becomes `{route,routeProgress,heightAt,trailhead,landing,distantWaterAnchor,mist,water}`.
- `routeProgress` is `{trailheadStart:0,mountainEntry:number,mountainStart:number,mountainLanding:1}` and each value refers to arc-length progress used by `getPointAt`.
- Desktop terrain is `84×104` with `128×160` segments; mobile terrain is `84×104` with `72×104` segments.

- [ ] **Step 1: Add failing hill-world tests for the extended route and composed clearing**

Replace the hard-coded route-length and terrain-count assertions in `src/three/hillWorld.test.js`, then add these assertions:

```js
it('extends one continuous grounded route through every mountain landmark',()=>{
  const world=createHillWorld(createMaterials(),'desktop')
  const {route,routeProgress,heightAt}=world.userData
  expect(routeProgress).toEqual({
    trailheadStart:0,
    mountainEntry:expect.any(Number),
    mountainStart:expect.any(Number),
    mountainLanding:1,
  })
  expect(routeProgress.mountainEntry).toBeGreaterThan(0)
  expect(routeProgress.mountainStart).toBeGreaterThan(routeProgress.mountainEntry)
  expect(routeProgress.mountainStart).toBeLessThan(1)
  Object.entries(routeProgress).forEach(([name,progress])=>{
    const landmark=new THREE.Vector3(...LANDMARKS[name])
    expect(route.getPointAt(progress).distanceTo(landmark)).toBeLessThan(.08)
  })
  route.getSpacedPoints(120).slice(0,-1).forEach(point=>{
    expect(Math.abs(point.y-heightAt(point.x,point.z))).toBeLessThan(.3)
  })
  disposeObject3D(world)
})

it('composes the natural trailhead and expanded terrain at both quality levels',()=>{
  const desktop=createHillWorld(createMaterials(),'desktop')
  const mobile=createHillWorld(createMaterials(),'mobile')
  expect(desktop.userData.trailhead).toBe(desktop.getObjectByName('trailhead'))
  expect(desktop.getObjectByName('hill-terrain').geometry.attributes.position.count)
    .toBe((128+1)*(160+1))
  expect(mobile.getObjectByName('hill-terrain').geometry.attributes.position.count)
    .toBe((72+1)*(104+1))
  ;[
    'trailhead-gravel',
    'trailhead-tire-marks',
    'trailhead-damp-patches',
    'hill-trail',
    'mountain-water-landing',
  ].forEach(name=>{
    expect(desktop.getObjectByName(name)).toBeTruthy()
    expect(mobile.getObjectByName(name)).toBeTruthy()
  })
  disposeObject3D(desktop)
  disposeObject3D(mobile)
})
```

Do not remove the ridge-heightfield, water-destination, material-detail, landing-alignment, foreground-rock, or shoreline tests.

- [ ] **Step 2: Run the hill-world tests to verify RED**

Run: `npm test -- --run src/three/hillWorld.test.js`

Expected: FAIL because the current route begins at `mountainStart`, no trailhead is mounted, and terrain segment counts still use the old dimensions.

- [ ] **Step 3: Add standing-pose data and the trailhead import boundary**

For this task only, add this exported constant near the top of `src/three/trekkingParty.js`; Task 4 will consume it in animation:

```js
export const TRAILHEAD_STANDING_POSES=Object.freeze([
  Object.freeze({role:'guide',position:Object.freeze([3.2,.35,33.7]),heading:-3.04}),
  Object.freeze({role:'tourist',position:Object.freeze([1.8,.35,36.5]),heading:-2.35}),
  Object.freeze({role:'tourist',position:Object.freeze([3.2,.35,36.7]),heading:2.65}),
  Object.freeze({role:'tourist',position:Object.freeze([2.4,.35,38]),heading:-2.7}),
])
```

Add these imports to `src/three/hillWorld.js`:

```js
import {createTrailhead} from './trailhead'
import {TRAILHEAD_STANDING_POSES} from './trekkingParty'
```

- [ ] **Step 4: Replace the mountain route factory with exact staged segments**

Replace `createRoute` in `src/three/hillWorld.js` with:

```js
const appendSegment=(points,from,to,count,heightAt,amplitude,frequency)=>{
  for(let index=1;index<count;index+=1){
    const t=index/(count-1)
    const x=THREE.MathUtils.lerp(from[0],to[0],t)+
      Math.sin(t*Math.PI)*Math.sin(t*Math.PI*frequency)*amplitude
    const z=THREE.MathUtils.lerp(from[2],to[2],t)
    const endpoint=index===count-1
    const y=endpoint?to[1]:heightAt(x,z)+.08
    points.push(new THREE.Vector3(x,y,z))
  }
}

const closestProgress=(route,landmark)=>{
  const target=new THREE.Vector3(...landmark)
  let closest=0
  let distance=Infinity
  for(let index=0;index<=4096;index+=1){
    const progress=index/4096
    const candidate=route.getPointAt(progress)
    const nextDistance=candidate.distanceToSquared(target)
    if(nextDistance<distance){
      closest=progress
      distance=nextDistance
    }
  }
  return closest
}

const createRoute=heightAt=>{
  const points=[new THREE.Vector3(...LANDMARKS.trailheadStart)]
  appendSegment(
    points,
    LANDMARKS.trailheadStart,
    LANDMARKS.mountainEntry,
    14,
    heightAt,
    .28,
    1.4,
  )
  appendSegment(
    points,
    LANDMARKS.mountainEntry,
    LANDMARKS.mountainStart,
    10,
    heightAt,
    .42,
    1.8,
  )
  appendSegment(
    points,
    LANDMARKS.mountainStart,
    LANDMARKS.mountainLanding,
    32,
    heightAt,
    1.45,
    3.4,
  )
  const route=new THREE.CatmullRomCurve3(points,false,'centripetal')
  return{
    route,
    routeProgress:{
      trailheadStart:0,
      mountainEntry:closestProgress(route,LANDMARKS.mountainEntry),
      mountainStart:closestProgress(route,LANDMARKS.mountainStart),
      mountainLanding:1,
    },
  }
}
```

- [ ] **Step 5: Expand the heightfield and mount the trailhead**

Change `createTerrain` in `src/three/hillWorld.js` to:

```js
const createTerrain=(heightAt,quality)=>{
  const segmentsX=quality==='mobile'?72:128
  const segmentsZ=quality==='mobile'?104:160
  const geometry=createTerrainGeometry({
    width:84,
    depth:104,
    segmentsX,
    segmentsZ,
    heightAt,
  })
```

Keep the remainder of the existing terrain color/material function unchanged.

Update `createHillWorld` to consume the new route result and compose the clearing:

```js
export function createHillWorld(materials,quality='desktop'){
  const world=namedGroup('hill-world')
  const heightAt=sampleMountainHeight
  const {route,routeProgress}=createRoute(heightAt)
  const terrain=createTerrain(heightAt,quality)
  const ridges=createRidges()
  const rocks=createRockFaces(materials,heightAt,route.points,quality)
  const vegetation=createVegetation(materials,heightAt,route.points,quality)
  const mist=createMist(quality)
  const trail=createTrail(materials,route,heightAt,quality)
  const trailhead=createTrailhead(materials,{
    quality,
    heightAt,
    route,
    standingPoses:TRAILHEAD_STANDING_POSES,
  })
  const landing=createLanding(materials)
  const water=createWaterGlint()
  world.add(terrain,ridges,rocks,vegetation,mist,trail,trailhead,landing,water)

  const warmLight=new THREE.DirectionalLight('#ffe1aa',3.1)
  warmLight.position.set(-16,24,13)
  world.add(warmLight)

  world.userData={
    route,
    routeProgress,
    heightAt,
    trailhead,
    landing,
    distantWaterAnchor:new THREE.Vector3(2,.4,-51),
    mist,
    water,
  }
  return world
}
```

- [ ] **Step 6: Run hill and dependency tests to verify GREEN**

Run: `npm test -- --run src/three/terrain.test.js src/three/trailhead.test.js src/three/hillWorld.test.js src/three/trekkingParty.test.js`

Expected: PASS. Existing trekking behavior still passes because the update signature has not changed.

- [ ] **Step 7: Commit the continuous route integration**

```bash
git add src/three/hillWorld.js src/three/hillWorld.test.js src/three/trekkingParty.js
git commit -m "Connect trailhead to mountain route"
```

