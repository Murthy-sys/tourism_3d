import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createIndiaRegions } from './regions'
import { createMaterials, disposeObject3D } from './primitives'

describe('regional scene builders', () => {
  it('creates every regional group in journey order', () => {
    const root = createIndiaRegions(createMaterials(), 'desktop')
    expect(root.children.map((child) => child.name)).toEqual(['south', 'deccan', 'west-north', 'ganges', 'hill-country', 'tourism-operations-pavilion', 'plan-monuments', 'contact-pavilion'])
    expect(root).toBeInstanceOf(THREE.Group)
    disposeObject3D(root)
  })

  it('uses fewer meshes for mobile quality', () => {
    const count = (root) => { let n = 0; root.traverse((o) => { if (o.isMesh) n += 1 }); return n }
    const desktop = createIndiaRegions(createMaterials(), 'desktop')
    const mobile = createIndiaRegions(createMaterials(), 'mobile')
    expect(count(mobile)).toBeLessThan(count(desktop))
    disposeObject3D(desktop); disposeObject3D(mobile)
  })
  it('contains lush hill forms without hidden snow, ice, Himalayan, or cone assets',()=>{
    const materials=createMaterials(),root=createIndiaRegions(materials,'desktop')
    expect(materials).not.toHaveProperty('snow')
    const forbidden=[]
    root.traverse(object=>{
      if(/snow|ice|himalaya/i.test(object.name)||object.geometry?.type==='ConeGeometry')forbidden.push(object.name||object.geometry.type)
    })
    expect(forbidden).toEqual([])
    expect(root.getObjectByName('hill-country')).toBeTruthy()
    disposeObject3D(root)
  })
})
