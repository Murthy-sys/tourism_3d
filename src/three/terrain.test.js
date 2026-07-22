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
