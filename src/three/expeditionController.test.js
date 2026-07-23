import * as THREE from 'three'
import { describe,expect,it,vi } from 'vitest'
import { getExpeditionState } from './journeyData'
import { createMaterials } from './primitives'
import { LANDMARKS } from './terrain'
import { createExpeditionController, getExpeditionTransition } from './expeditionController'

describe('expedition transition',()=>{
  it('keeps worlds active and adjacent transports overlapping',()=>{
    const mountainHandoff=getExpeditionTransition(getExpeditionState(.34))
    expect(Object.keys(mountainHandoff.worlds)).toEqual(['mountain','water','forest'])
    expect(mountainHandoff.transports.trekker).toBeGreaterThan(.05)
    expect(mountainHandoff.transports.boat).toBeGreaterThan(.05)
    const forestHandoff=getExpeditionTransition(getExpeditionState(.68))
    expect(forestHandoff.transports.boat).toBeGreaterThan(.05)
    expect(forestHandoff.transports.jeep).toBeGreaterThan(.05)
  })

  it('uses continuous normalized handoff weights',()=>{
    const trekStart=getExpeditionTransition(getExpeditionState(.28))
    const trekMiddle=getExpeditionTransition(getExpeditionState(.35))
    const trekEnd=getExpeditionTransition(getExpeditionState(.42))
    expect(trekStart.transports).toEqual({trekker:1,boat:0,jeep:0})
    expect(trekMiddle.transports.trekker).toBeCloseTo(.5,5)
    expect(trekMiddle.transports.boat).toBeCloseTo(.5,5)
    expect(trekEnd.transports).toEqual({trekker:0,boat:1,jeep:0})
    ;[trekStart,trekMiddle,trekEnd].forEach(({transports})=>{
      expect(Object.values(transports).reduce((sum,weight)=>sum+weight,0)).toBeCloseTo(1,6)
    })
  })
})

describe('expedition controller integration',()=>{
  it('constructs all worlds and transports in one shared coordinate space',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    expect(Object.keys(controller.worlds)).toEqual(['mountain','water','forest'])
    expect(Object.keys(controller.transports)).toEqual(['trekker','boat','jeep'])
    Object.values(controller.worlds).forEach(world=>{
      expect(world.position.toArray()).toEqual([0,0,0])
      expect(world.visible).toBe(true)
    })
    expect(controller.transports.trekker.parent).toBe(controller.transportRoot)
    const mountainRouteEnd=controller.worlds.mountain.userData.route.getPointAt(1)
    expect(mountainRouteEnd.x).toBeCloseTo(LANDMARKS.mountainLanding[0],8)
    expect(mountainRouteEnd.z).toBeCloseTo(LANDMARKS.mountainLanding[2],8)
    expect(controller.worlds.water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(.01)
    expect(controller.worlds.water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(.01)
    expect(controller.worlds.forest.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(.01)
    controller.dispose()
  })

  it('does not mutate caller-owned shared materials while blending',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const before=Object.fromEntries(Object.entries(materials).map(([name,material])=>[
      name,
      {opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite},
    ]))
    const controller=createExpeditionController(scene,materials,'mobile')
    controller.update(getExpeditionState(.34),1,false,.016)
    controller.update(getExpeditionState(.68),2,false,.016)
    expect(Object.fromEntries(Object.entries(materials).map(([name,material])=>[
      name,
      {opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite},
    ]))).toEqual(before)
    controller.dispose()
  })

  it('keeps zero-weight worlds visible without ghost shadow casters',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const mountainMesh=controller.worlds.mountain.getObjectByProperty('isMesh',true)
    const forestMesh=controller.worlds.forest.getObjectByProperty('isMesh',true)
    controller.update(getExpeditionState(0),0,false)
    expect(controller.worlds.forest.visible).toBe(true)
    expect(mountainMesh.castShadow).toBe(true)
    expect(forestMesh.castShadow).toBe(false)
    controller.update(getExpeditionState(.9),1,false)
    expect(mountainMesh.castShadow).toBe(false)
    expect(forestMesh.castShadow).toBe(true)
    controller.dispose()
  })

  it('holds the separated party and incoming boat at the mountain landing',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    controller.update(getExpeditionState(.34),1,false)
    const members=controller.transports.trekker.userData.members.map(member=>member.position)
    const landing=new THREE.Vector3(...LANDMARKS.mountainLanding)
    expect(Math.hypot(members[0].x-landing.x,members[0].z-landing.z)).toBeLessThan(.01)
    expect(Math.hypot(
      controller.transports.boat.position.x-landing.x,
      controller.transports.boat.position.z-landing.z,
    )).toBeLessThan(.01)
    for(let index=1;index<members.length;index+=1){
      expect(members[index].distanceTo(members[index-1])).toBeGreaterThan(.2)
    }
    controller.dispose()
  })

  it('aligns both mountain worlds, party feet, and boat staging in full 3D',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    controller.update(getExpeditionState(.34),1,true)
    scene.updateMatrixWorld(true)
    const landmark=new THREE.Vector3(...LANDMARKS.mountainLanding)
    const aligned=[
      controller.worlds.mountain.userData.route.getPointAt(1),
      controller.worlds.mountain.userData.landing.getWorldPosition(new THREE.Vector3()),
      controller.worlds.water.userData.route.getPointAt(0),
      controller.worlds.water.userData.mountainLanding.getWorldPosition(new THREE.Vector3()),
      controller.transports.trekker.userData.members[0].getWorldPosition(new THREE.Vector3()),
      controller.transports.boat.getWorldPosition(new THREE.Vector3()),
    ]
    aligned.forEach(position=>expect(position.distanceTo(landmark)).toBeLessThan(1e-6))
    const hillDeck=new THREE.Box3().setFromObject(controller.worlds.mountain.userData.landing)
    const waterDeck=new THREE.Box3().setFromObject(controller.worlds.water.userData.mountainLanding)
    const hillCenter=hillDeck.getCenter(new THREE.Vector3())
    expect(Math.hypot(hillCenter.x-landmark.x,hillCenter.z-landmark.z)).toBeLessThan(.02)
    expect(hillDeck.max.y).toBeCloseTo(waterDeck.max.y,2)
    controller.dispose()
  })

  it('does not create unattached clones from the caller material palette',()=>{
    const scene=new THREE.Scene()
    const materials=createMaterials()
    const clones=[]
    Object.values(materials).forEach(material=>{
      const clone=material.clone.bind(material)
      vi.spyOn(material,'clone').mockImplementation(()=>{
        const result=clone()
        clones.push(result)
        return result
      })
    })
    const controller=createExpeditionController(scene,materials,'mobile')
    const attached=new Set()
    scene.traverse(object=>{
      const objectMaterials=Array.isArray(object.material)?object.material:[object.material]
      objectMaterials.filter(Boolean).forEach(material=>attached.add(material))
    })
    expect(clones.length).toBeGreaterThan(0)
    expect(clones.every(material=>attached.has(material))).toBe(true)
    controller.dispose()
    Object.values(materials).forEach(material=>material.dispose())
  })

  it('removes and disposes every constructed root',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const geometry=controller.worlds.mountain.getObjectByProperty('isMesh',true).geometry
    const dispose=vi.spyOn(geometry,'dispose')
    controller.dispose()
    expect(scene.children).not.toContain(controller.worlds.mountain)
    expect(scene.children).not.toContain(controller.transportRoot)
    expect(dispose).toHaveBeenCalledOnce()
  })
})
