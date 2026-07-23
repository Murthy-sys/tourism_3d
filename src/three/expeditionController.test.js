import * as THREE from 'three'
import { describe,expect,it,vi } from 'vitest'
import { getExpeditionState } from './journeyData'
import { createMaterials } from './primitives'
import { LANDMARKS } from './terrain'
import { createExpeditionController, getExpeditionTransition } from './expeditionController'

const getBootBounds=member=>{
  const bounds=new THREE.Box3()
  member.getObjectByName('boots').userData.parts.forEach(boot=>bounds.expandByObject(boot))
  return bounds
}

const getDeckSurfaceBounds=deck=>{
  const bounds=new THREE.Box3()
  deck.children
    .filter(child=>child.geometry?.type==='BoxGeometry')
    .forEach(plank=>bounds.expandByObject(plank))
  return bounds
}

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

  it('visibility-gates negligible worlds without alpha-fading live environments',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const mountainMesh=controller.worlds.mountain.getObjectByProperty('isMesh',true)
    const forestMesh=controller.worlds.forest.getObjectByProperty('isMesh',true)
    controller.update(getExpeditionState(0),0,false)
    expect(controller.worlds.forest.visible).toBe(false)
    expect(mountainMesh.castShadow).toBe(true)
    expect(forestMesh.castShadow).toBe(false)
    controller.update(getExpeditionState(.9),1,false)
    expect(controller.worlds.mountain.visible).toBe(false)
    expect(controller.worlds.forest.visible).toBe(true)
    expect(mountainMesh.castShadow).toBe(false)
    expect(forestMesh.castShadow).toBe(true)
    controller.dispose()
  })

  it('keeps environment and transport geometry opaque throughout handoffs',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const terrain=controller.worlds.mountain.getObjectByName('hill-terrain')
    const guide=controller.transports.trekker.getObjectByName('trekking-guide')
    const jacket=guide.getObjectByName('layered-torso-shell')
    controller.update(getExpeditionState(.08),0,true)
    expect(terrain.material.transparent).toBe(false)
    expect(terrain.material.depthWrite).toBe(true)
    expect(jacket.material.transparent).toBe(false)
    expect(jacket.material.depthWrite).toBe(true)
    controller.update(getExpeditionState(.35),0,true)
    expect(terrain.material.opacity).toBe(1)
    expect(terrain.material.transparent).toBe(false)
    expect(terrain.material.depthWrite).toBe(true)
    expect(jacket.material.opacity).toBe(1)
    expect(jacket.material.transparent).toBe(false)
    expect(jacket.material.depthWrite).toBe(true)
    controller.dispose()
  })

  it('preserves each environment material base state across biome transitions',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'desktop')
    const forestTerrain=controller.worlds.forest.children.find(child=>child.isMesh)
    const base={
      opacity:forestTerrain.material.opacity,
      transparent:forestTerrain.material.transparent,
      depthWrite:forestTerrain.material.depthWrite,
    }
    controller.update(getExpeditionState(.08),0,true)
    expect(forestTerrain.material).toMatchObject(base)
    controller.update(getExpeditionState(.84),1,true)
    expect(forestTerrain.material).toMatchObject(base)
    controller.dispose()
  })

  it('preserves live animated opacity without multiplying it by biome weight',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'desktop')
    const elapsed=2
    const state=getExpeditionState(.59)
    controller.update(state,elapsed,false)
    const foam=controller.worlds.water.getObjectByName('water-foam-accents').children[0]
    const animatedOpacity=.34+.16*Math.sin(elapsed*1.2)
    expect(foam.material.opacity).toBeCloseTo(animatedOpacity,5)
    controller.dispose()
  })

  it('keeps both staged transports opaque until their weights become negligible',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'desktop')
    controller.update(getExpeditionState(.67),1,true)
    const boat=controller.transports.boat
    const jeep=controller.transports.jeep
    const passengerMaterial=transport=>
      transport.userData.members[1].getObjectByProperty('isMesh',true).material
    expect(boat.visible).toBe(true)
    expect(jeep.visible).toBe(true)
    expect(passengerMaterial(boat)).toMatchObject({
      opacity:1,
      transparent:false,
      depthWrite:true,
    })
    expect(passengerMaterial(jeep)).toMatchObject({
      opacity:1,
      transparent:false,
      depthWrite:true,
    })
    controller.update(getExpeditionState(.84),2,true)
    expect(boat.visible).toBe(false)
    expect(jeep.visible).toBe(true)
    controller.dispose()
  })

  it('holds the separated party and stages the incoming boat beside the mountain landing',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    controller.update(getExpeditionState(.34),1,false)
    const members=controller.transports.trekker.userData.members.map(member=>member.position)
    const landing=new THREE.Vector3(...LANDMARKS.mountainLanding)
    expect(Math.hypot(members[0].x-landing.x,members[0].z-landing.z)).toBeLessThan(.01)
    expect(Math.hypot(
      controller.transports.boat.position.x-landing.x,
      controller.transports.boat.position.z-landing.z,
    )).toBeGreaterThan(1)
    for(let index=1;index<members.length;index+=1){
      expect(members[index].distanceTo(members[index-1])).toBeGreaterThan(.2)
    }
    controller.dispose()
  })

  it('keeps shared landmarks exact while planting boots and clearing the staged hull',()=>{
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
    ]
    aligned.forEach(position=>expect(position.distanceTo(landmark)).toBeLessThan(1e-6))
    const hillDeckObject=controller.worlds.mountain.getObjectByName('mountain-landing-deck')
    const waterDeckObject=controller.worlds.water.getObjectByName('boat-jetty')
    const hillDeck=getDeckSurfaceBounds(hillDeckObject)
    const waterDeck=getDeckSurfaceBounds(waterDeckObject)
    const hillCenter=hillDeck.getCenter(new THREE.Vector3())
    expect(Math.hypot(hillCenter.x-landmark.x,hillCenter.z-landmark.z)).toBeLessThan(.02)
    expect(hillDeck.max.y).toBeCloseTo(waterDeck.max.y,2)
    const members=controller.transports.trekker.userData.members
    const guideBoots=getBootBounds(members[0])
    expect(guideBoots.min.y).toBeCloseTo(hillDeck.max.y,5)
    members.forEach(member=>{
      const bootBounds=getBootBounds(member)
      const rootY=member.getWorldPosition(new THREE.Vector3()).y
      expect(member.userData.bootBottomOffset).toBeCloseTo(bootBounds.min.y-rootY,5)
    })
    const hullBounds=new THREE.Box3().setFromObject(
      controller.transports.boat.getObjectByName('boat-hull'),
    )
    expect(hullBounds.intersectsBox(new THREE.Box3().setFromObject(hillDeckObject))).toBe(false)
    expect(hullBounds.intersectsBox(new THREE.Box3().setFromObject(waterDeckObject))).toBe(false)
    controller.dispose()
  })

  it('plants every visible boot on the mountain surface during the opening trek',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'desktop')
    controller.update(getExpeditionState(.08),1,true)
    scene.updateMatrixWorld(true)
    const heightAt=controller.worlds.mountain.userData.heightAt
    controller.transports.trekker.userData.members.forEach(member=>{
      const root=member.getWorldPosition(new THREE.Vector3())
      const bootBottom=getBootBounds(member).min.y
      expect(bootBottom).toBeCloseTo(heightAt(root.x,root.z),2)
    })
    controller.dispose()
  })

  it('continuously merges the docked boat offset onto the authoritative water route',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'mobile')
    const route=controller.worlds.water.userData.route
    const offsets=[]
    const positions=[]
    ;[0,.0001,.04,.08,.12,.16].forEach(localProgress=>{
      controller.update(getExpeditionState(.42+localProgress*.18),1,true)
      const point=route.getPointAt(localProgress)
      const tangent=route.getTangentAt(localProgress).normalize()
      const lateral=new THREE.Vector3(tangent.z,0,-tangent.x).normalize()
      offsets.push(controller.transports.boat.position.clone().sub(point).dot(lateral))
      positions.push(controller.transports.boat.position.clone())
    })
    expect(Math.abs(offsets[0])).toBeGreaterThan(1)
    expect(Math.abs(offsets[1]-offsets[0])).toBeLessThan(.005)
    expect(positions[1].distanceTo(positions[0])).toBeLessThan(.02)
    const magnitudes=offsets.map(Math.abs)
    magnitudes.slice(1).forEach((value,index)=>{
      expect(value).toBeLessThanOrEqual(magnitudes[index]+1e-9)
    })
    expect(offsets[4]).toBeCloseTo(0,6)
    expect(offsets[5]).toBeCloseTo(0,6)
    controller.dispose()
  })

  it('keeps the docked boat and staged jeep physically separated throughout their handoff',()=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),'desktop')
    ;[.61,.67,.73].forEach(progress=>{
      controller.update(getExpeditionState(progress),1,true)
      scene.updateMatrixWorld(true)
      const boatBounds=new THREE.Box3().setFromObject(controller.transports.boat)
      const jeepBounds=new THREE.Box3().setFromObject(controller.transports.jeep)
      expect(boatBounds.intersectsBox(jeepBounds)).toBe(false)
      expect(boatBounds.distanceToPoint(jeepBounds.getCenter(new THREE.Vector3())))
        .toBeGreaterThan(.5)
    })
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
