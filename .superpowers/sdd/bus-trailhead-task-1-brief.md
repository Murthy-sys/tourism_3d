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

