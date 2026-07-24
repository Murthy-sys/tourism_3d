# Bus Trailhead Opening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current high mountain opening with a continuous ground-level trailhead arrival where a parked premium tourist coach, one guide, and three tourists naturally depart into the existing mountain → water → forest journey.

**Architecture:** Extend the existing mountain heightfield and route backward through two authoritative trailhead landmarks. Add focused procedural trailhead and coach builders, then blend the existing articulated trekking party from explicit standing poses into its route formation with one smootherstep departure value. Keep the coach as static mountain scenery, preserve the three existing transport roots and every phase boundary from `0.28` onward, and drive desktop/mobile cameras plus fail-closed QA from deterministic metadata.

**Tech Stack:** React 18, Three.js 0.160.1, custom `BufferGeometry`, `MeshPhysicalMaterial`/`MeshStandardMaterial`, Vitest 2, Playwright 1.61, Vite 5.

## Global Constraints

- Work only on `main`; do not merge or cherry-pick `feature/continuous-realistic-landscape`.
- Preserve the environment order mountain → water → forest.
- Preserve the traveler order trekking party → boat → jeep.
- Preserve one guide and three tourists through every active traveler representation.
- Preserve Who We Are, plans, trip routes, booking, contact and menu behavior.
- Preserve the current no-audio behavior and do not add a sound control.
- Preserve desktop, mobile, reduced-motion and WebGL fallback behavior.
- Keep upcoming environments visible before their handoff boundaries.
- The coach is already parked, remains stationary, and never becomes an expedition transport.
- Travelers start beside the open passenger door; they do not animate through the doorway.
- Progress `0.000–0.045` is the parked-coach establishing beat.
- Progress `0.045–0.120` is trailhead departure and foothill entry.
- Progress `0.120–0.280` is the established mountain trek.
- Preserve the exact phase boundaries `0.28`, `0.42`, `0.60`, `0.74`, and `0.94`.
- Preserve `OPENING_TREK_END=.14` and all existing chapter ranges and customer-facing copy.
- Keep all biome roots mounted; the coach leaves the camera frustum naturally and is never hidden by a progress toggle.
- Use deterministic procedural geometry only; add no downloaded model, image, audio, or runtime network dependency.
- Visual quality takes priority over performance optimization, but desktop/mobile builders must retain the same semantic hierarchy.

---

## File Structure

- Create `src/three/tourCoach.js` and `src/three/tourCoach.test.js` for the complete static premium coach, local materials, ground contact, open door, steps, and deterministic clearance metadata.
- Create `src/three/trailhead.js` and `src/three/trailhead.test.js` for the irregular gravel turnout, earth, tire marks, damp patches, edge vegetation, stones, and obstacle/camera clearances.
- Modify `src/three/terrain.js` and `src/three/terrain.test.js` for `trailheadStart`, `mountainEntry`, and a height blend from the flat turnout into the existing mountain.
- Modify `src/three/hillWorld.js` and `src/three/hillWorld.test.js` to extend the terrain, compose the trailhead, and expose route progress at every mountain landmark.
- Modify `src/three/trekkingParty.js` and `src/three/trekkingParty.test.js` for four standing poses and standing-to-walking blending.
- Modify `src/three/expeditionController.js` and `src/three/expeditionController.test.js` to plant the coach, map early progress, and expose opening evidence without adding a fourth transport.
- Modify `src/three/journeyData.js`, `src/three/journeyData.test.js`, `src/three/indiaJourney.js`, and `src/three/indiaJourney.test.js` for continuous desktop/mobile opening camera rails and projected coach/party evidence.
- Modify `src/journey/chapters.test.js` only to lock the retained chapter boundaries; do not modify `src/journey/chapters.js`.
- Modify `scripts/visual-qa.mjs`, `scripts/visual-qa.test.js`, and `design-qa.md` for desktop/mobile trailhead evidence and retained later-scene regression evidence.
- Do not modify `src/components/Hero3D.jsx`, `src/components/JourneyShell.jsx`, their tests, water/forest builders, expedition vehicle builders, or customer-facing content unless a failing regression proves an existing contract was broken.

### Task 1: Build the static premium tourist coach

**Files:**
- Create: `src/three/tourCoach.js`
- Create: `src/three/tourCoach.test.js`

**Interfaces:**
- Produces `createTourCoach(quality='desktop'): THREE.Group`.
- The root is named `tour-coach`, uses local forward `-Z`, passenger side `+X`, and local tire-contact plane `Y=0`.
- `root.userData` exposes:
  - `quality: 'desktop'|'mobile'`
  - `dimensions: {length:11.8,width:2.55,overallHeight:3.55,wheelRadius:.48}`
  - `wheels: THREE.Group[]`
  - `wheelContactPoints: THREE.Vector3[]`
  - `groundOffset: 0`
  - `footprint: THREE.Box3`
  - `vehicleBounds: THREE.Box3`
  - `doorClearance: THREE.Box3`
  - `entryApproach: THREE.Box3`
  - `forward: THREE.Vector3`
  - `entryNormal: THREE.Vector3`
- Required stable groups are `coach-body`, `coach-glazing`, `coach-wheel-arches`, `coach-wheels`, `coach-entry`, and `coach-exterior-details`.

- [ ] **Step 1: Write the failing coach hierarchy, proportion, contact, door, and quality tests**

Create `src/three/tourCoach.test.js`:

```js
import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {disposeObject3D} from './primitives'
import {createTourCoach} from './tourCoach'

const names=[
  'coach-body',
  'coach-glazing',
  'coach-wheel-arches',
  'coach-wheels',
  'coach-entry',
  'coach-exterior-details',
  'tour-coach-windscreen',
  'tour-coach-door-open',
  'tour-coach-entry-step-1',
  'tour-coach-entry-step-2',
  'tour-coach-entry-step-3',
  'tour-coach-left-mirror',
  'tour-coach-right-mirror',
  'tour-coach-headlights',
  'tour-coach-tail-lights',
  'tour-coach-grille',
]

describe('premium tourist coach',()=>{
  it('builds a coherent full coach with every inspectable exterior group',()=>{
    const coach=createTourCoach('desktop')
    expect(coach.name).toBe('tour-coach')
    names.forEach(name=>expect(coach.getObjectByName(name)).toBeTruthy())
    expect(coach.userData.wheels).toHaveLength(4)
    expect(coach.userData.wheelContactPoints).toHaveLength(4)
    expect(new Set(coach.userData.wheels.map(wheel=>wheel.userData.axle))).toEqual(
      new Set(['front','rear']),
    )
    expect(new Set(coach.userData.wheels.map(wheel=>wheel.userData.side))).toEqual(
      new Set(['left','right']),
    )
    disposeObject3D(coach)
  })

  it('uses realistic long-coach proportions and plants every tire at local Y zero',()=>{
    const coach=createTourCoach('desktop')
    coach.updateMatrixWorld(true)
    expect(coach.userData.dimensions).toEqual({
      length:11.8,
      width:2.55,
      overallHeight:3.55,
      wheelRadius:.48,
    })
    expect(coach.userData.dimensions.length/coach.userData.dimensions.width)
      .toBeGreaterThan(4)
    coach.userData.wheelContactPoints.forEach(point=>expect(point.y).toBeCloseTo(0,8))
    const tireBottoms=coach.userData.wheels.map(wheel=>
      new THREE.Box3().setFromObject(wheel).min.y
    )
    tireBottoms.forEach(bottom=>expect(bottom).toBeCloseTo(0,5))
    expect(coach.userData.vehicleBounds.min.y).toBeGreaterThanOrEqual(-1e-6)
    disposeObject3D(coach)
  })

  it('keeps the passenger door open above three rising entry steps',()=>{
    const coach=createTourCoach('desktop')
    const door=coach.getObjectByName('tour-coach-door-open')
    const steps=[1,2,3].map(index=>
      coach.getObjectByName(`tour-coach-entry-step-${index}`)
    )
    expect(Math.abs(door.parent.rotation.y)).toBeGreaterThan(.5)
    const stepTops=steps.map(step=>new THREE.Box3().setFromObject(step).max.y)
    expect(stepTops[1]).toBeGreaterThan(stepTops[0])
    expect(stepTops[2]).toBeGreaterThan(stepTops[1])
    expect(coach.userData.doorClearance.isBox3).toBe(true)
    expect(coach.userData.entryApproach.isBox3).toBe(true)
    expect(coach.userData.doorClearance.intersectsBox(coach.userData.entryApproach))
      .toBe(true)
    disposeObject3D(coach)
  })

  it('keeps mobile semantics identical while desktop retains denser geometry',()=>{
    const desktop=createTourCoach('desktop')
    const mobile=createTourCoach('mobile')
    names.forEach(name=>{
      expect(desktop.getObjectByName(name)).toBeTruthy()
      expect(mobile.getObjectByName(name)).toBeTruthy()
    })
    const vertices=root=>{
      let count=0
      root.traverse(object=>{count+=object.geometry?.attributes?.position?.count||0})
      return count
    }
    expect(vertices(desktop)).toBeGreaterThan(vertices(mobile))
    expect(mobile.userData.dimensions).toEqual(desktop.userData.dimensions)
    expect(mobile.userData.footprint.min.toArray())
      .toEqual(desktop.userData.footprint.min.toArray())
    expect(mobile.userData.footprint.max.toArray())
      .toEqual(desktop.userData.footprint.max.toArray())
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })

  it('is deterministic across repeated builds',()=>{
    const signature=quality=>{
      const coach=createTourCoach(quality)
      const result=[]
      coach.traverse(object=>{
        if(object.isMesh){
          result.push([
            object.name,
            object.geometry.type,
            object.geometry.attributes.position.count,
            object.position.toArray(),
            object.rotation.toArray().slice(0,3),
          ])
        }
      })
      disposeObject3D(coach)
      return result
    }
    expect(signature('desktop')).toEqual(signature('desktop'))
  })
})
```

