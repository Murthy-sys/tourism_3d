import * as THREE from 'three'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {attachNaturalReflection} from './naturalWater'

const shaderFor=material=>{
  const shader={uniforms:{},vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <opaque_fragment>'}
  material.onBeforeCompile(shader,{})
  return shader
}

// Use the real Three Reflector, with a renderer that records its nested pass.
// This exercises its camera/clip matrix and state changes without requiring GL.
const createRenderer=()=>{
  const originalTarget=new THREE.WebGLRenderTarget(900,600)
  const viewport=new THREE.Vector4(12,23,640,480)
  let target=originalTarget,face=2,mip=1
  const renderer={
    xr:{enabled:true},shadowMap:{autoUpdate:true},autoClear:true,
    info:{autoReset:true,render:{calls:17,triangles:100}},
    getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,
    getCurrentViewport:out=>out.copy(viewport),
    setRenderTarget:vi.fn((next,nextFace=0,nextMip=0)=>{
      target=next;face=nextFace;mip=nextMip
      if(next) viewport.copy(next.viewport)
    }),
    state:{buffers:{depth:{setMask:vi.fn()}},viewport:vi.fn(value=>viewport.copy(value))},
    clear:vi.fn(),
  }
  renderer.render=vi.fn(()=>{
    if(renderer.info.autoReset) renderer.info.render={calls:0,triangles:0}
    renderer.info.render.calls+=5
    renderer.info.render.triangles+=70
  })
  return{renderer,originalTarget,viewport}
}

describe('natural planar water reflection lifecycle',()=>{
  let waterMeshes,targets,now
  const water=(options={})=>{
    const object=new THREE.Mesh(new THREE.PlaneGeometry(20,30),new THREE.MeshPhysicalMaterial())
    object.rotation.x=-Math.PI/2
    waterMeshes.push(object)
    attachNaturalReflection(object,options)
    return object
  }
  const renderContext=()=>{
    const context=createRenderer()
    targets.push(context.originalTarget)
    const camera=new THREE.PerspectiveCamera(48,1.5,.1,300)
    camera.position.set(3,7,12)
    camera.lookAt(0,0,0)
    camera.updateMatrixWorld(true)
    return{...context,camera,scene:new THREE.Scene()}
  }
  const draw=(object,context)=>object.onBeforeRender(context.renderer,context.scene,context.camera)

  beforeEach(()=>{
    waterMeshes=[];targets=[];now=0
    vi.spyOn(performance,'now').mockImplementation(()=>now)
  })
  afterEach(()=>{
    waterMeshes.forEach(object=>{
      object.userData.disposeNaturalWater?.()
      object.geometry.dispose()
      object.material.dispose()
    })
    targets.forEach(target=>target.dispose())
    vi.restoreAllMocks()
  })

  it('composes the existing shader deformation and program cache key',()=>{
    const object=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshPhysicalMaterial())
    waterMeshes.push(object)
    const previous=vi.fn(function(shader){
      expect(this).toBe(object.material)
      shader.uniforms.cascadeTime={value:2}
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','transformed.y += cascadeTime;\n#include <project_vertex>')
    })
    object.material.onBeforeCompile=previous
    object.material.customProgramCacheKey=()=> 'cascade-motion-v3'
    attachNaturalReflection(object)
    const shader=shaderFor(object.material)
    expect(previous).toHaveBeenCalledOnce()
    expect(shader.vertexShader).toContain('transformed.y += cascadeTime;')
    expect(shader.vertexShader).toContain('riverReflectionMatrix * vec4(vRiverWorld, 1.0)')
    expect(shader.fragmentShader).toContain('reflectedLandscape')
    expect(shader.uniforms.cascadeTime.value).toBe(2)
    expect(object.material.customProgramCacheKey()).toBe('cascade-motion-v3|natural-water-planar-v2')
  })

  it.each([['desktop',50,512],['mobile',100,256]])('throttles %s captures and preserves the ordinary object callback', (quality,interval,resolution)=>{
    const object=water({quality}),context=renderContext()
    const firstHook=object.onBeforeRender
    // Reattachment must release the first target, rather than stacking captures.
    const firstTexture=shaderFor(object.material).uniforms.riverReflection.value
    object.userData.disposeNaturalWater()
    const previous=vi.fn()
    object.onBeforeRender=previous
    attachNaturalReflection(object,{quality})
    const shader=shaderFor(object.material)
    expect(shader.uniforms.riverReflection.value).not.toBe(firstTexture)
    expect(object.onBeforeRender).not.toBe(firstHook)
    expect(object.material.userData.reflectionResolution).toBe(resolution)
    draw(object,context)
    now=interval-1;draw(object,context)
    expect(context.renderer.render).toHaveBeenCalledOnce()
    now=interval;draw(object,context)
    expect(context.renderer.render).toHaveBeenCalledTimes(2)
    expect(previous).toHaveBeenCalledTimes(3)
    expect(shader.uniforms.riverReflectionReady.value).toBe(1)
    expect(shader.uniforms.riverReflectionMatrix.value.elements.every(Number.isFinite)).toBe(true)
  })

  it('skips invisible biome water and cameras below the surface',()=>{
    const object=water({level:.1}),context=renderContext()
    const shader=shaderFor(object.material)
    object.material.opacity=.02
    draw(object,context)
    expect(context.renderer.render).not.toHaveBeenCalled()
    object.material.opacity=1
    context.camera.position.y=-1
    context.camera.updateMatrixWorld(true)
    draw(object,context)
    expect(context.renderer.render).not.toHaveBeenCalled()
    expect(shader.uniforms.riverReflectionReady.value).toBe(0)
    context.camera.position.y=4
    context.camera.updateMatrixWorld(true)
    draw(object,context)
    expect(context.renderer.render).toHaveBeenCalledOnce()
  })

  it('keeps distant water on its environment reflection instead of rendering a second scene',()=>{
    const object=water({maxDistance:70}),context=renderContext()
    context.camera.position.set(0,25,110)
    context.camera.updateMatrixWorld(true)
    draw(object,context)
    expect(context.renderer.render).not.toHaveBeenCalled()
    expect(shaderFor(object.material).uniforms.riverReflectionReady.value).toBe(0)
    context.camera.position.set(0,7,15)
    context.camera.updateMatrixWorld(true)
    draw(object,context)
    expect(context.renderer.render).toHaveBeenCalledOnce()
  })

  it('hides every water surface during capture, prevents recursion and restores renderer state',()=>{
    const first=water(),second=water(),context=renderContext()
    const {renderer,originalTarget,viewport}=context
    second.visible=false
    const before=viewport.clone()
    renderer.render.mockImplementationOnce(()=>{
      expect(first.visible).toBe(false)
      expect(second.visible).toBe(false)
      expect(renderer.xr.enabled).toBe(false)
      expect(renderer.shadowMap.autoUpdate).toBe(false)
      expect(renderer.info.autoReset).toBe(false)
      draw(second,context)
      renderer.info.render.calls+=5
      renderer.info.render.triangles+=70
    })
    draw(first,context)
    expect(renderer.render).toHaveBeenCalledOnce()
    expect(first.visible).toBe(true)
    expect(second.visible).toBe(false)
    expect(renderer.xr.enabled).toBe(true)
    expect(renderer.shadowMap.autoUpdate).toBe(true)
    expect(renderer.info.autoReset).toBe(true)
    expect(renderer.info.render).toEqual({calls:22,triangles:170})
    expect(renderer.getRenderTarget()).toBe(originalTarget)
    expect(renderer.getActiveCubeFace()).toBe(2)
    expect(renderer.getActiveMipmapLevel()).toBe(1)
    expect(viewport.toArray()).toEqual(before.toArray())
  })

  it('restores state and keeps environment shading if the optional capture fails',()=>{
    const object=water(),context=renderContext(),before=context.viewport.clone()
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})
    const shader=shaderFor(object.material)
    context.renderer.render.mockImplementationOnce(()=>{throw new Error('Capture unavailable')})
    expect(()=>draw(object,context)).not.toThrow()
    expect(object.visible).toBe(true)
    expect(context.renderer.xr.enabled).toBe(true)
    expect(context.renderer.shadowMap.autoUpdate).toBe(true)
    expect(context.renderer.info.autoReset).toBe(true)
    expect(context.renderer.getRenderTarget()).toBe(context.originalTarget)
    expect(context.renderer.getActiveCubeFace()).toBe(2)
    expect(context.viewport.toArray()).toEqual(before.toArray())
    expect(shader.uniforms.riverReflectionReady.value).toBe(0)
    now=1000;draw(object,context)
    expect(context.renderer.render).toHaveBeenCalledOnce()
    expect(warning).toHaveBeenCalledOnce()
    const other=water()
    draw(other,context)
    expect(context.renderer.render).toHaveBeenCalledTimes(2)
  })

  it('disposes its private target once, restores hooks and removes the surface from capture ownership',()=>{
    const object=new THREE.Mesh(new THREE.PlaneGeometry(),new THREE.MeshPhysicalMaterial())
    const originalCompile=object.material.onBeforeCompile,originalKey=object.material.customProgramCacheKey
    const originalRender=object.onBeforeRender
    waterMeshes.push(object)
    attachNaturalReflection(object)
    const context=renderContext()
    draw(object,context)
    const target=context.renderer.setRenderTarget.mock.calls[0][0]
    const disposed=vi.spyOn(target,'dispose')
    object.userData.disposeNaturalWater()
    object.userData.disposeNaturalWater()
    expect(disposed).toHaveBeenCalledOnce()
    expect(object.onBeforeRender).toBe(originalRender)
    expect(object.material.onBeforeCompile).toBe(originalCompile)
    expect(object.material.customProgramCacheKey).toBe(originalKey)
    const other=water()
    context.renderer.render.mockImplementationOnce(()=>expect(object.visible).toBe(true))
    now=100;draw(other,context)
    expect(context.renderer.render).toHaveBeenCalledTimes(2)
  })
})
