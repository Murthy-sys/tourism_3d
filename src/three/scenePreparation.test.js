import * as THREE from 'three'
import {afterEach,describe,expect,it,vi} from 'vitest'
import {captureSceneTransforms,JOURNEY_PREPARATION_STAGES,prepareJourneyScene,restoreSceneTransforms} from './scenePreparation'

const createHarness=()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera()
  const shared=new THREE.DataTexture(new Uint8Array([80,100,60,255]),1,1)
  const renderTexture=new THREE.Texture();renderTexture.isRenderTargetTexture=true
  const material=new THREE.MeshStandardMaterial({map:shared,normalMap:shared,envMap:renderTexture})
  const first=new THREE.Mesh(new THREE.BoxGeometry(),material)
  const second=new THREE.Mesh(new THREE.BoxGeometry(),material)
  first.position.set(1,2,3);second.visible=false;second.frustumCulled=false
  scene.add(first,second)
  const canvas=document.createElement('canvas');canvas.style.visibility='inherit'
  const originalTarget={name:'original-target'}
  const viewport=new THREE.Vector4(4,7,640,480),scissor=new THREE.Vector4(9,11,500,400)
  let target=originalTarget,face=2,mip=1,test=false
  const gl={
    SYNC_GPU_COMMANDS_COMPLETE:37143,ALREADY_SIGNALED:37146,CONDITION_SATISFIED:37148,
    TIMEOUT_EXPIRED:37147,WAIT_FAILED:37149,
    fenceSync:vi.fn(()=>({id:'fence'})),flush:vi.fn(),
    clientWaitSync:vi.fn(()=>37146),deleteSync:vi.fn(),
  }
  const renderer={
    info:{programs:[]},getContext:()=>gl,
    getViewport:out=>out.copy(viewport),getScissor:out=>out.copy(scissor),getScissorTest:()=>test,
    getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,
    setRenderTarget:vi.fn((value,nextFace=0,nextMip=0)=>{target=value;face=nextFace;mip=nextMip}),
    setViewport:vi.fn((...args)=>{if(args[0]?.isVector4)viewport.copy(args[0]);else viewport.set(...args)}),
    setScissor:vi.fn((...args)=>{if(args[0]?.isVector4)scissor.copy(args[0]);else scissor.set(...args)}),
    setScissorTest:vi.fn(value=>{test=value}),
    initTexture:vi.fn(),compile:vi.fn(),render:vi.fn(),
  }
  const restore=vi.fn(()=>first.position.set(1,2,3))
  const applyStage=vi.fn(({progress})=>first.position.set(progress,progress,progress))
  const release=()=>{first.geometry.dispose();second.geometry.dispose();material.dispose();shared.dispose();renderTexture.dispose()}
  return{scene,camera,canvas,renderer,restore,applyStage,first,second,shared,gl,originalTarget,viewport,scissor,release}
}

afterEach(()=>vi.useRealTimers())