- [ ] **Step 2: Run the coach test to verify RED**

Run: `npm test -- --run src/three/tourCoach.test.js`

Expected: FAIL with `Failed to resolve import "./tourCoach"` because the coach builder does not exist.

- [ ] **Step 3: Implement the shaped coach shell and local material palette**

Create `src/three/tourCoach.js` with these dimensions, material rules, shell helper, and root contract:

```js
import * as THREE from 'three'
import {mesh} from './primitives'

const DIMENSIONS=Object.freeze({
  length:11.8,
  width:2.55,
  overallHeight:3.55,
  wheelRadius:.48,
})

const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const namedMesh=(name,geometry,material,position=[0,0,0],rotation=[0,0,0])=>{
  const object=mesh(geometry,material,position,rotation)
  object.name=name
  return object
}

const createPalette=()=>({
  body:new THREE.MeshPhysicalMaterial({
    color:'#eee9df',
    roughness:.28,
    metalness:.08,
    clearcoat:1,
    clearcoatRoughness:.2,
  }),
  lower:new THREE.MeshStandardMaterial({color:'#2e3438',roughness:.42,metalness:.18}),
  livery:new THREE.MeshPhysicalMaterial({
    color:'#8b6d43',
    roughness:.34,
    metalness:.15,
    clearcoat:.65,
  }),
  glass:new THREE.MeshPhysicalMaterial({
    color:'#213a43',
    roughness:.08,
    metalness:.05,
    transparent:true,
    opacity:.72,
    depthWrite:false,
    clearcoat:1,
  }),
  tire:new THREE.MeshStandardMaterial({color:'#151719',roughness:.98,metalness:0}),
  rim:new THREE.MeshStandardMaterial({color:'#aab0b2',roughness:.3,metalness:.85}),
  dark:new THREE.MeshStandardMaterial({color:'#20262a',roughness:.7,metalness:.16}),
  light:new THREE.MeshStandardMaterial({
    color:'#fff0bf',
    emissive:'#f3c46c',
    emissiveIntensity:.35,
    roughness:.2,
  }),
  redLight:new THREE.MeshStandardMaterial({
    color:'#9b1f1f',
    emissive:'#6f0808',
    emissiveIntensity:.45,
    roughness:.24,
  }),
})

const createShellGeometry=quality=>{
  const shape=new THREE.Shape()
  shape.moveTo(-DIMENSIONS.length/2+.32,.52)
  shape.lineTo(DIMENSIONS.length/2-.48,.52)
  shape.quadraticCurveTo(DIMENSIONS.length/2,.7,DIMENSIONS.length/2,1.18)
  shape.lineTo(DIMENSIONS.length/2,2.8)
  shape.quadraticCurveTo(DIMENSIONS.length/2-.16,3.42,DIMENSIONS.length/2-.82,3.5)
  shape.lineTo(-DIMENSIONS.length/2+.62,3.5)
  shape.quadraticCurveTo(-DIMENSIONS.length/2,3.34,-DIMENSIONS.length/2,2.72)
  shape.lineTo(-DIMENSIONS.length/2,.95)
  shape.quadraticCurveTo(-DIMENSIONS.length/2+.05,.62,-DIMENSIONS.length/2+.32,.52)
  const geometry=new THREE.ExtrudeGeometry(shape,{
    depth:DIMENSIONS.width,
    steps:1,
    bevelEnabled:true,
    bevelSegments:quality==='mobile'?2:5,
    curveSegments:quality==='mobile'?8:18,
    bevelSize:.06,
    bevelThickness:.06,
  })
  geometry.translate(0,0,-DIMENSIONS.width/2)
  geometry.rotateY(Math.PI/2)
  geometry.computeVertexNormals()
  return geometry
}

export function createTourCoach(quality='desktop'){
  const coach=namedGroup('tour-coach')
  const palette=createPalette()
  const body=namedGroup('coach-body')
  const glazing=namedGroup('coach-glazing')
  const arches=namedGroup('coach-wheel-arches')
  const wheels=namedGroup('coach-wheels')
  const entry=namedGroup('coach-entry')
  const details=namedGroup('coach-exterior-details')

  body.add(
    namedMesh('tour-coach-shell',createShellGeometry(quality),palette.body),
    namedMesh(
      'tour-coach-lower-trim',
      new THREE.BoxGeometry(DIMENSIONS.width+.06,.52,DIMENSIONS.length-1),
      palette.lower,
      [0,.77,0],
    ),
    namedMesh(
      'tour-coach-roof',
      new THREE.BoxGeometry(DIMENSIONS.width-.12,.16,DIMENSIONS.length-1.15),
      palette.body,
      [0,3.47,.05],
    ),
    namedMesh(
      'tour-coach-livery',
      new THREE.BoxGeometry(DIMENSIONS.width+.08,.12,DIMENSIONS.length-1.3),
      palette.livery,
      [0,1.04,.05],
    ),
  )
```

Continue the same function with deterministic glazing, wheels, arches, entry, and exterior details:

