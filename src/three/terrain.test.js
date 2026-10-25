import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {sampleAccessRoad,ACCESS_ROAD_POINTS} from './accessRoad'
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

  it('keeps the mountain arrival and expands both later landscape corridors',()=>{
    expect(LANDMARKS).toMatchObject({
      trailheadStart:[3.2,.35,34],
      mountainEntry:[2,3.1,22],
      mountainStart:[0,5,12],
      mountainLanding:[2,.35,-34],
      forestLanding:[-2,.25,-138],
      forestEnd:[1,.2,-230],
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

  it('keeps the arrival valley below both opening cameras without changing the coach pad',()=>{
    for(const x of [3.5,8.5,12]){
      for(const z of [46,52,67,80]){
        expect(sampleMountainHeight(x,z)).toBeCloseTo(.35,6)
      }
    }
    expect(sampleMountainHeight(-4,34)).toBeCloseTo(.35,6)
    expect(sampleMountainHeight(3.2,34)).toBeCloseTo(.35,6)
    expect(sampleMountainHeight(2,22)).toBeCloseTo(3.1,1)
  })
})


it('grades the curved access road into the flat bus pad without changing the hiking route',()=>{
  const curve=new THREE.CatmullRomCurve3(ACCESS_ROAD_POINTS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal')
  let previous=null
  for(const point of curve.getSpacedPoints(100)){
    const surface=sampleAccessRoad(point.x,point.z)
    const height=sampleMountainHeight(point.x,point.z)
    expect(height).toBeCloseTo(surface.height,6)
    if(previous) expect(Math.abs(height-previous.height)/point.distanceTo(previous.point)).toBeLessThan(.13)
    previous={point,height}
  }
  for(const x of [-18,-14,-10,-8,-4]) expect(sampleMountainHeight(x,34)).toBeCloseTo(.35,5)
  expect(sampleMountainHeight(3.2,34)).toBeCloseTo(.35,6)
  expect(sampleMountainHeight(2,22)).toBeCloseTo(3.1,1)
})
