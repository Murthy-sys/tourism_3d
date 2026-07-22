import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createIndiaRegions } from './regions'
import { createMaterials, disposeObject3D } from './primitives'

describe('regional scene builders', () => {
  it('creates every regional group in journey order', () => {
    const root = createIndiaRegions(createMaterials(), 'desktop')
    expect(root.children.map((child) => child.name)).toEqual(['south', 'deccan', 'west-north', 'ganges', 'himalayas', 'tourism-operations-pavilion', 'plan-monuments', 'contact-pavilion'])
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
})
