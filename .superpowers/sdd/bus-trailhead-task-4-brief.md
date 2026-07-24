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

