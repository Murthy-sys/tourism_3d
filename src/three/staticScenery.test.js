import * as THREE from 'three'
import { describe,expect,it,vi } from 'vitest'
import { batchStaticScenery } from './staticScenery'
import { disposeObject3D } from './primitives'

const addMeshes=(root,geometries,material)=>geometries.map((geometry,index)=>{
  const mesh=new THREE.Mesh(geometry,material)
  mesh.name=`obstacle-${index}`
  mesh.position.set(4+index*2,.5,index*.4)
  mesh.rotation.y=index*.3
  mesh.scale.set(1,.7+index*.1,1.1)
  mesh.castShadow=mesh.receiveShadow=true
  root.add(mesh)
  return mesh
})

describe('static scenery batching',()=>{
  it('renders repeated geometry with exact world transforms and preserves named collision meshes',()=>{
    const world=new THREE.Group(),grove=new THREE.Group()
    world.position.set(17,2,-48)
    grove.position.set(-3,1,5)
    grove.rotation.y=.35
    world.add(grove)
    const geometry=new THREE.BoxGeometry(1,3,2),material=new THREE.MeshStandardMaterial()
    const sources=addMeshes(grove,[geometry,geometry,geometry],material)
    world.updateMatrixWorld(true)
    const before=sources.map(source=>source.matrixWorld.clone())
    const bounds=new THREE.Box3().setFromObject(grove)
    const result=batchStaticScenery(world,[grove])
    expect(result).toEqual({sources:3,batches:1,savedDraws:2})
    const batch=world.children.at(-1).children[0]
    world.updateMatrixWorld(true)
    const instance=new THREE.Matrix4()
    sources.forEach((source,index)=>{
      batch.getMatrixAt(index,instance)
      instance.premultiply(batch.matrixWorld)
      instance.elements.forEach((value,axis)=>expect(value).toBeCloseTo(before[index].elements[axis],5))
      expect(world.getObjectByName(source.name)).toBe(source)
      expect(source.visible).toBe(false)
    })
    const renderedBounds=new THREE.Box3().setFromObject(batch)
    expect(renderedBounds.min.distanceTo(bounds.min)).toBeLessThan(1e-5)
    expect(renderedBounds.max.distanceTo(bounds.max)).toBeLessThan(1e-5)
    const disposeGeometry=vi.spyOn(geometry,'dispose')
    const disposeMaterial=vi.spyOn(material,'dispose')
    disposeObject3D(world)
    expect(disposeGeometry).toHaveBeenCalledTimes(1)
    expect(disposeMaterial).toHaveBeenCalledTimes(1)
  })

  it('merges unique geometry without changing vertex placement, material, UVs or shadow flags',()=>{
    const world=new THREE.Group(),grove=new THREE.Group()
    world.add(grove)
    const material=new THREE.MeshStandardMaterial()
    const sources=addMeshes(grove,[new THREE.BoxGeometry(1,2,1),new THREE.BoxGeometry(2,1,1)],material)
    world.updateMatrixWorld(true)
    const vertices=sources.flatMap(source=>{
      const attribute=source.geometry.getAttribute('position')
      return Array.from({length:attribute.count},(_,index)=>new THREE.Vector3().fromBufferAttribute(attribute,index).applyMatrix4(source.matrixWorld))
    })
    expect(batchStaticScenery(world,[grove]).savedDraws).toBe(1)
    const batch=world.children.at(-1).children[0]
    expect(batch.material).toBe(material)
    expect(batch.castShadow&&batch.receiveShadow).toBe(true)
    const position=batch.geometry.getAttribute('position')
    vertices.forEach((vertex,index)=>expect(new THREE.Vector3().fromBufferAttribute(position,index).distanceTo(vertex)).toBeLessThan(1e-5))
    expect(batch.geometry.getAttribute('uv').count).toBe(position.count)
    disposeObject3D(world)
  })

  it('keeps spatially separate groves independently culled and skips transparent scenery',()=>{
    const world=new THREE.Group(),grove=new THREE.Group()
    world.add(grove)
    const material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry()
    const sources=addMeshes(grove,Array(6).fill(geometry),material)
    sources.slice(3).forEach(source=>{source.position.z-=70})
    const mist=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({transparent:true,opacity:.1}))
    grove.add(mist)
    expect(batchStaticScenery(world,[grove],{cellSize:32})).toEqual({sources:6,batches:2,savedDraws:4})
    expect(mist.visible).toBe(true)
    const batches=world.children.at(-1).children
    expect(batches[0].boundingBox.intersectsBox(batches[1].boundingBox)).toBe(false)
    disposeObject3D(world)
  })
})