```js
  const windowSegments=[-4.25,-2.85,-1.45,-.05,1.35,2.75,4.15]
  ;[-1,1].forEach(side=>{
    windowSegments.forEach((z,index)=>{
      if(side>0&&index===0) return
      const window=namedMesh(
        `tour-coach-side-window-${side<0?'left':'right'}-${index+1}`,
        new THREE.BoxGeometry(.035,1.18,1.12),
        palette.glass,
        [side*(DIMENSIONS.width/2+.045),2.42,z],
      )
      glazing.add(window)
    })
  })
  glazing.add(
    namedMesh(
      'tour-coach-windscreen',
      new THREE.BoxGeometry(DIMENSIONS.width-1.04,1.35,.04),
      palette.glass,
      [0,2.43,-DIMENSIONS.length/2-.035],
      [-.12,0,0],
    ),
    namedMesh(
      'tour-coach-rear-window',
      new THREE.BoxGeometry(DIMENSIONS.width-1.12,1.05,.04),
      palette.glass,
      [0,2.46,DIMENSIONS.length/2+.035],
    ),
  )

  const wheelSpecs=[
    {axle:'front',side:'left',x:-1,z:-3.82},
    {axle:'front',side:'right',x:1,z:-3.82},
    {axle:'rear',side:'left',x:-1,z:3.52},
    {axle:'rear',side:'right',x:1,z:3.52},
  ]
  const wheelRoots=wheelSpecs.map(spec=>{
    const sideX=spec.x*(DIMENSIONS.width/2+.015)
    const root=namedGroup(`tour-coach-wheel-${spec.axle}-${spec.side}`)
    root.position.set(sideX,DIMENSIONS.wheelRadius,spec.z)
    root.rotation.z=Math.PI/2
    root.userData={axle:spec.axle,side:spec.side}
    root.add(
      namedMesh(
        'tour-coach-tire',
        new THREE.CylinderGeometry(
          DIMENSIONS.wheelRadius,
          DIMENSIONS.wheelRadius,
          .25,
          quality==='mobile'?16:32,
        ),
        palette.tire,
      ),
      namedMesh(
        'tour-coach-rim',
        new THREE.CylinderGeometry(.26,.26,.265,quality==='mobile'?12:24),
        palette.rim,
      ),
    )
    wheels.add(root)
    const arch=namedMesh(
      `tour-coach-wheel-arch-${spec.axle}-${spec.side}`,
      new THREE.TorusGeometry(
        DIMENSIONS.wheelRadius+.13,
        .055,
        quality==='mobile'?6:10,
        quality==='mobile'?16:30,
        Math.PI,
      ),
      palette.lower,
      [sideX,DIMENSIONS.wheelRadius+.2,spec.z],
      [0,sideX>0?-Math.PI/2:Math.PI/2,0],
    )
    arches.add(arch)
    return root
  })

  const doorPivot=namedGroup('tour-coach-door-pivot')
  doorPivot.position.set(DIMENSIONS.width/2+.075,1.5,-3.58)
  doorPivot.rotation.y=-.72
  doorPivot.add(namedMesh(
    'tour-coach-door-open',
    new THREE.BoxGeometry(.07,1.86,.82),
    palette.glass,
    [0,0,.41],
  ))
  entry.add(
    namedMesh(
      'tour-coach-door-opening',
      new THREE.BoxGeometry(.06,2.02,.96),
      palette.dark,
      [DIMENSIONS.width/2+.04,1.48,-3.58],
    ),
    doorPivot,
  )
  ;[
    {name:'tour-coach-entry-step-1',x:1.57,y:.12},
    {name:'tour-coach-entry-step-2',x:1.45,y:.3},
    {name:'tour-coach-entry-step-3',x:1.34,y:.48},
  ].forEach(({name,x,y})=>entry.add(namedMesh(
    name,
    new THREE.BoxGeometry(.52,.12,.76),
    palette.dark,
    [x,y,-3.58],
  )))
  entry.add(namedMesh(
    'tour-coach-entry-threshold',
    new THREE.BoxGeometry(.5,.1,.82),
    palette.lower,
    [1.28,.65,-3.58],
  ))

  const mirror=(name,x)=>namedMesh(
    name,
    new THREE.CapsuleGeometry(.1,.26,5,quality==='mobile'?8:14),
    palette.dark,
    [x,2.72,-5.48],
    [0,0,Math.PI/2],
  )
  details.add(
    mirror('tour-coach-left-mirror',-1.48),
    mirror('tour-coach-right-mirror',1.48),
    namedMesh(
      'tour-coach-headlights',
      new THREE.BoxGeometry(1.72,.22,.06),
      palette.light,
      [0,.95,-5.93],
    ),
    namedMesh(
      'tour-coach-tail-lights',
      new THREE.BoxGeometry(1.7,.25,.06),
      palette.redLight,
      [0,1.03,5.93],
    ),
    namedMesh(
      'tour-coach-grille',
      new THREE.BoxGeometry(1.55,.38,.05),
      palette.dark,
      [0,.68,-5.94],
    ),
  )

  coach.add(body,glazing,arches,wheels,entry,details)
  coach.traverse(object=>{
    if(object.isMesh){
      object.castShadow=true
      object.receiveShadow=true
    }
  })
  coach.updateMatrixWorld(true)
  coach.userData={
    quality,
    dimensions:{...DIMENSIONS},
    wheels:wheelRoots,
    wheelContactPoints:wheelSpecs.map(spec=>
      new THREE.Vector3(
        spec.x*(DIMENSIONS.width/2+.015),
        0,
        spec.z,
      )
    ),
    groundOffset:0,
    footprint:new THREE.Box3(
      new THREE.Vector3(-DIMENSIONS.width/2,0,-DIMENSIONS.length/2),
      new THREE.Vector3(DIMENSIONS.width/2,DIMENSIONS.overallHeight,DIMENSIONS.length/2),
    ),
    vehicleBounds:new THREE.Box3().setFromObject(coach),
    doorClearance:new THREE.Box3(
      new THREE.Vector3(1.22,.02,-4.12),
      new THREE.Vector3(2.28,2.55,-3.02),
    ),
    entryApproach:new THREE.Box3(
      new THREE.Vector3(1.35,0,-4.25),
      new THREE.Vector3(3.25,2.25,-2.9),
    ),
    forward:new THREE.Vector3(0,0,-1),
    entryNormal:new THREE.Vector3(1,0,0),
  }
  return coach
}
```

- [ ] **Step 4: Run the coach tests to verify GREEN**

Run: `npm test -- --run src/three/tourCoach.test.js`

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit the coach builder**

```bash
git add src/three/tourCoach.js src/three/tourCoach.test.js
git commit -m "Build premium trailhead tourist coach"
```

### Task 2: Add trailhead landmarks, terrain blend, and clearing

**Files:**
- Modify: `src/three/terrain.js`
- Modify: `src/three/terrain.test.js`
- Create: `src/three/trailhead.js`
- Create: `src/three/trailhead.test.js`

**Interfaces:**
- Extends frozen `LANDMARKS` with `trailheadStart:[3.2,.35,34]` and `mountainEntry:[2,3.1,22]`; all four existing landmark arrays remain unchanged.
- Preserves `sampleMountainHeight(x,z): number`, `sampleMountainSlope(x,z): number`, `createTerrainGeometry(options)`, `smootherstep`, and `getBiomeWeights` signatures.
- Produces `createTrailhead(materials,{quality,heightAt,route,standingPoses}): THREE.Group`.
- Trailhead `userData` exposes `coachPose`, `turnoutBounds`, `routeObstacles`, `routeClearance`, and `cameraClearance`.
- `coachPose` is `{position:THREE.Vector3,heading:number}` with position `[-4,sampleMountainHeight(-4,34),34]` and heading `-Math.PI/2`.

- [ ] **Step 1: Extend the terrain tests for frozen landmarks and continuous opening heights**

Add these tests to `src/three/terrain.test.js`:

```js
it('adds a flat trailhead and mountain entry without changing later landmarks',()=>{
  expect(LANDMARKS).toMatchObject({
    trailheadStart:[3.2,.35,34],
    mountainEntry:[2,3.1,22],
    mountainStart:[0,5,12],
    mountainLanding:[2,.35,-34],
    forestLanding:[-2,.25,-86],
    forestEnd:[1,.2,-132],
  })
  Object.values(LANDMARKS).forEach(landmark=>expect(Object.isFrozen(landmark)).toBe(true))
  expect(sampleMountainHeight(3.2,34)).toBeCloseTo(.35,1)
  expect(sampleMountainHeight(-4,34)).toBeCloseTo(.35,1)
  expect(sampleMountainHeight(2,22)).toBeCloseTo(3.1,1)
  expect(sampleMountainHeight(0,12)).toBeCloseTo(5,1)
})

it('blends the turnout into the mountain without a height seam',()=>{
  const samples=Array.from({length:89},(_,index)=>{
    const t=index/88
    const x=THREE.MathUtils.lerp(3.2,0,t)
    const z=THREE.MathUtils.lerp(34,12,t)
    return sampleMountainHeight(x,z)
  })
  const adjacent=samples.slice(1).map((height,index)=>Math.abs(height-samples[index]))
  expect(Math.max(...adjacent)).toBeLessThan(.22)
  expect(samples.at(-1)).toBeGreaterThan(samples[0]+4)
  expect(getBiomeWeights(.31).water).toBeGreaterThan(.05)
})
```

Also add `import * as THREE from 'three'` to `src/three/terrain.test.js`.

- [ ] **Step 2: Run the terrain tests to verify RED**

Run: `npm test -- --run src/three/terrain.test.js`

Expected: FAIL because `trailheadStart` and `mountainEntry` are absent and the current heightfield is not flat at the turnout.

- [ ] **Step 3: Extend `LANDMARKS` and blend only the opening corridor**

Replace the landmark and mountain-height section in `src/three/terrain.js` with:

