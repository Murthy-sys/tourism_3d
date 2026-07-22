import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createMaterials,disposeObject3D} from './primitives'
import {createExpeditionController,getTransitionState} from './expeditionController'
import {getExpeditionState} from './journeyData'

const sampleTransitions=()=>Array.from({length:201},(_,index)=>{
  const progress=index*.005
  return{progress,state:getTransitionState(getExpeditionState(progress))}
})

const materialFor=(root,name)=>{
  let material
  root.getObjectByName(name).traverse(object=>{if(!material&&object.material)material=object.material})
  return material
}

describe('continuous expedition transitions',()=>{
  it('keeps zone and transport weights normalized and continuous',()=>{
    const samples=sampleTransitions()
    const paths=[
      ['worlds','forest'],['worlds','water'],['worlds','hills'],
      ['transports','ambassador'],['transports','jeep'],['transports','boat'],['transports','trekker'],
    ]

    samples.forEach(({state})=>{
      expect(Object.values(state.worlds).reduce((sum,value)=>sum+value,0)).toBeCloseTo(1,6)
      expect(Object.values(state.transports).reduce((sum,value)=>sum+value,0)).toBeCloseTo(1,6)
    })

    paths.forEach(([group,key])=>{
      const maximumAdjacentDelta=Math.max(...samples.slice(1).map(({state},index)=>Math.abs(state[group][key]-samples[index].state[group][key])))
      expect(maximumAdjacentDelta).toBeLessThan(.08)
    })
  })

  it('overlaps adjacent zones and transports at all three physical handoffs',()=>{
    const ambassadorJeep=getTransitionState(getExpeditionState(.39))
    expect(ambassadorJeep.transports.ambassador).toBeGreaterThan(.05)
    expect(ambassadorJeep.transports.jeep).toBeGreaterThan(.05)

    const forestWater=getTransitionState(getExpeditionState(.60))
    expect(forestWater.worlds.forest).toBeGreaterThan(.05)
    expect(forestWater.worlds.water).toBeGreaterThan(.05)
    expect(forestWater.transports.jeep).toBeGreaterThan(.05)
    expect(forestWater.transports.boat).toBeGreaterThan(.05)

    const waterHills=getTransitionState(getExpeditionState(.72))
    expect(waterHills.worlds.water).toBeGreaterThan(.05)
    expect(waterHills.worlds.hills).toBeGreaterThan(.05)
    expect(waterHills.transports.boat).toBeGreaterThan(.05)
    expect(waterHills.transports.trekker).toBeGreaterThan(.05)
  })

  it('keeps all worlds alive and blends their materials instead of toggling visibility',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')

    for(const progress of [.39,.60,.72,.82]){
      const transition=controller.update(getExpeditionState(progress),2,false)
      expect(Object.keys(controller.worlds)).toEqual(['forest','water','hills'])
      expect(Object.values(controller.worlds).every(world=>world.visible)).toBe(true)
      expect(Object.values(controller.transports).every(transport=>transport.visible)).toBe(true)
      expect(transition).toEqual(getTransitionState(getExpeditionState(progress)))
    }

    const transition=controller.update(getExpeditionState(.60),2,false)
    const forestMaterial=materialFor(controller.worlds.forest,'forest-track')
    const waterMaterial=materialFor(controller.worlds.water,'left-river-bank')
    expect(forestMaterial.opacity).toBeCloseTo(transition.worlds.forest,6)
    expect(waterMaterial.opacity).toBeCloseTo(transition.worlds.water,6)
    expect(forestMaterial.depthWrite).toBe(transition.worlds.forest>.35)
    expect(waterMaterial.depthWrite).toBe(transition.worlds.water>.35)

    disposeObject3D(scene)
  })

  it('uses the guide-led party behind the camera-compatible trekker key',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    expect(controller.transports.trekker.name).toBe('guide-led-trekking-party')
    expect(controller.transports.trekker.userData.members).toHaveLength(4)
    expect(controller.worlds.hills.name).toBe('hill-world')
    disposeObject3D(scene)
  })

  it('does not jump transports backward at phase boundaries',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const positionOf=name=>name==='trekker'
      ? controller.transports.trekker.userData.members[0].root.position.clone()
      : controller.transports[name].position.clone()

    for(const [boundary,name] of [[.41,'jeep'],[.62,'boat'],[.75,'trekker']]){
      controller.update(getExpeditionState(boundary-1e-6),2,false)
      const before=positionOf(name)
      controller.update(getExpeditionState(boundary),2,false)
      expect(positionOf(name).distanceTo(before)).toBeLessThan(.01)
    }
    disposeObject3D(scene)
  })

  it('parks each incoming transport at its route start throughout the handoff',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const horizontalDistance=(position,routePoint)=>Math.hypot(position.x-routePoint.x,position.z-routePoint.z)

    controller.update(getExpeditionState(.39),2,false)
    expect(horizontalDistance(controller.transports.jeep.position,controller.worlds.forest.userData.route.getPointAt(0))).toBeLessThan(.01)

    controller.update(getExpeditionState(.60),2,false)
    expect(horizontalDistance(controller.transports.jeep.position,controller.worlds.forest.userData.route.getPointAt(1))).toBeLessThan(.01)
    expect(horizontalDistance(controller.transports.boat.position,controller.worlds.water.userData.route.getPointAt(0))).toBeLessThan(.01)

    controller.update(getExpeditionState(.72),2,false)
    const guide=controller.transports.trekker.userData.members[0].root
    expect(horizontalDistance(controller.transports.boat.position,controller.worlds.water.userData.route.getPointAt(1))).toBeLessThan(.01)
    expect(horizontalDistance(guide.position,controller.worlds.hills.userData.route.getPointAt(0))).toBeLessThan(.01)
    disposeObject3D(scene)
  })
})
