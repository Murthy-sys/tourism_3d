import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'
import { createExpeditionBoat, createExpeditionJeep, createTrekker, updateBoat, updateJeep, updateTrekker } from './expeditionVehicles'

const meshCount=object=>{
  let count=0
  object.traverse(child=>{if(child.isMesh) count+=1})
  return count
}

describe('expedition transports',()=>{
  it('creates a detailed jungle jeep with traveller and four wheels',()=>{
    const jeep=createExpeditionJeep(createMaterials())
    expect(jeep.name).toBe('jungle-jeep')
    expect(jeep.userData.wheels).toHaveLength(4)
    expect(jeep.getObjectByName('jeep-roll-cage')).toBeTruthy()
    expect(jeep.getObjectByName('expedition-traveller')).toBeTruthy()
    disposeObject3D(jeep)
  })
  it('creates a reference-matched teal rowboat with articulated rower and oars',()=>{
    const boat=createExpeditionBoat(createMaterials())
    expect(boat.name).toBe('water-boat')
    expect(boat.getObjectByName('boat-hull').material.color.getHexString()).toBe('176f70')
    expect(boat.userData.wakeAnchors).toHaveLength(2)
    expect(boat.getObjectByName('boat-rower')).toBeTruthy()
    expect(boat.getObjectByName('boat-rower-torso').material.color.getHexString()).toBe('e86524')
    expect(boat.getObjectByName('boat-oar-port')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-starboard')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-port-blade').material.color.getHexString()).toBe('f2a229')
    const hullSize=new THREE.Box3().setFromObject(boat.getObjectByName('boat-hull')).getSize(new THREE.Vector3())
    expect(hullSize.z).toBeGreaterThan(hullSize.x*2)
    expect(boat.getObjectByName('boat-rower').position.y).toBeLessThan(.5)
    disposeObject3D(boat)
  })
  it('keeps the articulated boat and visible wake',()=>{
    const boat=createExpeditionBoat(createMaterials())
    expect(boat.getObjectByName('boat-rower')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-left')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-right')).toBeTruthy()
    expect(boat.getObjectByName('boat-wake')).toBeTruthy()
    disposeObject3D(boat)
  })
  it('animates the rower and both oars as one rowing stroke',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    updateBoat(boat,curve,.4,0,false)
    const first={
      left:boat.getObjectByName('boat-oar-left').rotation.x,
      torso:boat.getObjectByName('boat-rower-torso-pivot').rotation.x,
      elbow:boat.getObjectByName('boat-rower-left-elbow').rotation.x,
    }
    updateBoat(boat,curve,.5,.72,false)
    expect(boat.getObjectByName('boat-oar-left').rotation.x).not.toBe(first.left)
    expect(boat.getObjectByName('boat-oar-right').rotation.x).toBeCloseTo(boat.getObjectByName('boat-oar-left').rotation.x)
    expect(boat.getObjectByName('boat-rower-torso-pivot').rotation.x).not.toBe(first.torso)
    expect(boat.getObjectByName('boat-rower-left-elbow').rotation.x).not.toBe(first.elbow)
    disposeObject3D(boat)
  })
  it('keeps both modern and compatibility oar groups attached to visible geometry',()=>{
    const boat=createExpeditionBoat(createMaterials())
    ;['boat-oar-left','boat-oar-right','boat-oar-port','boat-oar-starboard']
      .forEach(name=>expect(meshCount(boat.getObjectByName(name))).toBeGreaterThan(0))
    const wake=boat.getObjectByName('boat-wake')
    expect(new Set(wake.children.map(child=>child.material)).size).toBe(wake.children.length)
    disposeObject3D(boat)
  })
  it('keeps the two wake trails symmetric and subtler ripples behind them',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    updateBoat(boat,curve,.5,.6,false)
    const wake=boat.getObjectByName('boat-wake')
    const trails=wake.children.filter(child=>child.name.startsWith('boat-wake-trail'))
    const ripples=wake.children.filter(child=>child.name.startsWith('boat-wake-ripple'))
    expect(trails[0].material.opacity).toBeCloseTo(trails[1].material.opacity)
    ripples.forEach(ripple=>expect(ripple.material.opacity).toBeLessThan(trails[0].material.opacity))
    disposeObject3D(boat)
  })
  it('creates and animates an articulated trekker',()=>{
    const trekker=createTrekker(createMaterials())
    expect(trekker.userData.limbs).toHaveLength(4)
    expect(trekker.getObjectByName('trekker-backpack')).toBeTruthy()
    expect(trekker.getObjectByName('trekking-pole')).toBeTruthy()
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,-5)])
    updateTrekker(trekker,curve,.5,1,false)
    expect(trekker.userData.limbs[0].rotation.x).not.toBe(0)
    disposeObject3D(trekker)
  })
  it('moves jeep and boat along their routes',()=>{
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    const jeep=createExpeditionJeep(createMaterials()),boat=createExpeditionBoat(createMaterials())
    updateJeep(jeep,curve,.5,1,false);updateBoat(boat,curve,.5,1,false)
    expect(jeep.position.z).toBeCloseTo(-4,1)
    expect(boat.position.z).toBeCloseTo(-4,1)
    disposeObject3D(jeep);disposeObject3D(boat)
  })
  it('grounds all four jeep tires on the forest route',()=>{
    const routeY=.25
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,routeY,0),
      new THREE.Vector3(0,routeY,-8),
    ])
    const jeep=createExpeditionJeep(createMaterials())
    updateJeep(jeep,curve,.5,1,true)
    jeep.updateMatrixWorld(true)
    jeep.userData.wheels.forEach(wheel=>{
      const tireBottom=new THREE.Box3().setFromObject(wheel).min.y
      expect(Math.abs(tireBottom-routeY)).toBeLessThan(.035)
    })
    disposeObject3D(jeep)
  })
})