```js
export const LANDMARKS=Object.freeze({
  trailheadStart:Object.freeze([3.2,.35,34]),
  mountainEntry:Object.freeze([2,3.1,22]),
  mountainStart:Object.freeze([0,5,12]),
  mountainLanding:Object.freeze([2,.35,-34]),
  forestLanding:Object.freeze([-2,.25,-86]),
  forestEnd:Object.freeze([1,.2,-132]),
})

export const smootherstep=(a,b,value)=>{
  const t=THREE.MathUtils.clamp((value-a)/(b-a||1),0,1)
  return t*t*t*(t*(t*6-15)+10)
}

const ridge=(x,z)=>
  Math.sin(x*.17+Math.sin(z*.08))*2.5+
  Math.cos(z*.11-x*.09)*1.8+
  Math.sin((x+z)*.29)*.65

const baseMountainHeight=(x,z)=>
  Math.max(0,(ridge(x,z)+4.4)*smootherstep(-38,8,z))

const openingCenterX=z=>
  THREE.MathUtils.lerp(0,3.2,smootherstep(12,34,z))

const openingFloor=z=>
  THREE.MathUtils.lerp(5,.35,smootherstep(12,34,z))

export const sampleMountainHeight=(x,z)=>{
  const base=baseMountainHeight(x,z)
  const corridorEnvelope=
    smootherstep(8,12,z)*
    (1-smootherstep(35,41,z))
  const corridor=
    (1-smootherstep(1.1,5.8,Math.abs(x-openingCenterX(z))))*
    corridorEnvelope
  const turnoutDistance=Math.hypot((x+2)/12,(z-34)/9)
  const turnout=1-smootherstep(.72,1.25,turnoutDistance)
  const weight=Math.max(corridor,turnout)
  return THREE.MathUtils.lerp(base,openingFloor(z),weight)
}
```

Do not change `sampleMountainSlope`, `createTerrainGeometry`, or `getBiomeWeights`.

- [ ] **Step 4: Run the terrain tests to verify GREEN**

Run: `npm test -- --run src/three/terrain.test.js`

Expected: PASS, including the unchanged biome overlap assertions.

- [ ] **Step 5: Write failing tests for the physical trailhead and clear route**

Create `src/three/trailhead.test.js`:

```js
import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createMaterials,disposeObject3D} from './primitives'
import {createTrailhead} from './trailhead'
import {LANDMARKS,sampleMountainHeight} from './terrain'

const standingPoses=[
  {role:'guide',position:[3.2,.35,33.7],heading:-3.04},
  {role:'tourist',position:[1.8,.35,36.5],heading:-2.35},
  {role:'tourist',position:[3.2,.35,36.7],heading:2.65},
  {role:'tourist',position:[2.4,.35,38],heading:-2.7},
]

const route=new THREE.CatmullRomCurve3([
  new THREE.Vector3(...LANDMARKS.trailheadStart),
  new THREE.Vector3(...LANDMARKS.mountainEntry),
  new THREE.Vector3(...LANDMARKS.mountainStart),
])

describe('trailhead clearing',()=>{
  it('builds gravel, earth, tracks, damp patches, and natural edge detail',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(trailhead.getObjectByName(name)).toBeTruthy())
    expect(trailhead.userData.coachPose.position.toArray()).toEqual([
      -4,
      sampleMountainHeight(-4,34),
      34,
    ])
    expect(trailhead.userData.coachPose.heading).toBe(-Math.PI/2)
    expect(trailhead.userData.routeClearance).toBeGreaterThanOrEqual(1.5)
    expect(trailhead.userData.cameraClearance).toBeGreaterThanOrEqual(3)
    disposeObject3D(trailhead)
  })

  it('keeps every edge obstacle outside the walking corridor, coach turnout, and party',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    const samples=route.getSpacedPoints(80)
    trailhead.userData.routeObstacles.forEach(bounds=>{
      samples.forEach(point=>expect(bounds.distanceToPoint(point))
        .toBeGreaterThanOrEqual(trailhead.userData.routeClearance))
      expect(bounds.intersectsBox(trailhead.userData.turnoutBounds)).toBe(false)
      standingPoses.forEach(pose=>{
        const [x,y,z]=pose.position
        expect(bounds.distanceToPoint(new THREE.Vector3(x,y,z))).toBeGreaterThan(.8)
      })
    })
    disposeObject3D(trailhead)
  })

  it('preserves semantic groups on mobile with fewer decorative instances',()=>{
    const options={heightAt:sampleMountainHeight,route,standingPoses}
    const desktop=createTrailhead(createMaterials(),{...options,quality:'desktop'})
    const mobile=createTrailhead(createMaterials(),{...options,quality:'mobile'})
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(mobile.getObjectByName(name)).toBeTruthy())
    expect(desktop.userData.routeObstacles.length)
      .toBeGreaterThan(mobile.userData.routeObstacles.length)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })
})
```

- [ ] **Step 6: Run the trailhead tests to verify RED**

Run: `npm test -- --run src/three/trailhead.test.js`

Expected: FAIL with `Failed to resolve import "./trailhead"`.

- [ ] **Step 7: Implement the deterministic trailhead surface and clearance-filtered edge detail**

Create `src/three/trailhead.js`. Use this public structure and deterministic placement contract:

```js
import * as THREE from 'three'
import {mesh} from './primitives'

const namedGroup=name=>{
  const group=new THREE.Group()
  group.name=name
  return group
}

const hash=(index,salt=0)=>{
  const value=Math.sin((index+1)*91.733+salt*37.119)*43758.5453
  return value-Math.floor(value)
}

const minimumRouteDistance=(point,route)=>
  route.getSpacedPoints(100).reduce(
    (distance,candidate)=>Math.min(distance,point.distanceTo(candidate)),
    Infinity,
  )

const createTurnoutGeometry=(heightAt,quality)=>{
  const segments=quality==='mobile'?36:72
  const positions=[-2,heightAt(-2,34)+.015,34]
  const indices=[]
  for(let index=0;index<segments;index+=1){
    const angle=index/segments*Math.PI*2
    const radius=1+(hash(index,2)-.5)*.12
    const x=-2+Math.cos(angle)*12*radius
    const z=34+Math.sin(angle)*8.5*radius
    positions.push(x,heightAt(x,z)+.018,z)
  }
  for(let index=0;index<segments;index+=1){
    indices.push(0,index+1,(index+1)%segments+1)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const makePatch=(name,radius,color,roughness,x,z,heightAt)=>{
  const patch=mesh(
    new THREE.CircleGeometry(radius,24),
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness:0,
      transparent:true,
      opacity:.72,
      depthWrite:false,
    }),
    [x,heightAt(x,z)+.035,z],
    [-Math.PI/2,0,0],
  )
  patch.name=name
  patch.scale.y=.62
  patch.castShadow=false
  return patch
}

export function createTrailhead(materials,{
  quality='desktop',
  heightAt,
  route,
  standingPoses=[],
}){
  const trailhead=namedGroup('trailhead')
  const gravel=namedGroup('trailhead-gravel')
  gravel.add(mesh(
    createTurnoutGeometry(heightAt,quality),
    new THREE.MeshStandardMaterial({
      color:'#756d5f',
      roughness:1,
      metalness:0,
    }),
  ))
  const earth=namedGroup('trailhead-earth')
  earth.add(
    makePatch('trailhead-earth-patch-1',4.1,'#665443',1,-5.1,35.4,heightAt),
    makePatch('trailhead-earth-patch-2',3.2,'#6c5844',1,2.6,31.8,heightAt),
  )

  const tireMarks=namedGroup('trailhead-tire-marks')
  ;[-.72,.72].forEach((offset,index)=>{
    const track=mesh(
      new THREE.BoxGeometry(.12,.018,9.2),
      new THREE.MeshStandardMaterial({color:'#403c35',roughness:1}),
      [-4+offset,heightAt(-4+offset,34)+.045,34],
      [0,-Math.PI/2,0],
    )
    track.name=`trailhead-tire-mark-${index+1}`
    track.castShadow=false
    tireMarks.add(track)
  })

  const damp=namedGroup('trailhead-damp-patches')
  damp.add(
    makePatch('trailhead-damp-patch-1',1.15,'#394944',.38,-8.1,31.1,heightAt),
    makePatch('trailhead-damp-patch-2',.82,'#344641',.34,.2,39.1,heightAt),
  )

  const grass=namedGroup('trailhead-edge-grass')
  const stones=namedGroup('trailhead-edge-stones')
  const bushes=namedGroup('trailhead-framing-bushes')
  const routeObstacles=[]
  const count=quality==='mobile'?28:56
  const turnoutBounds=new THREE.Box3(
    new THREE.Vector3(-10.5,-.1,29),
    new THREE.Vector3(4.5,4.2,40.2),
  )
  const standingPoints=standingPoses.map(pose=>new THREE.Vector3(...pose.position))

  for(let index=0;index<count;index+=1){
    const angle=index/count*Math.PI*2+(hash(index,9)-.5)*.12
    const radiusX=13.2+hash(index,10)*3.4
    const radiusZ=9.4+hash(index,11)*2.8
    const x=-2+Math.cos(angle)*radiusX
    const z=34+Math.sin(angle)*radiusZ
    const point=new THREE.Vector3(x,heightAt(x,z),z)
    if(minimumRouteDistance(point,route)<2.4) continue
    if(standingPoints.some(candidate=>candidate.distanceTo(point)<1.6)) continue

    const kind=index%3
    let object
    if(kind===0){
      object=mesh(
        new THREE.DodecahedronGeometry(.16+hash(index,12)*.24,0),
        materials.stone,
        point.toArray(),
        [hash(index,13),hash(index,14)*Math.PI,0],
      )
      object.name='trailhead-edge-stone'
      object.scale.y=.45
      stones.add(object)
    }else if(kind===1){
      object=mesh(
        new THREE.ConeGeometry(.06,.42+hash(index,15)*.28,5),
        index%2?materials.leaf:materials.leaf2,
        [x,point.y+.24,z],
      )
      object.name='trailhead-edge-grass-clump'
      grass.add(object)
    }else{
      object=mesh(
        new THREE.IcosahedronGeometry(.38+hash(index,16)*.32,1),
        index%2?materials.leaf2:materials.leaf,
        [x,point.y+.34,z],
      )
      object.name='trailhead-framing-bush'
      object.scale.set(1.2,.72,.9)
      bushes.add(object)
    }
    object.updateMatrixWorld(true)
    routeObstacles.push(new THREE.Box3().setFromObject(object))
  }

  trailhead.add(gravel,earth,tireMarks,damp,grass,stones,bushes)
  trailhead.userData={
    coachPose:{
      position:new THREE.Vector3(-4,heightAt(-4,34),34),
      heading:-Math.PI/2,
    },
    turnoutBounds,
    routeObstacles,
    routeClearance:1.5,
    cameraClearance:3,
  }
  return trailhead
}
```

