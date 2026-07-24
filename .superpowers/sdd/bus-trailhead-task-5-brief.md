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

