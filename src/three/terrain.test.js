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
