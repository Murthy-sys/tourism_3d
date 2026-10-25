import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {LANDMARKS} from './terrain'
import {createRiverRoute,sampleRiverCrossSection,sampleRiverSurface} from './riverConfig'
import {mapJourneyZ} from './journeySpatial'

describe('shared natural river layout',()=>{
  it('navigates over a hundred metres between the shared transfer landmarks',()=>{
    const route=createRiverRoute()
    expect(route.getLength()).toBeGreaterThan(104)
    expect(route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(1e-10)
    expect(route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(1e-10)
    // The first 12% uses the boat's berth offset before joining this rail.
    for(let i=12;i<=92;i++){
      const point=route.getPointAt(i/100),section=sampleRiverCrossSection(point.z)
      expect(point.x-section.leftX).toBeGreaterThan(2.5)
      expect(section.rightX-point.x).toBeGreaterThan(2.5)
      expect(sampleRiverSurface(point.x,point.z).bedHeight).toBeLessThan(-.4)
    }
  })

  it('creates a long winding channel with asymmetric banks and navigable coves',()=>{
    const widths=[],asymmetry=[],centers=[]
    for(let z=mapJourneyZ(-44);z>=mapJourneyZ(-75);z-=.5){
      const section=sampleRiverCrossSection(z)
      widths.push(section.width)
      centers.push(section.centerX)
      asymmetry.push((section.rightX-section.centerX)-(section.centerX-section.leftX))
      expect(section.width).toBeGreaterThan(12)
      expect(section.width).toBeLessThan(18)
    }
    expect(Math.max(...widths)-Math.min(...widths)).toBeGreaterThan(1.8)
    expect(Math.max(...asymmetry)-Math.min(...asymmetry)).toBeGreaterThan(4)
    expect(Math.max(...centers)-Math.min(...centers)).toBeGreaterThan(9)
    expect(createRiverRoute().getLength()/Math.max(...widths)).toBeGreaterThan(6)
  })

  it('provides actual exposed gravel bars while keeping the navigation channel deep',()=>{
    const z=mapJourneyZ(-59.5)
    const section=sampleRiverCrossSection(z)
    const bar=sampleRiverSurface(section.leftX+1.6,z)
    expect(bar.barWeight).toBeGreaterThan(.95)
    expect(bar.bedHeight).toBeGreaterThan(bar.level+.03)
    expect(bar.depth).toBe(0)
    expect(sampleRiverSurface(section.centerX,z).depth).toBeGreaterThan(1.5)
    expect(sampleRiverSurface(section.leftX-3,z).edgeDistance).toBeGreaterThan(0)
    expect(sampleRiverSurface(section.centerX,z).edgeDistance).toBeLessThan(0)
  })
})
