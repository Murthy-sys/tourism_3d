import * as THREE from 'three'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {disposeObject3D} from './primitives'

const fixture=()=>{
  const scene=new THREE.Group(),bone=new THREE.Bone()
  const geometry=new THREE.BoxGeometry(.4,1,1.5)
  const texture=new THREE.DataTexture(new Uint8Array([102,77,50,255]),1,1)
  texture.colorSpace=THREE.SRGBColorSpace
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.92})
  const mesh=new THREE.SkinnedMesh(geometry,material)
  mesh.name='textured-animal'
  mesh.add(bone)
  mesh.bind(new THREE.Skeleton([bone]))
  scene.add(mesh)
  return{scene,animations:[new THREE.AnimationClip('Idle',2,[])]}
}

describe('realistic wildlife asset ownership',()=>{
  let adapter,fetchMock,parse,leases,roots,templates
  const acquire=options=>{leases++;return adapter.preloadRealisticWildlife(options)}
  const release=()=>{leases--;adapter.releaseRealisticWildlife()}
  const create=kind=>{
    const animal=adapter.createRealisticWildlife(kind)
    if(animal) roots.push(animal)
    return animal
  }
  const dispose=root=>{
    disposeObject3D(root)
    roots=roots.filter(candidate=>candidate!==root)
  }

  beforeEach(async()=>{
    vi.resetModules()
    leases=0;roots=[];templates=[]
    fetchMock=vi.fn(async()=>new Response(new Uint8Array([1,2,3])))
    vi.stubGlobal('fetch',fetchMock)
    parse=vi.spyOn(GLTFLoader.prototype,'parseAsync').mockImplementation(async()=>{
      const asset=fixture()
      templates.push(asset)
      return asset
    })
    adapter=await import('./realisticWildlife')
  })
  afterEach(()=>{
    roots.forEach(disposeObject3D)
    while(leases>0) release()
    parse.mockRestore()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('shares coat textures and geometry while cloning each animal skeleton and materials',async()=>{
    await Promise.all([acquire(),acquire()])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls.map(([url])=>url)).toEqual(['/models/forest-deer.glb','/models/forest-boar.glb'])
    const first=create('deer'),second=create('deer')
    const a=first.getObjectByName('textured-animal'),b=second.getObjectByName('textured-animal')
    expect(first.userData.realisticWildlife).toBe(true)
    expect(first.animations[0].name).toBe('Idle')
    expect(a.geometry).toBe(b.geometry)
    expect(a.material.map).toBe(b.material.map)
    expect(a.material).not.toBe(b.material)
    expect(a.skeleton).not.toBe(b.skeleton)
    expect(a.skeleton.bones[0]).not.toBe(b.skeleton.bones[0])
    a.material.color.set('#503c20')
    a.skeleton.bones[0].rotation.x=.6
    expect(b.material.color.getHex()).toBe(0xffffff)
    expect(b.skeleton.bones[0].rotation.x).toBeCloseTo(0,12)
    expect(a.material.map.colorSpace).toBe(THREE.SRGBColorSpace)
  })

  it('keeps shared resources until all leases and animals end and disposes each owner once',async()=>{
    await acquire()
    const first=create('deer'),second=create('deer')
    const a=first.getObjectByName('textured-animal'),b=second.getObjectByName('textured-animal')
    const geometryDisposed=vi.fn(),textureDisposed=vi.fn(),materialDisposed=vi.fn()
    a.geometry.addEventListener('dispose',geometryDisposed)
    a.material.map.addEventListener('dispose',textureDisposed)
    a.material.addEventListener('dispose',materialDisposed)
    const skeletonDisposed=vi.spyOn(a.skeleton,'dispose')
    release()
    expect(geometryDisposed).not.toHaveBeenCalled()
    dispose(first)
    first.userData.disposeRealisticWildlife()
    expect(skeletonDisposed).toHaveBeenCalledOnce()
    expect(materialDisposed).toHaveBeenCalledOnce()
    expect(geometryDisposed).not.toHaveBeenCalled()
    expect(b.material.map.image.data[0]).toBe(102)
    dispose(second)
    expect(geometryDisposed).toHaveBeenCalledOnce()
    expect(textureDisposed).toHaveBeenCalledOnce()
    expect(create('deer')).toBeNull()
    await acquire()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(create('deer')).not.toBeNull()
  })

  it('keeps an available species when another fails and never manufactures a placeholder animal',async()=>{
    fetchMock.mockImplementation(async url=>{
      if(url.endsWith('forest-boar.glb')) return new Response(null,{status:404})
      return new Response(new Uint8Array([1]))
    })
    await acquire()
    expect(create('deer')).not.toBeNull()
    expect(create('boar')).toBeNull()
    expect(create('unknown')).toBeNull()
  })
  it('rejects a partial species bundle in strict startup mode and retries the missing species',async()=>{
    fetchMock.mockImplementation(async url=>new Response(new Uint8Array([1]),{
      status:url.endsWith('forest-boar.glb')?404:200,
    }))
    await expect(acquire({strict:true})).rejects.toThrow('404')
    expect(create('deer')).not.toBeNull()
    expect(create('boar')).toBeNull()
    fetchMock.mockImplementation(async()=>new Response(new Uint8Array([1])))
    await expect(acquire({strict:true})).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(create('boar')).not.toBeNull()
  })

  it('aborts timed-out requests without parsing their eventual response bodies',async()=>{
    vi.useFakeTimers()
    const signals=[],complete=[]
    fetchMock.mockImplementation(async(_url,{signal})=>{
      signals.push(signal)
      return{ok:true,arrayBuffer:()=>new Promise(resolve=>complete.push(resolve))}
    })
    const outcome=expect(acquire({timeout:5000})).rejects.toThrow('wildlife loading timed out')
    await vi.advanceTimersByTimeAsync(5000)
    await outcome
    expect(signals.every(signal=>signal.aborted)).toBe(true)
    complete.forEach(resolve=>resolve(new ArrayBuffer(4)))
    await Promise.resolve()
    expect(parse).not.toHaveBeenCalled()
    expect(create('deer')).toBeNull()
    expect(create('boar')).toBeNull()
  })
  it('allows slow transfers to continue beyond the timeout while bytes keep arriving',async()=>{
    vi.useFakeTimers()
    const readers=[],signals=[]
    fetchMock.mockImplementation(async(_url,{signal})=>{
      signals.push(signal)
      const reader={read:()=>new Promise(resolve=>{reader.next=resolve}),releaseLock:vi.fn()}
      readers.push(reader)
      return{ok:true,body:{getReader:()=>reader}}
    })
    const ready=acquire({timeout:5000,strict:true})
    await vi.advanceTimersByTimeAsync(0)
    for(let chunk=0;chunk<3;chunk++){
      await vi.advanceTimersByTimeAsync(4000)
      readers.forEach(reader=>reader.next({done:false,value:new Uint8Array([chunk])}))
      await vi.advanceTimersByTimeAsync(0)
    }
    expect(signals.every(signal=>!signal.aborted)).toBe(true)
    readers.forEach(reader=>reader.next({done:true}))
    await ready
    expect(parse).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels abandoned scene downloads immediately',async()=>{
    vi.useFakeTimers()
    const signals=[]
    fetchMock.mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>{
      signals.push(signal)
      signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})
    }))
    const outcome=expect(acquire()).rejects.toThrow('Scene released')
    release()
    await outcome
    expect(signals).toHaveLength(2)
    expect(signals.every(signal=>signal.aborted)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('disposes parsed resources arriving after the deadline instead of exposing them later',async()=>{
    vi.useFakeTimers()
    const complete=[],lateAssets=[]
    parse.mockImplementation(()=>new Promise(resolve=>complete.push(resolve)))
    const outcome=expect(acquire({timeout:5000})).rejects.toThrow('wildlife loading timed out')
    await vi.advanceTimersByTimeAsync(0)
    expect(complete).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(5000)
    await outcome
    complete.forEach(resolve=>{
      const asset=fixture(),mesh=asset.scene.children[0]
      const geometry=vi.spyOn(mesh.geometry,'dispose'),texture=vi.spyOn(mesh.material.map,'dispose')
      lateAssets.push({geometry,texture})
      resolve(asset)
    })
    await Promise.resolve()
    lateAssets.forEach(({geometry,texture})=>{
      expect(geometry).toHaveBeenCalledOnce()
      expect(texture).toHaveBeenCalledOnce()
    })
    expect(create('deer')).toBeNull()
    expect(create('boar')).toBeNull()
  })
})
