import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {
  getAtmosphere,
  getDampingFactor,
  getMobileTransportCamera,
  getRenderQuality,
  getTransportWorldPosition,
  getWorldVisibility,
} from './indiaJourney'

describe('renderer quality', () => {
  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('mountain')).toEqual([])
    expect(getWorldVisibility('handoff')).toEqual([])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile party, boat, and jeep at readable trailing distances',()=>{
    expect(getMobileTransportCamera('trekker',[2,1,-30])).toEqual({camera:[5,3.2,-22],target:[2,1.9,-30]})
    expect(getMobileTransportCamera('boat',[-2,.25,-86])).toEqual({camera:[2,3.05,-77],target:[-2,1.05,-86]})
    expect(getMobileTransportCamera('jeep',[1,.2,-120])).toEqual({camera:[5,3.4,-111],target:[1,1.2,-120]})
  })
  it('frames the party around its members instead of its origin',()=>{
    const party=new THREE.Group()
    const guide=new THREE.Object3D()
    const tourist=new THREE.Object3D()
    guide.position.set(-1,1,-28)
    tourist.position.set(1,1,-32)
    party.add(guide,tourist)
    party.userData.members=[guide,tourist]
    expect(getTransportWorldPosition('trekker',party).toArray()).toEqual([0,1,-30])
  })
  it('uses delta-based damping and biome-weighted atmosphere',()=>{
    expect(getDampingFactor(0)).toBe(0)
    expect(getDampingFactor(1/60)).toBeCloseTo(1-Math.exp(-(1/60)*4.5),8)
    const atmosphere=getAtmosphere({mountain:.5,water:.5,forest:0})
    expect(atmosphere.fogNear).toBeGreaterThanOrEqual(18)
    expect(atmosphere.fogFar).toBeGreaterThan(100)
    expect(atmosphere.exposure).toBeGreaterThan(1)
    expect(atmosphere.background).toBeInstanceOf(THREE.Color)
  })
})
