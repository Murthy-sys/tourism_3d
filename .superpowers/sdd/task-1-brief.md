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

