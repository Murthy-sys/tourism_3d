import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {createExpeditionController} from './expeditionController'
import {getExpeditionState,getJourneyState} from './journeyData'
import {createMaterials,disposeObject3D} from './primitives'
import {getAtmosphereState,getDampingFactor,getMobileHandoffTargetOffset,getMobileTrekCamera,getPartyScreenSnapshot,getRenderFov,getRenderQuality,getTransportScreenSnapshot,getWorldVisibility,usesMobileTrekCamera} from './indiaJourney'

describe('renderer quality', () => {
  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
    expect(getRenderFov('mobile')).toBe(64)
    expect(getRenderFov('desktop')).toBe(48)
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('operations')).toEqual(['deccan','tourism-operations-pavilion'])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile trekker from a readable trailing distance',()=>{
    expect(getMobileTrekCamera([2,1,-130])).toEqual({camera:[5,4.5,-110],target:[2,1.7,-126]})
    expect(usesMobileTrekCamera('hill-trek')).toBe(true)
    expect(usesMobileTrekCamera('contact')).toBe(true)
    expect(usesMobileTrekCamera('water-boat')).toBe(false)
  })
  it('reports the guide and at least two tourists inside the mobile party frame',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    const transition=controller.update(getExpeditionState(.82),2,false)
    scene.updateMatrixWorld(true)
    const guide=controller.transports.trekker.userData.members[0].root.getWorldPosition(new THREE.Vector3())
    const framing=getMobileTrekCamera(guide.toArray())
    const camera=new THREE.PerspectiveCamera(getRenderFov('mobile'),390/844,.1,300)
    camera.position.set(...framing.camera)
    camera.lookAt(new THREE.Vector3(...framing.target))
    camera.updateMatrixWorld(true)

    const members=getPartyScreenSnapshot(controller.transports.trekker,camera,transition.transports.trekker)
    expect(members.filter(member=>member.visible&&member.role==='guide')).toHaveLength(1)
    expect(members.filter(member=>member.visible&&member.role==='tourist').length).toBeGreaterThanOrEqual(2)
    disposeObject3D(scene)
  })
  it('reports all four walkers inside the desktop party frame',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'desktop')
    const transition=controller.update(getExpeditionState(.82),2,false)
    scene.updateMatrixWorld(true)
    const framing=getJourneyState(.82)
    const camera=new THREE.PerspectiveCamera(48,1440/900,.1,300)
    camera.position.set(...framing.cameraPosition)
    camera.lookAt(new THREE.Vector3(...framing.cameraTarget))
    camera.updateMatrixWorld(true)

    const members=getPartyScreenSnapshot(controller.transports.trekker,camera,transition.transports.trekker)
    expect(members.filter(member=>member.visible)).toHaveLength(4)
    disposeObject3D(scene)
  })
  it('keeps both sides of each mobile handoff inside the portrait frame',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    const camera=new THREE.PerspectiveCamera(getRenderFov('mobile'),390/844,.1,300)
    const missing=[]
    for(const [progress,names] of [[.595,['jeep','boat']],[.725,['boat','trekker']]]){
      const transition=controller.update(getExpeditionState(progress),2,false)
      scene.updateMatrixWorld(true)
      const framing=getJourneyState(progress)
      camera.position.set(...framing.cameraPosition)
      const target=new THREE.Vector3(...framing.cameraTarget)
      target.x+=getMobileHandoffTargetOffset(getExpeditionState(progress))
      camera.lookAt(target)
      camera.updateMatrixWorld(true)
      const transports=getTransportScreenSnapshot(controller.transports,camera,transition.transports)
      names.forEach(name=>{
        const transport=transports.find(candidate=>candidate.name===name)
        if(!transport?.visible)missing.push({progress,name,ndc:transport?.ndc})
      })
    }
    expect(missing).toEqual([])
    disposeObject3D(scene)
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
