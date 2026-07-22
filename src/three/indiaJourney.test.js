import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {createExpeditionController} from './expeditionController'
import {getExpeditionState,getJourneyState} from './journeyData'
import {createMaterials,disposeObject3D} from './primitives'
import {getAtmosphereState,getDampingFactor,getMobileTrekCamera,getRenderQuality,getWorldVisibility,usesMobileTrekCamera} from './indiaJourney'

describe('renderer quality', () => {
  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('operations')).toEqual(['deccan','tourism-operations-pavilion'])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile trekker from a readable trailing distance',()=>{
    expect(getMobileTrekCamera([2,1,-130])).toEqual({camera:[5,3.2,-122],target:[2,1.9,-130]})
    expect(usesMobileTrekCamera('hill-trek')).toBe(true)
    expect(usesMobileTrekCamera('contact')).toBe(true)
    expect(usesMobileTrekCamera('water-boat')).toBe(false)
  })
  it('keeps mobile guide framing continuous into contact',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    const framingAt=progress=>{
      controller.update(getExpeditionState(progress),2,false)
      scene.updateMatrixWorld(true)
      const guide=controller.transports.trekker.userData.members[0].root.getWorldPosition(new THREE.Vector3())
      return getMobileTrekCamera(guide.toArray())
    }
    const before=framingAt(.92-1e-6),contact=framingAt(.92)
    expect(new THREE.Vector3(...contact.camera).distanceTo(new THREE.Vector3(...before.camera))).toBeLessThan(.01)
    expect(new THREE.Vector3(...contact.target).distanceTo(new THREE.Vector3(...before.target))).toBeLessThan(.01)
    disposeObject3D(scene)
  })
  it('enters mobile guide following continuously at the trek boundary',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    controller.update(getExpeditionState(.75),2,false)
    scene.updateMatrixWorld(true)
    const guide=controller.transports.trekker.userData.members[0].root.getWorldPosition(new THREE.Vector3())
    const follow=getMobileTrekCamera(guide.toArray())
    const before=getJourneyState(.75-1e-6)
    expect(new THREE.Vector3(...follow.camera).distanceTo(new THREE.Vector3(...before.cameraPosition))).toBeLessThan(.05)
    expect(new THREE.Vector3(...follow.target).distanceTo(new THREE.Vector3(...before.cameraTarget))).toBeLessThan(.05)
    disposeObject3D(scene)
  })
  it('uses frame-rate independent exponential damping',()=>{
    const at60Fps=getDampingFactor(1/60)
    const at30Fps=getDampingFactor(1/30)
    expect(at60Fps).toBeCloseTo(1-Math.exp(-(1/60)*4.5),8)
    expect(1-(1-at60Fps)**60).toBeCloseTo(1-(1-at30Fps)**30,8)
  })
  it('blends fog range and exposure from the same landscape weights',()=>{
    const forest=getAtmosphereState({forest:1,water:0,hills:0})
    const water=getAtmosphereState({forest:0,water:1,hills:0})
    const hills=getAtmosphereState({forest:0,water:0,hills:1})
    const blend=getAtmosphereState({forest:.25,water:.5,hills:.25})
    for(const key of ['fogNear','fogFar','exposure']){
      expect(blend[key]).toBeCloseTo(forest[key]*.25+water[key]*.5+hills[key]*.25,8)
    }
    expect(blend.fogFar).toBeGreaterThan(blend.fogNear)
  })
})
