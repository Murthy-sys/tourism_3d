import * as THREE from 'three'
import { describe,expect,it,vi } from 'vitest'
import { disposeObject3D } from './primitives'

describe('owned scene textures',()=>{
  it('leaves cached avatar buffers to their owner and releases the actor skeleton',()=>{
    const geometry=new THREE.BoxGeometry()
    geometry.userData.managedByTravellerTemplate=true
    const disposeGeometry=vi.spyOn(geometry,'dispose')
    const actor=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial())
    actor.userData.disposeRealisticTraveller=vi.fn()
    disposeObject3D(actor)
    expect(actor.userData.disposeRealisticTraveller).toHaveBeenCalledOnce()
    expect(disposeGeometry).not.toHaveBeenCalled()
    geometry.dispose()
  })
  it('releases per-instance buffers while disposing shared geometry only once',()=>{
    const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial()
    const first=new THREE.InstancedMesh(geometry,material,2)
    const second=new THREE.InstancedMesh(geometry,material,3)
    const firstDisposed=vi.fn(),secondDisposed=vi.fn()
    first.addEventListener('dispose',firstDisposed)
    second.addEventListener('dispose',secondDisposed)
    const geometryDisposed=vi.spyOn(geometry,'dispose')
    const root=new THREE.Group()
    root.add(first,second)
    disposeObject3D(root)
    expect(firstDisposed).toHaveBeenCalledOnce()
    expect(secondDisposed).toHaveBeenCalledOnce()
    expect(geometryDisposed).toHaveBeenCalledOnce()
  })

  it('disposes a shared generated texture once while leaving borrowed textures to their owner',()=>{
    const owned=new THREE.DataTexture(new Uint8Array(4),1,1)
    owned.userData.ownedByEnvironment=true
    const borrowed=new THREE.Texture()
    const disposeOwned=vi.spyOn(owned,'dispose')
    const disposeBorrowed=vi.spyOn(borrowed,'dispose')
    const material=new THREE.MeshStandardMaterial({map:owned,bumpMap:owned,envMap:borrowed})
    const root=new THREE.Group()
    root.add(new THREE.Mesh(new THREE.BoxGeometry(),material),new THREE.Mesh(new THREE.BoxGeometry(),material))
    disposeObject3D(root)
    expect(disposeOwned).toHaveBeenCalledOnce()
    expect(disposeBorrowed).not.toHaveBeenCalled()
    borrowed.dispose()
  })
})
