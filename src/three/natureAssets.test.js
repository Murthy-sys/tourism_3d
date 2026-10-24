import * as THREE from 'three'
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {disposeObject3D} from './primitives'

describe('leased photographic nature assets',()=>{
  let loader,requests,leases,warning
  const acquire=()=>{leases++;return loader.preloadNatureAssets()}
  const release=()=>{leases--;loader.releaseNatureAssets()}
  const succeed=request=>{
    request.texture=new THREE.Texture()
    request.dispose=vi.spyOn(request.texture,'dispose')
    request.onLoad(request.texture)
    return request.texture
  }
  const finish=()=>requests.forEach(request=>succeed(request))

  beforeEach(async()=>{
    vi.resetModules()
    vi.useFakeTimers()
    leases=0
    requests=[]
    warning=vi.spyOn(console,'warn').mockImplementation(()=>{})
    const load=function(url,onLoad,onProgress,onError){
      requests.push({url,onLoad,onError})
      return new THREE.Texture()
    }
    vi.spyOn(THREE.TextureLoader.prototype,'load').mockImplementation(load)
    vi.spyOn(RGBELoader.prototype,'load').mockImplementation(load)
    loader=await import('./natureAssets')
  })

  afterEach(async()=>{
    while(leases>0) release()
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('loads local maps with correct color spaces and retains them until the last lease',async()=>{
    const ready=acquire()
    expect(requests).toHaveLength(20)
    expect(requests.every(request=>request.url.startsWith('/textures/nature/'))).toBe(true)
    finish()
    await ready
    const soil=loader.getNatureSurface('soil')
    expect(soil.map.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(soil.normalMap.colorSpace).toBe(THREE.NoColorSpace)
    expect(soil.roughnessMap.colorSpace).toBe(THREE.NoColorSpace)
    expect(soil.map.wrapS).toBe(THREE.RepeatWrapping)
    expect(soil.map.userData.managedByNatureAssets).toBe(true)
    expect(loader.getNatureTexture('leaf-alpha').wrapS).toBe(THREE.ClampToEdgeWrapping)
    expect(loader.getNatureTexture('leaf-alpha').repeat.x).toBe(.5)
    expect(loader.getNatureTexture('environment').mapping).toBe(THREE.EquirectangularReflectionMapping)
    expect(loader.getNatureSurface('wetrock').map).toBe(loader.getNatureSurface('rock').map)
    const sceneSurface=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshStandardMaterial(soil))
    disposeObject3D(sceneSurface)
    requests.forEach(request=>expect(request.dispose).not.toHaveBeenCalled())
    await acquire()
    expect(requests).toHaveLength(20)
    release()
    requests.forEach(request=>expect(request.dispose).not.toHaveBeenCalled())
    release()
    requests.forEach(request=>expect(request.dispose).toHaveBeenCalledOnce())
    expect(loader.getNatureTexture('soil-color')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('coalesces a StrictMode cleanup/remount while assets are still pending',async()=>{
    const abandoned=acquire()
    succeed(requests[0])
    release()
    const mounted=acquire()
    expect(mounted).toBe(abandoned)
    expect(requests).toHaveLength(20)
    requests.slice(1).forEach(request=>succeed(request))
    await mounted
    requests.forEach(request=>expect(request.dispose).not.toHaveBeenCalled())
    release()
    requests.forEach(request=>expect(request.dispose).toHaveBeenCalledOnce())
    const reloaded=acquire()
    expect(requests).toHaveLength(40)
    requests.slice(20).forEach(request=>succeed(request))
    await reloaded
  })

  it('settles failed maps independently and exposes procedural fallback for a missing surface',async()=>{
    const ready=acquire()
    requests.forEach(request=>{
      if(request.url.endsWith('soil-color.jpg')||request.url.endsWith('leaf-alpha.jpg')) request.onError(new Error('404'))
      else succeed(request)
    })
    await expect(ready).resolves.toBeUndefined()
    expect(loader.getNatureSurface('soil')).toBeNull()
    expect(loader.getNatureSurface('rock').map).toBeTruthy()
    expect(loader.getNatureTexture('leaf-alpha')).toBeNull()
    expect(warning).toHaveBeenCalledWith('2 nature textures unavailable; using fallback surfaces.')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('bounds loading time and disposes late successes instead of reviving a timed-out cache',async()=>{
    const ready=acquire()
    requests.slice(1).forEach(request=>succeed(request))
    await vi.advanceTimersByTimeAsync(19999)
    let finished=false
    ready.then(()=>{finished=true})
    await Promise.resolve()
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await ready
    expect(finished).toBe(true)
    expect(warning).toHaveBeenCalledWith('1 nature textures unavailable; using fallback surfaces.')
    const late=succeed(requests[0])
    expect(requests[0].dispose).toHaveBeenCalledOnce()
    expect(loader.getNatureTexture(late.name)).toBeNull()
    expect(loader.getNatureTexture('rock-color')).toBeNull()
  })

  it('disposes assets that finish after the only waiting scene unmounts',async()=>{
    const ready=acquire()
    release()
    finish()
    await ready
    requests.forEach(request=>expect(request.dispose).toHaveBeenCalledOnce())
    expect(loader.getNatureSurface('soil')).toBeNull()
  })
  it('requests compact local maps and honors the connection loading deadline',async()=>{
    leases++
    const ready=loader.preloadNatureAssets({compact:true,timeout:12000})
    expect(requests.every(request=>request.url.startsWith('/textures/nature/compact/'))).toBe(true)
    requests.slice(1).forEach(succeed)
    await vi.advanceTimersByTimeAsync(12000)
    await ready
    expect(loader.getNatureSurface('bark').map).toBeTruthy()
    expect(loader.getNatureSurface('rock')).toBeNull()
  })
})
