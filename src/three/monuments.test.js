import { describe, expect, it } from 'vitest'
import { createMaterials, disposeObject3D } from './primitives'
import { createOperationsPavilion, createPlanMonuments, createContactPavilion } from './monuments'

describe('architectural tourism environments', () => {
  it('creates a working nationwide tourism operations pavilion', () => {
    const pavilion=createOperationsPavilion(createMaterials(),'desktop')
    expect(pavilion.name).toBe('tourism-operations-pavilion')
    expect(pavilion.getObjectByName('route-planning-table')).toBeTruthy()
    expect(pavilion.getObjectByName('guide-meeting-point')).toBeTruthy()
    expect(pavilion.userData.anchors.copy).toBeDefined()
    disposeObject3D(pavilion)
  })

  it('creates three distinct plan monuments and a contact pavilion', () => {
    const plans=createPlanMonuments(createMaterials(),'desktop')
    expect(plans.children.filter(({userData})=>userData.planId)).toHaveLength(3)
    expect(new Set(plans.children.filter(({userData})=>userData.planId).map(({name})=>name)).size).toBe(3)
    const contact=createContactPavilion(createMaterials(),'desktop')
    expect(contact.name).toBe('contact-pavilion')
    expect(contact.userData.anchors.copy).toBeDefined()
    disposeObject3D(plans);disposeObject3D(contact)
  })
  it('uses a lush hill-country plan without snow or cone geometry',()=>{
    const plans=createPlanMonuments(createMaterials(),'desktop'),forbidden=[]
    plans.traverse(object=>{
      if(/snow|ice|himalaya/i.test(object.name)||object.geometry?.type==='ConeGeometry')forbidden.push(object.name||object.geometry.type)
    })
    expect(forbidden).toEqual([])
    expect(plans.getObjectByName('hill-country-trek-monument')).toBeTruthy()
    disposeObject3D(plans)
  })
})