describe('complete journey preparation before Start',()=>{
  it('preserves authored Euler branches and orders before later yaw-only animation',()=>{
    const scene=new THREE.Scene()
    const actors=['XYZ','YXZ'].flatMap(order=>[-3.04,2.65,Math.PI*2+.4].map(yaw=>{
      const actor=new THREE.Object3D()
      actor.rotation.set(0,yaw,0,order)
      scene.add(actor)
      return actor
    }))
    const transforms=captureSceneTransforms(scene)
    actors.forEach(actor=>actor.rotation.set(.3,.7,-.2,'ZYX'))
    restoreSceneTransforms(transforms)
    actors.forEach(actor=>{
      expect(actor.rotation.toArray()).toEqual(transforms.get(actor).rotation.toArray())
      actor.rotation.y=-2.8
      const forward=new THREE.Vector3(0,0,1).applyQuaternion(actor.quaternion)
      expect(forward.x).toBeCloseTo(Math.sin(-2.8),10)
      expect(forward.y).toBeCloseTo(0,10)
      expect(forward.z).toBeCloseTo(Math.cos(-2.8),10)
    })
  })

  it('uploads shared maps once and renders every transport/boarding/finale variant before completing',async()=>{
    const h=createHarness(),progress=[]
    const prepared=[]
    h.renderer.render.mockImplementation(()=>{
      expect(h.canvas.style.visibility).toBe('hidden')
      expect(h.renderer.getRenderTarget()).toBe(null)
      expect(h.viewport.toArray()).toEqual([0,0,64,64])
      expect(h.renderer.getScissorTest()).toBe(true)
      expect(h.first.frustumCulled).toBe(false)
      prepared.push(h.first.position.x)
    })
    await prepareJourneyScene({...h,onProgress:value=>progress.push(value),yieldFrame:async()=>{}})
    expect(h.renderer.initTexture).toHaveBeenCalledOnce()
    expect(h.renderer.initTexture).toHaveBeenCalledWith(h.shared)
    expect(h.renderer.compile).toHaveBeenCalledTimes(JOURNEY_PREPARATION_STAGES.length)
    expect(prepared).toEqual(expect.arrayContaining([0,.035,.20,.35,.50,.67,.80,.94,.985]))
    expect(progress[0]).toBe(0)
    expect(progress.at(-1)).toBe(1)
    expect(progress.every((value,index)=>!index||value>=progress[index-1])).toBe(true)
    expect(h.gl.flush).toHaveBeenCalledOnce()
    expect(h.gl.deleteSync).toHaveBeenCalledOnce()
    expect(h.restore).toHaveBeenCalledOnce()
    expect(h.first.position.toArray()).toEqual([1,2,3])
    expect(h.first.frustumCulled).toBe(true)
    expect(h.second.frustumCulled).toBe(false)
    expect(h.second.visible).toBe(false)
    expect(h.canvas.style.visibility).toBe('inherit')
    expect(h.renderer.getRenderTarget()).toBe(h.originalTarget)
    expect(h.renderer.getActiveCubeFace()).toBe(2)
    expect(h.renderer.getActiveMipmapLevel()).toBe(1)
    expect(h.viewport.toArray()).toEqual([4,7,640,480])
    expect(h.scissor.toArray()).toEqual([9,11,500,400])
    expect(h.renderer.getScissorTest()).toBe(false)
    h.release()
  })

  it('waits for parallel shader readiness and queued GPU work without blocking a frame',async()=>{
    const h=createHarness()
    let compiled=false,shaderReady=false,gpuReady=false,yields=0
    h.renderer.info.programs=[{isReady:()=>!compiled||shaderReady}]
    h.renderer.compile.mockImplementation(()=>{compiled=true})
    h.renderer.render.mockImplementation(()=>expect(shaderReady).toBe(true))
    h.gl.clientWaitSync.mockImplementation(()=>gpuReady?h.gl.ALREADY_SIGNALED:h.gl.TIMEOUT_EXPIRED)
    const onProgress=vi.fn()
    await prepareJourneyScene({...h,stages:[{progress:.5}],onProgress,yieldFrame:async()=>{
      yields++
      if(compiled) shaderReady=true
      if(h.gl.fenceSync.mock.calls.length) gpuReady=true
    }})
    expect(yields).toBeGreaterThanOrEqual(5)
    expect(h.gl.clientWaitSync).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenLastCalledWith(1)
    h.release()
  })

  it('cancels pending preparation immediately, clears its timer, and restores the canvas',async()=>{
    vi.useFakeTimers()
    const h=createHarness(),controller=new AbortController(),onProgress=vi.fn()
    const promise=prepareJourneyScene({...h,signal:controller.signal,onProgress})
    controller.abort()
    await expect(promise).rejects.toMatchObject({name:'AbortError'})
    expect(vi.getTimerCount()).toBe(0)
    expect(h.renderer.compile).not.toHaveBeenCalled()
    expect(h.renderer.render).not.toHaveBeenCalled()
    expect(onProgress).not.toHaveBeenCalledWith(1)
    expect(h.canvas.style.visibility).toBe('inherit')
    expect(h.restore).toHaveBeenCalledOnce()
    h.release()
  })

  it('restores renderer and scene state after a failed warmup render without reporting completion',async()=>{
    const h=createHarness(),onProgress=vi.fn()
    h.renderer.render.mockImplementation(()=>{throw new Error('GPU upload failed')})
    await expect(prepareJourneyScene({...h,onProgress,yieldFrame:async()=>{}}))
      .rejects.toThrow('GPU upload failed')
    expect(onProgress).not.toHaveBeenCalledWith(1)
    expect(h.restore).toHaveBeenCalledOnce()
    expect(h.first.position.toArray()).toEqual([1,2,3])
    expect(h.renderer.getRenderTarget()).toBe(h.originalTarget)
    expect(h.viewport.toArray()).toEqual([4,7,640,480])
    expect(h.canvas.style.visibility).toBe('inherit')
    h.release()
  })

  it('rejects a failed GPU fence and releases it instead of unlocking Start',async()=>{
    const h=createHarness(),onProgress=vi.fn()
    h.gl.clientWaitSync.mockReturnValue(h.gl.WAIT_FAILED)
    await expect(prepareJourneyScene({...h,stages:[{progress:0}],onProgress,yieldFrame:async()=>{}}))
      .rejects.toThrow('Graphics preparation did not finish')
    expect(h.gl.deleteSync).toHaveBeenCalledOnce()
    expect(onProgress).not.toHaveBeenCalledWith(1)
    expect(h.canvas.style.visibility).toBe('inherit')
    h.release()
  })
})
