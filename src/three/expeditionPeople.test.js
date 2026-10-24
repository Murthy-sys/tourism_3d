import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { createExpeditionPerson,createContactShadow } from './expeditionPeople'
import { disposeObject3D } from './primitives'

describe('expedition people',()=>{
  it('uses adult proportions with a shaped facial profile and low mesh count',()=>{
    const person=createExpeditionPerson(0)
    const height=new THREE.Box3().setFromObject(person).getSize(new THREE.Vector3()).y
    const head=person.getObjectByName('head')
    const headHeight=new THREE.Box3().setFromObject(head).getSize(new THREE.Vector3()).y
    expect(height/headHeight).toBeGreaterThan(6.5)
    expect(height/headHeight).toBeLessThan(8)
    expect(head.geometry.type).toBe('BufferGeometry')
    expect(person.getObjectByName('eyes-and-brows')).toBeTruthy()
    expect(person.getObjectByName('lips')).toBeTruthy()
    let meshes=0
    person.traverse(object=>{if(object.isMesh) meshes++})
    expect(meshes).toBeLessThan(35)
    disposeObject3D(person)
  })

  it('retains the same adult head and identity in standing and seated poses',()=>{
    const standing=createExpeditionPerson(2)
    const seated=createExpeditionPerson(2,{seated:true})
    const size=root=>new THREE.Box3().setFromObject(root.getObjectByName('head')).getSize(new THREE.Vector3())
    expect(size(standing).distanceTo(size(seated))).toBeLessThan(1e-6)
    expect(standing.userData.identity).toBe(seated.userData.identity)
    expect(standing.getObjectByName('head').material.color.getHex())
      .toBe(seated.getObjectByName('head').material.color.getHex())
    expect(seated.userData.knees[0].rotation.x).toBeGreaterThan(1)
    expect(seated.userData.legs[0].rotation.x).toBeLessThan(-1)
    disposeObject3D(standing)
    disposeObject3D(seated)
  })

  it('keeps mobile contact shading soft, transparent and outside shadow-map work',()=>{
    const shadow=createContactShadow(.7,.9)
    expect(shadow.material.transparent).toBe(true)
    expect(shadow.material.depthWrite).toBe(false)
    expect(shadow.castShadow).toBe(false)
    expect(shadow.receiveShadow).toBe(false)
    expect(shadow.material.map).toBeNull()
    disposeObject3D(shadow)
  })
})
