import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {LANDMARKS} from './terrain'
import {createRiverRoute,sampleRiverCrossSection,sampleRiverSurface} from './riverConfig'

describe('shared natural river layout',()=>{
  it('preserves the authoritative boat route and both transfer landmarks exactly',()=>{
    const reference=new THREE.CatmullRomCurve3([
      new THREE.Vector3(...LANDMARKS.mountainLanding),new THREE.Vector3(6.4,.2,-45),
      new THREE.Vector3(-4.8,.18,-58),new THREE.Vector3(4.2,.2,-72),
      new THREE.Vector3(...LANDMARKS.forestLanding),
    ],false,'catmullrom',.42)
    const route=createRiverRoute()
    for(let i=0;i<=100;i++) expect(route.getPointAt(i/100).distanceTo(reference.getPointAt(i/100))).toBeLessThan(1e-10)
    for(let i=8;i<=92;i++){
      const point=route.getPointAt(i/100),section=sampleRiverCrossSection(point.z)
      expect(point.x-section.leftX).toBeGreaterThan(2.5)
      expect(section.rightX-point.x).toBeGreaterThan(2.5)
      expect(sampleRiverSurface(point.x,point.z).bedHeight).toBeLessThan(-.4)
    }
  })

  it('creates broad asymmetric bends and coves instead of a constant-width route ribbon',()=>{
    const widths=[],asymmetry=[]
    for(let z=-44;z>=-75;z-=.5){
      const section=sampleRiverCrossSection(z)
      widths.push(section.width)
      asymmetry.push((section.rightX-section.centerX)-(section.centerX-section.leftX))
      expect(section.width).toBeGreaterThan(30)
      expect(section.width).toBeLessThan(45)
    }
    expect(Math.max(...widths)-Math.min(...widths)).toBeGreaterThan(4)
    expect(Math.max(...asymmetry)-Math.min(...asymmetry)).toBeGreaterThan(5)
  })

  it('provides actual exposed gravel bars while keeping the navigation channel deep',()=>{
    const section=sampleRiverCrossSection(-59.5)
    const bar=sampleRiverSurface(section.leftX+1.6,-59.5)
    expect(bar.barWeight).toBeGreaterThan(.95)
    expect(bar.bedHeight).toBeGreaterThan(bar.level+.03)
    expect(bar.depth).toBe(0)
    expect(sampleRiverSurface(section.centerX,-59.5).depth).toBeGreaterThan(1.5)
    expect(sampleRiverSurface(section.leftX-3,-59.5).edgeDistance).toBeGreaterThan(0)
    expect(sampleRiverSurface(section.centerX,-59.5).edgeDistance).toBeLessThan(0)
  })
})
