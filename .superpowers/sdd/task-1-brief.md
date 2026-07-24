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

