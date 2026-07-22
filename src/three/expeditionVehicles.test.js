import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'
import { createExpeditionBoat, createExpeditionJeep, createTrekker, updateBoat, updateJeep, updateTrekker } from './expeditionVehicles'

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
  it('animates the rower and both oars as one rowing stroke',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    updateBoat(boat,curve,.4,0,false)
    const first={
      port:boat.getObjectByName('boat-oar-port').rotation.x,
      torso:boat.getObjectByName('boat-rower-torso-pivot').rotation.x,
      elbow:boat.getObjectByName('boat-rower-left-elbow').rotation.x,
    }
    updateBoat(boat,curve,.5,.72,false)
    expect(boat.getObjectByName('boat-oar-port').rotation.x).not.toBe(first.port)
    expect(boat.getObjectByName('boat-oar-starboard').rotation.x).toBeCloseTo(boat.getObjectByName('boat-oar-port').rotation.x)
    expect(boat.getObjectByName('boat-rower-torso-pivot').rotation.x).not.toBe(first.torso)
    expect(boat.getObjectByName('boat-rower-left-elbow').rotation.x).not.toBe(first.elbow)
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
})