- [ ] **Step 8: Run the terrain and trailhead tests to verify GREEN**

Run: `npm test -- --run src/three/terrain.test.js src/three/trailhead.test.js`

Expected: PASS for both files.

- [ ] **Step 9: Commit the shared opening ground**

```bash
git add src/three/terrain.js src/three/terrain.test.js src/three/trailhead.js src/three/trailhead.test.js
git commit -m "Extend mountain world with natural trailhead"
```

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

### Task 4: Blend the party departure and stage the coach in the controller

**Files:**
- Modify: `src/three/trekkingParty.js`
- Modify: `src/three/trekkingParty.test.js`
- Modify: `src/three/expeditionController.js`
- Modify: `src/three/expeditionController.test.js`
- Consume: `src/three/tourCoach.js`

**Interfaces:**
- Preserves `createTrekkingParty(materials): THREE.Group`.
- Extends `updateTrekkingParty` to:
  `updateTrekkingParty(party,curve,routeProgress,elapsed,reducedMotion,surfaceHeightAt,options={}): void`.
- `options` is `{departureWeight?:number,standingPoses?:readonly StandingPose[]}`; omission preserves the current fully walking behavior.
- Produces `getOpeningDepartureWeight(state): number`.
- Produces `getOpeningTrekState(state,routeLandmarks,partySpan): {departureWeight:number,routeProgress:number}`.
- `createExpeditionController` additionally returns `scenery:{coach}`; `worlds`, `transports`, and `transportRoot` retain their current keys and ownership.
- `getExpeditionTransition(state)` adds `opening:{departureWeight:number}` and never adds a coach transport weight.

- [ ] **Step 1: Add failing party tests for the standing arrangement and monotonic blend**

Add these imports and tests to `src/three/trekkingParty.test.js`:

```js
import {TRAILHEAD_STANDING_POSES} from './trekkingParty'

it('starts one guide and three tourists in distinct planted standing poses',()=>{
  const party=createTrekkingParty(createMaterials())
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.2,.35,34),
    new THREE.Vector3(2,3.1,22),
    new THREE.Vector3(0,5,12),
  ])
  const heightAt=(x,z)=>.35+(34-z)*.12+x*.01
  updateTrekkingParty(party,curve,0,2,false,heightAt,{
    departureWeight:0,
    standingPoses:TRAILHEAD_STANDING_POSES,
  })
  party.updateMatrixWorld(true)
  expect(party.userData.members.map(member=>member.role))
    .toEqual(['guide','tourist','tourist','tourist'])
  party.userData.members.forEach((member,index)=>{
    const [x,,z]=TRAILHEAD_STANDING_POSES[index].position
    expect(member.position.x).toBeCloseTo(x,6)
    expect(member.position.z).toBeCloseTo(z,6)
    expect(member.rotation.y).toBeCloseTo(TRAILHEAD_STANDING_POSES[index].heading,6)
    expect(getBootBounds(member).min.y).toBeCloseTo(heightAt(x,z),5)
    member.userData.legs.forEach(leg=>expect(leg.rotation.x).toBe(0))
    member.userData.arms.forEach(arm=>expect(arm.rotation.x).toBe(0))
  })
  disposeObject3D(party)
})

it('moves monotonically from standing positions into the guide-led route',()=>{
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.2,.35,34),
    new THREE.Vector3(2,3.1,22),
    new THREE.Vector3(0,5,12),
  ])
  const party=createTrekkingParty(createMaterials())
  const distances=[]
  ;[0,.25,.5,.75,1].forEach(weight=>{
    updateTrekkingParty(party,curve,.25,1,false,()=>.35,{
      departureWeight:weight,
      standingPoses:TRAILHEAD_STANDING_POSES,
    })
    const guide=party.userData.members[0]
    const [x,,z]=TRAILHEAD_STANDING_POSES[0].position
    distances.push(Math.hypot(guide.position.x-x,guide.position.z-z))
    expect(party.userData.departureWeight).toBe(weight)
  })
  distances.slice(1).forEach((distance,index)=>
    expect(distance).toBeGreaterThanOrEqual(distances[index])
  )
  expect(Math.abs(party.userData.members[0].userData.legs[0].rotation.x))
    .toBeGreaterThan(.01)
  disposeObject3D(party)
})

it('removes idle sway under reduced motion while retaining scroll-controlled departure',()=>{
  const curve=new THREE.LineCurve3(
    new THREE.Vector3(3.2,.35,34),
    new THREE.Vector3(0,5,12),
  )
  const party=createTrekkingParty(createMaterials())
  updateTrekkingParty(party,curve,.2,1,true,()=>.35,{
    departureWeight:.5,
    standingPoses:TRAILHEAD_STANDING_POSES,
  })
  const guide=party.userData.members[0]
  expect(guide.userData.torso.rotation.z).toBe(0)
  expect(guide.userData.torso.rotation.x).toBe(0)
  expect(guide.userData.backpack.rotation.z).toBe(0)
  expect(guide.position.z).not.toBe(TRAILHEAD_STANDING_POSES[0].position[2])
  disposeObject3D(party)
})
```

- [ ] **Step 2: Run the party tests to verify RED**

Run: `npm test -- --run src/three/trekkingParty.test.js`

Expected: FAIL because `departureWeight` and standing poses are not consumed by the current updater.

- [ ] **Step 3: Implement the standing-to-route blend and walking-amplitude blend**

Add this helper above `updateTrekkingParty`:

```js
const lerpHeading=(from,to,weight)=>
  from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*weight
```

Replace `updateTrekkingParty` with:

```js
export function updateTrekkingParty(
  party,
  curve,
  progress,
  elapsed,
  reducedMotion,
  surfaceHeightAt,
  {
    departureWeight=1,
    standingPoses=party?.userData?.standingPoses||TRAILHEAD_STANDING_POSES,
  }={},
){
  if(!party?.userData?.members||!curve) return
  const contactHeight=typeof surfaceHeightAt==='function'
    ?surfaceHeightAt
    :(x,z,point)=>point.y
  const weight=THREE.MathUtils.clamp(departureWeight,0,1)
  const partySpan=Math.max(...party.userData.members.map(member=>member.routeOffset))
  party.userData.departureWeight=weight

  party.userData.members.forEach((member,index)=>{
    const routeProgress=THREE.MathUtils.clamp(
      progress+partySpan-member.routeOffset,
      0,
      1,
    )
    const routePoint=curve.getPointAt(routeProgress)
    const tangent=curve.getTangentAt(Math.min(.9999,routeProgress+.0005))
    const routeHeading=Math.atan2(tangent.x,tangent.z)
    const standing=standingPoses[index]
    const standingPoint=new THREE.Vector3(...standing.position)
    member.position.lerpVectors(standingPoint,routePoint,weight)
    const surfaceY=contactHeight(member.position.x,member.position.z,routePoint)
    member.rotation.y=lerpHeading(standing.heading,routeHeading,weight)

    const phase=elapsed*5.2+member.phase
    const swing=Math.sin(phase)*.58*weight
    const idle=reducedMotion?0:Math.sin(elapsed*.9+member.phase)
    const secondary=reducedMotion?0:Math.sin(phase*.5)*weight
    const [leftArm,rightArm]=member.userData.arms
    const [leftLeg,rightLeg]=member.userData.legs
    leftArm.rotation.x=swing*.72
    rightArm.rotation.x=-swing*.72
    leftLeg.rotation.x=-swing
    rightLeg.rotation.x=swing
    member.userData.pole.rotation.x=-swing*.34
    member.userData.torso.rotation.z=secondary*.018+idle*.006*(1-weight)
    member.userData.torso.rotation.x=
      reducedMotion?0:Math.abs(Math.sin(phase))*.018*weight
    member.userData.backpack.rotation.z=
      reducedMotion?0:secondary*-.012

    member.position.y=surfaceY
    member.updateWorldMatrix(true,true)
    const rootY=member.getWorldPosition(rootPositionScratch).y
    bootBoundsScratch.makeEmpty()
    member.userData.bootMeshes.forEach(boot=>bootBoundsScratch.expandByObject(boot))
    const bootBottomOffset=bootBoundsScratch.min.y-rootY
    member.userData.bootBottomOffset=bootBottomOffset
    member.position.y=surfaceY-bootBottomOffset
  })
}
```

