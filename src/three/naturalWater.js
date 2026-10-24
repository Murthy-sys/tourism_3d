import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'

const surfaces=new Set()
let capturing=false

/** A single low-resolution planar capture supplies real landscape reflections.
 * The physical material still owns lighting, depth, normals and shore color. */
export function attachNaturalReflection(water,{quality='desktop',level=0,maxDistance=quality==='mobile'?70:85}={}){
  water.userData.disposeNaturalWater?.()
  const resolution=quality==='mobile'?256:512
  const reflector=new Reflector(new THREE.PlaneGeometry(1,1),{
    textureWidth:resolution,textureHeight:resolution,multisample:0,clipBias:.003,
  })
  reflector.rotation.x=-Math.PI/2
  const reflectionMatrix=new THREE.Matrix4(),inverseWorld=new THREE.Matrix4()
  const capture=reflector.onBeforeRender
  const material=water.material
  const previousCompile=material.onBeforeCompile
  const previousProgramKey=material.customProgramCacheKey
  const previousRender=water.onBeforeRender
  const viewport=new THREE.Vector4(),cameraPosition=new THREE.Vector3()
  if(!water.geometry.boundingSphere) water.geometry.computeBoundingSphere()
  const localCenter=water.geometry.boundingSphere.center.clone(),worldCenter=new THREE.Vector3()
  const visibleSurfaces=[],surfaceVisibility=[]
  const uniforms={
    riverReflection:{value:reflector.getRenderTarget().texture},
    riverReflectionMatrix:{value:reflectionMatrix},
    riverReflectionReady:{value:0},
    riverReflectionTexel:{value:new THREE.Vector2(1/resolution,1/resolution)},
  }
  material.userData.reflectionMode='planar-fresnel'
  material.userData.reflectionResolution=resolution
  const compile=(shader,renderer)=>{
    previousCompile.call(material,shader,renderer)
    Object.assign(shader.uniforms,uniforms)
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      uniform mat4 riverReflectionMatrix;
      varying vec4 vRiverReflection;
      varying vec3 vRiverWorld;`)
      .replace('#include <project_vertex>',`#include <project_vertex>
        vRiverWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vRiverReflection = riverReflectionMatrix * vec4(vRiverWorld, 1.0);`)
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D riverReflection;
      uniform float riverReflectionReady;
      uniform vec2 riverReflectionTexel;
      varying vec4 vRiverReflection;
      varying vec3 vRiverWorld;`)
      .replace('#include <opaque_fragment>',`
        vec3 waterNormal = inverseTransformDirection(normal, viewMatrix);
        vec3 waterView = normalize(cameraPosition - vRiverWorld);
        float waterFresnel = 0.04 + 0.91 * pow(1.0 - max(dot(waterNormal, waterView), 0.0), 4.0);
        vec2 reflectionUV = vRiverReflection.xy / max(vRiverReflection.w, 0.001);
        reflectionUV += waterNormal.xz * 0.018;
        float inCapture = step(0.002,reflectionUV.x)*step(reflectionUV.x,0.998)
          *step(0.002,reflectionUV.y)*step(reflectionUV.y,0.998);
        reflectionUV=clamp(reflectionUV,0.004,0.996);
        vec3 reflectedLandscape = texture2D(riverReflection,reflectionUV).rgb*.5;
        reflectedLandscape += texture2D(riverReflection,reflectionUV+vec2(riverReflectionTexel.x,0.0)).rgb*.125;
        reflectedLandscape += texture2D(riverReflection,reflectionUV-vec2(riverReflectionTexel.x,0.0)).rgb*.125;
        reflectedLandscape += texture2D(riverReflection,reflectionUV+vec2(0.0,riverReflectionTexel.y)).rgb*.125;
        reflectedLandscape += texture2D(riverReflection,reflectionUV-vec2(0.0,riverReflectionTexel.y)).rgb*.125;
        outgoingLight = mix(outgoingLight,reflectedLandscape,waterFresnel*inCapture*riverReflectionReady);
        #include <opaque_fragment>`)
  }
  const programKey=()=>`${previousProgramKey===THREE.Material.prototype.customProgramCacheKey
    ?previousCompile.toString():previousProgramKey.call(material)}|natural-water-planar-v2`
  material.onBeforeCompile=compile
  material.customProgramCacheKey=programKey
  material.needsUpdate=true
  surfaces.add(water)
  let lastCapture=-Infinity,disposed=false,failed=false
  const render=(renderer,scene,camera,...args)=>{
    previousRender.call(water,renderer,scene,camera,...args)
    if(capturing||disposed||failed||material.opacity<.03) return
    const now=performance.now(),interval=quality==='mobile'?100:50
    if(now-lastCapture<interval) return
    reflector.position.set(0,water.getWorldPosition(reflector.position).y+level,0)
    if(camera.getWorldPosition(cameraPosition).y<reflector.position.y){
      uniforms.riverReflectionReady.value=0
      return
    }
    worldCenter.copy(localCenter).applyMatrix4(water.matrixWorld)
    const distance=cameraPosition.distanceTo(worldCenter)
    if(distance>=maxDistance){
      uniforms.riverReflectionReady.value=0
      return
    }
    lastCapture=now
    reflector.updateMatrixWorld(true)
    visibleSurfaces.length=surfaceVisibility.length=0
    surfaces.forEach(surface=>{
      visibleSurfaces.push(surface)
      surfaceVisibility.push(surface.visible)
      surface.visible=false
    })
    capturing=true
    const previousTarget=renderer.getRenderTarget()
    const previousFace=renderer.getActiveCubeFace(),previousMip=renderer.getActiveMipmapLevel()
    const previousXR=renderer.xr.enabled,previousShadows=renderer.shadowMap.autoUpdate
    const previousAutoReset=renderer.info.autoReset
    renderer.getCurrentViewport(viewport)
    try{
      // Nested renders must contribute to the frame's counters instead of
      // erasing all draw calls submitted before the water surface.
      renderer.info.autoReset=false
      capture(renderer,scene,camera)
      inverseWorld.copy(reflector.matrixWorld).invert()
      reflectionMatrix.copy(reflector.material.uniforms.textureMatrix.value).multiply(inverseWorld)
      uniforms.riverReflectionReady.value=1-THREE.MathUtils.smoothstep(distance,maxDistance*.7,maxDistance)
    }catch(error){
      failed=true
      uniforms.riverReflectionReady.value=0
      console.warn('Landscape reflection unavailable; retaining environment water.',error)
    }finally{
      visibleSurfaces.forEach((surface,index)=>{surface.visible=surfaceVisibility[index]})
      capturing=false
      renderer.xr.enabled=previousXR
      renderer.shadowMap.autoUpdate=previousShadows
      renderer.info.autoReset=previousAutoReset
      renderer.setRenderTarget(previousTarget,previousFace,previousMip)
      renderer.state.viewport(viewport)
    }
  }
  water.onBeforeRender=render
  water.userData.disposeNaturalWater=()=>{
    if(disposed) return
    disposed=true
    surfaces.delete(water)
    uniforms.riverReflectionReady.value=0
    if(water.onBeforeRender===render) water.onBeforeRender=previousRender
    if(material.onBeforeCompile===compile) material.onBeforeCompile=previousCompile
    if(material.customProgramCacheKey===programKey) material.customProgramCacheKey=previousProgramKey
    material.needsUpdate=true
    reflector.geometry.dispose()
    reflector.dispose()
  }
  return water
}
