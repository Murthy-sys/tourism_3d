import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { createEnvironmentMaterial,createFoliageGeometry,createLeafTexture } from './environmentSurface'

describe('procedural environment resources',()=>{
  it('owns separate small textures per material and uses linear relief with sRGB color',()=>{
    const first=createEnvironmentMaterial('#77725d','soil')
    const second=createEnvironmentMaterial('#77725d','soil')
    expect(first.map).not.toBe(second.map)
    expect(first.bumpMap).not.toBe(second.bumpMap)
    expect(first.map.image.width).toBe(128)
    expect(first.map.image.data).toEqual(second.map.image.data)
    expect(first.map.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(first.bumpMap.colorSpace).toBe(THREE.NoColorSpace)
    expect(first.map.userData.ownedByEnvironment).toBe(true)
    expect(first.map.generateMipmaps).toBe(true)
    expect(first.map.wrapS).toBe(THREE.RepeatWrapping)
    for(const material of [first,second]){
      material.map.dispose()
      material.bumpMap.dispose()
      material.dispose()
    }
  })

  it('builds bounded deterministic leaf clusters as one indexed mesh with cutout edges',()=>{
    const geometry=createFoliageGeometry({seed:4,variant:2,leaves:130})
    const copy=createFoliageGeometry({seed:4,variant:2,leaves:130})
    expect(geometry.getAttribute('position').array).toEqual(copy.getAttribute('position').array)
    expect(geometry.getAttribute('position').count).toBe(130*4)
    expect(geometry.index.count).toBe(130*6)
    expect(geometry.boundingSphere.radius).toBeLessThan(2)
    expect(geometry.getAttribute('normal').array.every(Number.isFinite)).toBe(true)
    const map=createLeafTexture()
    const alpha=Array.from(map.image.data).filter((_,index)=>index%4===3)
    expect(alpha.some(value=>value===0)).toBe(true)
    expect(alpha.some(value=>value===255)).toBe(true)
    expect(alpha.filter(value=>value===0).length).toBeGreaterThan(500)
    map.dispose()
    geometry.dispose()
    copy.dispose()
  })
})