Change `createTrekkingParty` user data to clone the standing records:

```js
party.userData={
  members,
  phases:[...phases],
  routeOffsets:[...routeOffsets],
  standingPoses:TRAILHEAD_STANDING_POSES.map(pose=>({
    role:pose.role,
    position:[...pose.position],
    heading:pose.heading,
  })),
  departureWeight:1,
}
```

- [ ] **Step 4: Run party tests to verify GREEN**

Run: `npm test -- --run src/three/trekkingParty.test.js`

Expected: PASS for old fully walking calls and new standing/departure calls.

- [ ] **Step 5: Add failing controller tests for opening progress, static coach, and unchanged transport order**

Add these tests to `src/three/expeditionController.test.js`; controller integration reads the coach through `controller.scenery.coach`:

```js
it('maps the opening beats into one monotonic mountain-route departure',()=>{
  const scene=new THREE.Scene()
  const controller=createExpeditionController(scene,createMaterials(),'mobile')
  const weights=[]
  const guidePositions=[]
  ;[0,.045,.08,.12,.2,.28].forEach(progress=>{
    const transition=controller.update(getExpeditionState(progress),1,true)
    weights.push(transition.opening.departureWeight)
    guidePositions.push(
      controller.transports.trekker.userData.members[0].position.clone(),
    )
  })
  expect(weights.slice(0,2)).toEqual([0,0])
  expect(weights[2]).toBeCloseTo(.4376849383,8)
  expect(weights.slice(3)).toEqual([1,1,1])
  weights.slice(1).forEach((weight,index)=>
    expect(weight).toBeGreaterThanOrEqual(weights[index])
  )
  guidePositions.slice(1).forEach((position,index)=>
    expect(position.z).toBeLessThanOrEqual(guidePositions[index].z+.01)
  )
  controller.dispose()
})

it('mounts one stationary coach as mountain scenery and never as a transport',()=>{
  const scene=new THREE.Scene()
  const controller=createExpeditionController(scene,createMaterials(),'desktop')
  expect(Object.keys(controller.transports)).toEqual(['trekker','boat','jeep'])
  expect(Object.keys(controller.worlds)).toEqual(['mountain','water','forest'])
  expect(Object.keys(getExpeditionTransition(getExpeditionState(.08)).transports))
    .toEqual(['trekker','boat','jeep'])
  const coach=controller.scenery.coach
  expect(coach.parent).toBe(controller.worlds.mountain.userData.trailhead)
  scene.updateMatrixWorld(true)
  const initial=coach.matrixWorld.clone()
  ;[0,.08,.12,.28,.5,.84,1].forEach(progress=>{
    controller.update(getExpeditionState(progress),progress*10,true)
    scene.updateMatrixWorld(true)
    expect(coach.parent).toBe(controller.worlds.mountain.userData.trailhead)
    expect(coach.matrixWorld.equals(initial)).toBe(true)
  })
  controller.dispose()
})

it('plants the staged party beside the coach without intersections',()=>{
  const scene=new THREE.Scene()
  const controller=createExpeditionController(scene,createMaterials(),'desktop')
  controller.update(getExpeditionState(0),0,true)
  scene.updateMatrixWorld(true)
  const coachBounds=new THREE.Box3().setFromObject(controller.scenery.coach)
  controller.worlds.mountain.userData.route.getSpacedPoints(120)
    .slice(0,32)
    .forEach(point=>expect(coachBounds.distanceToPoint(point)).toBeGreaterThan(.35))
  const positions=new Set()
  controller.transports.trekker.userData.members.forEach(member=>{
    const bounds=new THREE.Box3().setFromObject(member)
    expect(bounds.intersectsBox(coachBounds)).toBe(false)
    expect(getBootBounds(member).min.y).toBeCloseTo(
      controller.worlds.mountain.userData.heightAt(member.position.x,member.position.z),
      2,
    )
    positions.add(`${member.position.x.toFixed(3)}:${member.position.z.toFixed(3)}`)
  })
  expect(positions.size).toBe(4)
  controller.dispose()
})

it('disposes coach geometry once and remains idempotent',()=>{
  const scene=new THREE.Scene()
  const controller=createExpeditionController(scene,createMaterials(),'mobile')
  const shell=controller.scenery.coach.getObjectByName('tour-coach-shell')
  const dispose=vi.spyOn(shell.geometry,'dispose')
  controller.dispose()
  controller.dispose()
  expect(dispose).toHaveBeenCalledTimes(1)
})
```

Keep the existing exact handoff, shared-material, mounted-root, opacity, landing, boat, jeep, and disposal coverage.

- [ ] **Step 6: Run the controller tests to verify RED**

Run: `npm test -- --run src/three/expeditionController.test.js`

Expected: FAIL because the controller exposes no coach/scenery, transition has no opening data, and early trek progress still maps linearly across the entire route.

- [ ] **Step 7: Add pure opening progress helpers and transition evidence**

Add the coach import:

```js
import {createTourCoach} from './tourCoach'
```

Add these exports after `getStateProgress` in `src/three/expeditionController.js`:

```js
export const getOpeningDepartureWeight=state=>
  smootherstep(.045,.12,getStateProgress(state))

export const getOpeningTrekState=(state,routeLandmarks,partySpan)=>{
  const progress=getStateProgress(state)
  const departureWeight=getOpeningDepartureWeight(state)
  const entryTail=Math.max(
    routeLandmarks.trailheadStart,
    routeLandmarks.mountainEntry-partySpan,
  )
  const landingTail=1-partySpan
  const routeProgress=progress<=.12
    ?THREE.MathUtils.lerp(
      routeLandmarks.trailheadStart,
      entryTail,
      departureWeight,
    )
    :THREE.MathUtils.lerp(
      entryTail,
      landingTail,
      smootherstep(.12,.28,progress),
    )
  return{departureWeight,routeProgress}
}
```

Add this field to the object returned by `getExpeditionTransition`:

```js
opening:{departureWeight:getOpeningDepartureWeight(state)},
```

Do not change `PHASE_RANGES`, biome weights, transport weights, or `cameraBlend`.

- [ ] **Step 8: Plant the coach before blend-state capture and drive the new party options**

Immediately after creating `mountain`, create and attach the coach:

```js
const coach=createTourCoach(quality)
const coachPose=mountain.userData.trailhead.userData.coachPose
coach.position.copy(coachPose.position)
coach.rotation.y=coachPose.heading
mountain.userData.trailhead.add(coach)
mountain.userData.coach=coach
```

This must execute before `roots`, `isolateSharedMaterials`, and `blendStates` are created so mountain blend/disposal ownership includes the coach.

Replace the trekking-party update inside the controller with:

```js
const opening=getOpeningTrekState(
  state,
  mountain.userData.routeProgress,
  partySpan,
)
updateTrekkingParty(
  trekker,
  mountain.userData.route,
  opening.routeProgress,
  elapsed,
  reducedMotion,
  mountainSurfaceHeightAt,
  {
    departureWeight:opening.departureWeight,
    standingPoses:trekker.userData.standingPoses,
  },
)
```

Leave boat and jeep progress calls unchanged. Return the coach without including it in `worlds`, `transports`, `transportRoot`, or `roots`:

```js
return{
  update,
  worlds,
  transports,
  transportRoot,
  scenery:{coach},
  dispose,
}
```

