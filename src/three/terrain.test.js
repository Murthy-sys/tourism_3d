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
  it('uses the supplied height sampler for terrain displacement and slopes',()=>{
    const heightAt=(x,z)=>x*x+z*.5
    const geometry=createTerrainGeometry({width:10,depth:20,segmentsX:2,segmentsZ:2,heightAt})
    const positions=geometry.attributes.position,slope=geometry.attributes.slope
    const expectedSlopes=[]

    expect(positions.getX(0)).toBeCloseTo(-5)
    expect(positions.getZ(0)).toBeCloseTo(-10)
    expect(positions.getY(0)).toBeCloseTo(heightAt(-5,-10))
    expect(geometry.attributes.normal.itemSize).toBe(3)
    expect(slope.itemSize).toBe(1)
    expect(slope.count).toBe(positions.count)

    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),z=positions.getZ(i)
      expectedSlopes.push(Math.hypot(
        heightAt(x+.15,z)-heightAt(x-.15,z),
        heightAt(x,z+.15)-heightAt(x,z-.15),
      )/.3)
    }
    const maxSlope=Math.max(...expectedSlopes)
    for(let i=0;i<slope.count;i++){
      expect(slope.getX(i)).toBeGreaterThanOrEqual(0)
      expect(slope.getX(i)).toBeLessThanOrEqual(1)
      expect(slope.getX(i)).toBeCloseTo(expectedSlopes[i]/maxSlope,5)
    }
  })
})