- [ ] **Step 9: Run the party/controller integration suite to verify GREEN**

Run: `npm test -- --run src/three/trekkingParty.test.js src/three/expeditionController.test.js src/three/expeditionVehicles.test.js src/three/waterWorld.test.js src/three/jungleWorld.test.js`

Expected: PASS. Transport keys remain exactly `trekker`, `boat`, `jeep`; later vehicle/world tests remain unchanged.

- [ ] **Step 10: Commit the staged departure**

```bash
git add src/three/trekkingParty.js src/three/trekkingParty.test.js src/three/expeditionController.js src/three/expeditionController.test.js
git commit -m "Stage coach-side trekking departure"
```

### Task 5: Add continuous desktop/mobile opening cameras and runtime evidence

**Files:**
- Modify: `src/three/journeyData.js`
- Modify: `src/three/journeyData.test.js`
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`
- Modify: `src/journey/chapters.test.js`
- Do not modify: `src/journey/chapters.js`

**Interfaces:**
- Desktop opening keyframes are fixed at progress `0`, `.08`, `.12`, and `.18`; every keyframe from `.28` onward stays unchanged.
- Produces `getResolvedCameraFrame({quality,progress,state,transportPosition})`.
- Produces `getProjectedObjectBounds(object,camera): {rendered,fullyFramed,coverage,ndcBounds}`.
- `getJourneyQASnapshot` adds `opening.departureWeight`, `opening.coach`, and `opening.fullyFramedMembers`.
- Mobile holds one coach/party establishing frame through `.045`, blends into the existing trekker-relative camera by `.12`, and keeps boat/jeep framing unchanged.

- [ ] **Step 1: Lock the new desktop camera beats and every retained phase boundary in tests**

Replace the old mountain-opening camera assertion in `src/three/journeyData.test.js` with:

```js
it('uses the approved ground-level coach, departure, and mountain-entry camera beats',()=>{
  const expected=[
    {progress:0,camera:[8.5,3.8,46],target:[-2,1.55,34.8]},
    {progress:.08,camera:[8,5.6,39.5],target:[2.6,1.9,28.5]},
    {progress:.12,camera:[7,8.4,30.5],target:[2,4.2,20]},
    {progress:.18,camera:[4.5,9.8,6],target:[0,3,-4]},
  ]
  expected.forEach(({progress,camera,target})=>{
    expect(getJourneyState(progress).cameraPosition).toEqual(camera)
    expect(getJourneyState(progress).cameraTarget).toEqual(target)
  })
})

it('keeps the complete expedition phase table unchanged after the opening',()=>{
  expect([
    [0,'mountain-trek'],
    [.279999,'mountain-trek'],
    [.28,'trek-to-boat'],
    [.419999,'trek-to-boat'],
    [.42,'water-boat'],
    [.599999,'water-boat'],
    [.60,'boat-to-jeep'],
    [.739999,'boat-to-jeep'],
    [.74,'forest-jeep'],
    [.939999,'forest-jeep'],
    [.94,'contact'],
    [1,'contact'],
  ].map(([progress])=>getExpeditionState(progress).phase)).toEqual([
    'mountain-trek',
    'mountain-trek',
    'trek-to-boat',
    'trek-to-boat',
    'water-boat',
    'water-boat',
    'boat-to-jeep',
    'boat-to-jeep',
    'forest-jeep',
    'forest-jeep',
    'contact',
    'contact',
  ])
})

it('keeps the complete desktop rail continuous at dense progress samples',()=>{
  for(let index=0;index<1000;index+=1){
    const from=getJourneyState(index/1000)
    const to=getJourneyState((index+1)/1000)
    const jump=Math.max(
      Math.hypot(...from.cameraPosition.map(
        (value,axis)=>value-to.cameraPosition[axis],
      )),
      Math.hypot(...from.cameraTarget.map(
        (value,axis)=>value-to.cameraTarget[axis],
      )),
    )
    expect(jump).toBeLessThanOrEqual(.8)
  }
})
```

- [ ] **Step 2: Run journey-data tests to verify RED**

Run: `npm test -- --run src/three/journeyData.test.js`

Expected: FAIL because the opening still uses the high mountain keyframes.

- [ ] **Step 3: Replace only the opening camera keyframes**

Replace the first four entries in `CINEMATIC_KEYFRAMES` in `src/three/journeyData.js`:

```js
const CINEMATIC_KEYFRAMES=[
  {p:0,camera:[8.5,3.8,46],target:[-2,1.55,34.8]},
  {p:.08,camera:[8,5.6,39.5],target:[2.6,1.9,28.5]},
  {p:.12,camera:[7,8.4,30.5],target:[2,4.2,20]},
  {p:.18,camera:[4.5,9.8,6],target:[0,3,-4]},
  {p:.28,camera:[8,7,-18],target:[2,1,-31.5]},
  {p:.35,camera:[7,6,-19],target:[2,1,-33]},
  {p:.42,camera:[-4,4,-27],target:[2,1,-34]},
  {p:.52,camera:[.8,1.55,-55],target:[-4.3,.42,-57.9]},
  {p:.60,camera:[-3,1.65,-82],target:[-2,.3,-86]},
  {p:.67,camera:[5,3.5,-78],target:[-2,1,-86]},
  {p:.74,camera:[7,4,-82],target:[-2,1,-86]},
  {p:.84,camera:[0,3.6,-100.5],target:[.15,1.15,-108]},
  {p:.94,camera:[1,3.8,-122],target:[1,.95,-130]},
  {p:1,camera:[1,3.8,-122],target:[1,.95,-130]},
]
```

Do not change `getExpeditionState`, journey copy, plan focus, or content visibility.

- [ ] **Step 4: Run journey-data tests to verify GREEN**

Run: `npm test -- --run src/three/journeyData.test.js`

Expected: PASS.

- [ ] **Step 5: Add failing mobile resolver, projection, and QA snapshot tests**

Add `getProjectedObjectBounds` and `getResolvedCameraFrame` to the imports in `src/three/indiaJourney.test.js`, then add:

```js
it('holds the mobile coach composition and blends exactly into trekker framing',()=>{
  const state={
    cameraPosition:[8.5,3.8,46],
    cameraTarget:[-2,1.55,34.8],
    expedition:{activeTransport:'trekker'},
  }
  const transportPosition=[2,3.1,22]
  const frame=progress=>getResolvedCameraFrame({
    quality:'mobile',
    progress,
    state,
    transportPosition,
  })
  expect(frame(0)).toEqual({
    camera:[3.5,5.1,67],
    target:[-2.5,1.55,34.8],
  })
  expect(frame(.045)).toEqual(frame(0))
  const middle=frame(.08)
  expect(middle.camera[2]).toBeLessThan(frame(0).camera[2])
  expect(frame(.12)).toEqual(
    getMobileTransportCamera('trekker',transportPosition),
  )
})

it('leaves desktop and later mobile transport frames unchanged',()=>{
  const state={
    cameraPosition:[7,6,-19],
    cameraTarget:[2,1,-33],
    expedition:{activeTransport:'boat'},
  }
  expect(getResolvedCameraFrame({
    quality:'desktop',
    progress:.5,
    state,
    transportPosition:[-2,.25,-60],
  })).toEqual({camera:state.cameraPosition,target:state.cameraTarget})
  expect(getResolvedCameraFrame({
    quality:'mobile',
    progress:.5,
    state,
    transportPosition:[-2,.25,-60],
  })).toEqual(getMobileTransportCamera('boat',[-2,.25,-60]))
})

it('reports whether an object is rendered and fully inside the camera frame',()=>{
  const camera=new THREE.PerspectiveCamera(60,1,.1,100)
  camera.position.set(0,1,5)
  camera.lookAt(0,1,0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  const material=new THREE.MeshBasicMaterial()
  const centered=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material)
  centered.position.y=1
  centered.updateMatrixWorld(true)
  expect(getProjectedObjectBounds(centered,camera)).toMatchObject({
    rendered:true,
    fullyFramed:true,
  })
  centered.position.x=100
  centered.updateMatrixWorld(true)
  expect(getProjectedObjectBounds(centered,camera)).toMatchObject({
    rendered:false,
    fullyFramed:false,
  })
  centered.geometry.dispose()
  material.dispose()
})

it('includes fail-closed coach and fully framed party evidence',()=>{
  const camera=new THREE.PerspectiveCamera(60,1,.1,100)
  camera.position.set(0,2,8)
  camera.lookAt(0,1,0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  const coach=new THREE.Group()
  coach.add(new THREE.Mesh(
    new THREE.BoxGeometry(2,1,4),
    new THREE.MeshBasicMaterial(),
  ))
  const trekker=new THREE.Group()
  trekker.userData.members=['guide','tourist','tourist','tourist'].map((role,index)=>{
    const member=Object.assign(new THREE.Group(),{role})
    member.position.set((index-1.5)*.6,1,0)
    member.add(new THREE.Mesh(
      new THREE.BoxGeometry(.3,1,.3),
      new THREE.MeshBasicMaterial(),
    ))
    trekker.add(member)
    return member
  })
  const snapshot=getJourneyQASnapshot({
    state:{expedition:{phase:'mountain-trek',activeTransport:'trekker'}},
    transition:{
      worlds:{mountain:1,water:0,forest:0},
      transports:{trekker:1,boat:0,jeep:0},
      opening:{departureWeight:0},
    },
    renderedWorlds:{mountain:true,water:false,forest:false},
    transports:{trekker,boat:new THREE.Group(),jeep:new THREE.Group()},
    scenery:{coach},
    camera,
    cameraJump:0,
  })
  expect(snapshot.opening).toMatchObject({
    departureWeight:0,
    coach:{mounted:false,rendered:true,fullyFramed:true},
    fullyFramedMembers:{guides:1,tourists:3},
  })
  expect(snapshot.opening.coach.worldMatrix).toHaveLength(16)
  disposeObject3D(coach)
  disposeObject3D(trekker)
})
```

- [ ] **Step 6: Run India-journey tests to verify RED**

Run: `npm test -- --run src/three/indiaJourney.test.js`

Expected: FAIL because the camera resolver, projected bounds helper, and opening QA evidence do not exist.

- [ ] **Step 7: Implement the pure mobile/desktop camera resolver**

Import `smootherstep` from `terrain.js` in `src/three/indiaJourney.js`:

```js
import {smootherstep} from './terrain'
```

Add these helpers after `getMobileTransportCamera`:

```js
const MOBILE_OPENING_FRAME=Object.freeze({
  camera:Object.freeze([3.5,5.1,67]),
  target:Object.freeze([-2.5,1.55,34.8]),
})

const lerpFrame=(from,to,weight)=>({
  camera:from.camera.map(
    (value,index)=>rounded(THREE.MathUtils.lerp(value,to.camera[index],weight)),
  ),
  target:from.target.map(
    (value,index)=>rounded(THREE.MathUtils.lerp(value,to.target[index],weight)),
  ),
})

export const getResolvedCameraFrame=({
  quality,
  progress,
  state,
  transportPosition,
})=>{
  const desktop={
    camera:[...state.cameraPosition],
    target:[...state.cameraTarget],
  }
  if(quality!=='mobile') return desktop
  const transport=getMobileTransportCamera(
    state.expedition.activeTransport,
    transportPosition,
  )
  if(state.expedition.activeTransport!=='trekker'||progress>=.12){
    return transport
  }
  return lerpFrame(
    MOBILE_OPENING_FRAME,
    transport,
    smootherstep(.045,.12,progress),
  )
}
```

Use this resolver both for initial camera setup and for every animation frame. After the initial expedition update:

```js
const initialTransport=expedition.transports[initialState.expedition.activeTransport]
const initialTransportPosition=getTransportWorldPosition(
  initialState.expedition.activeTransport,
  initialTransport,
).toArray()
const initialFrame=getResolvedCameraFrame({
  quality,
  progress:0,
  state:initialState,
  transportPosition:initialTransportPosition,
})
const cameraTarget=new THREE.Vector3(...initialFrame.target)
camera.position.set(...initialFrame.camera)
camera.lookAt(cameraTarget)
```

Replace the current desktop assignment plus mobile override in `animate` with:

```js
const transport=expedition.transports[state.expedition.activeTransport]
const transportPosition=getTransportWorldPosition(
  state.expedition.activeTransport,
  transport,
).toArray()
const resolvedFrame=getResolvedCameraFrame({
  quality,
  progress,
  state,
  transportPosition,
})
desiredCamera.set(...resolvedFrame.camera)
desiredTarget.set(...resolvedFrame.target)
```

Keep pointer motion, damping, maximum camera step `.78`, and atmosphere code unchanged.

- [ ] **Step 8: Implement projected bounds and opening QA evidence**

Add:

```js
export const getProjectedObjectBounds=(object,camera)=>{
  if(!object||!camera||!hierarchyVisible(object)){
    return{
      rendered:false,
      fullyFramed:false,
      coverage:0,
      ndcBounds:null,
    }
  }
  object.updateWorldMatrix(true,true)
  const bounds=new THREE.Box3().setFromObject(object)
  if(bounds.isEmpty()){
    return{
      rendered:false,
      fullyFramed:false,
      coverage:0,
      ndcBounds:null,
    }
  }
  const frustum=getCameraFrustum(camera)
  const minimum=new THREE.Vector3(Infinity,Infinity,Infinity)
  const maximum=new THREE.Vector3(-Infinity,-Infinity,-Infinity)
  const corner=new THREE.Vector3()
  for(const x of [bounds.min.x,bounds.max.x]){
    for(const y of [bounds.min.y,bounds.max.y]){
      for(const z of [bounds.min.z,bounds.max.z]){
        corner.set(x,y,z).project(camera)
        minimum.min(corner)
        maximum.max(corner)
      }
    }
  }
  const left=THREE.MathUtils.clamp((minimum.x+1)/2,0,1)
  const right=THREE.MathUtils.clamp((maximum.x+1)/2,0,1)
  const top=THREE.MathUtils.clamp((1-maximum.y)/2,0,1)
  const bottom=THREE.MathUtils.clamp((1-minimum.y)/2,0,1)
  const rendered=frustum.intersectsBox(bounds)
  const fullyFramed=rendered&&
    minimum.x>=-1&&maximum.x<=1&&
    minimum.y>=-1&&maximum.y<=1&&
    minimum.z>=-1&&maximum.z<=1
  return{
    rendered,
    fullyFramed,
    coverage:rounded(Math.max(0,right-left)*Math.max(0,bottom-top)),
    ndcBounds:{
      min:minimum.toArray().map(rounded),
      max:maximum.toArray().map(rounded),
    },
  }
}
```

Extend the `getJourneyQASnapshot` parameters with `scenery`, compute:

```js
const coach=scenery?.coach
const coachProjection=getProjectedObjectBounds(coach,camera)
const fullyFramedMembers=members.filter(member=>
  getProjectedObjectBounds(member,camera).fullyFramed
)
coach?.updateWorldMatrix(true,true)
```

Add this field to the snapshot:

```js
opening:{
  departureWeight:transition.opening?.departureWeight??1,
  coach:{
    mounted:Boolean(coach?.parent),
    rendered:coachProjection.rendered,
    fullyFramed:coachProjection.fullyFramed,
    worldMatrix:coach
      ?coach.matrixWorld.elements.map(rounded)
      :[],
  },
  fullyFramedMembers:{
    guides:fullyFramedMembers.filter(
      member=>(member.role||member.userData?.role)==='guide'
    ).length,
    tourists:fullyFramedMembers.filter(
      member=>(member.role||member.userData?.role)==='tourist'
    ).length,
  },
},
```

Pass `scenery:expedition.scenery` into `getJourneyQASnapshot` in `getQASnapshot`. Extend the visual-debug name filter to include `tour-coach` and `trailhead-` objects.

- [ ] **Step 9: Lock retained chapter boundaries**

Add this test to `src/journey/chapters.test.js` without changing `chapters.js`:

```js
it('keeps all approved content ranges unchanged around the trailhead opening',()=>{
  expect(OPENING_TREK_END).toBe(.14)
  expect(CHAPTERS.map(({id,progressStart,progressEnd})=>[
    id,
    progressStart,
    progressEnd,
  ])).toEqual([
    ['home',0,.14],
    ['who-we-are',.14,.28],
    ['plans',.28,.94],
    ['contact',.94,1],
  ])
})
```

- [ ] **Step 10: Run camera, QA-data, and chapter tests to verify GREEN**

Run: `npm test -- --run src/three/journeyData.test.js src/three/indiaJourney.test.js src/journey/chapters.test.js`

Expected: PASS. The exact `.28/.42/.60/.74/.94` expedition phases and `.14` content boundary remain unchanged.

- [ ] **Step 11: Commit camera and runtime evidence**

```bash
git add src/three/journeyData.js src/three/journeyData.test.js src/three/indiaJourney.js src/three/indiaJourney.test.js src/journey/chapters.test.js
git commit -m "Frame coach departure across desktop and mobile"
```

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
