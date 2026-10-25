import * as THREE from 'three'

// Exercise opaque, fading and seated/walking variants before the gate opens.
// The same live objects are reused, so their geometry and bone textures stay
// resident after preparation instead of warming disposable scene copies.
export const JOURNEY_PREPARATION_STAGES=Object.freeze([
  {progress:0,arrivalProgress:0},
  ...[0,.035,.075,.20,.35,.50,.67,.80,.94,.985].map(progress=>({progress})),
].map(stage=>Object.freeze(stage)))

export const captureSceneTransforms=scene=>{
  const transforms=new Map()
  scene.traverse(object=>transforms.set(object,{
    position:object.position.clone(),rotation:object.rotation.clone(),scale:object.scale.clone(),
  }))
  return transforms
}

export const restoreSceneTransforms=transforms=>{
  transforms.forEach((transform,object)=>{
    object.position.copy(transform.position)
    // Preserve the Euler branch as well as its orientation. Restoring a yaw
    // quaternion near PI can introduce PI on X/Z; a later yaw-only animation
    // would then turn a standing traveller around or mirror their walk.
    object.rotation.copy(transform.rotation)
    object.scale.copy(transform.scale)
  })
}

const abortError=()=>new DOMException('Scene preparation cancelled','AbortError')
const checkAbort=signal=>{if(signal?.aborted) throw abortError()}

export const yieldPreparationFrame=signal=>new Promise((resolve,reject)=>{
  checkAbort(signal)
  const finish=()=>{signal?.removeEventListener('abort',cancel);resolve()}
  const timer=setTimeout(finish,16)
  const cancel=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(abortError())}
  signal?.addEventListener('abort',cancel,{once:true})
})

const collectTextures=scene=>{
  const textures=new Set()
  const add=value=>{if(value?.isTexture&&!value.isRenderTargetTexture) textures.add(value)}
  add(scene.background);add(scene.environment)
  scene.traverse(object=>{
    for(const material of (Array.isArray(object.material)?object.material:[object.material]).filter(Boolean)){
      Object.values(material).forEach(add)
      Object.values(material.uniforms||{}).forEach(uniform=>add(uniform.value))
    }
  })
  return [...textures]
}

/** Three r160's compileAsync owns uncancellable timers. Poll the same reported
 * WebGLProgram readiness here so scene disposal can cancel preparation without
 * a later timer reading destroyed material/program properties. */
const waitForPrograms=async(renderer,signal,yieldFrame)=>{
  const deadline=Date.now()+60000
  while(renderer.info.programs?.some(program=>program.isReady?.()===false)){
    checkAbort(signal)
    if(Date.now()>deadline) throw new Error('Graphics preparation timed out. Please retry.')
    await yieldFrame(signal)
  }
  checkAbort(signal)
}

const waitForGPU=async(renderer,signal,yieldFrame)=>{
  const gl=renderer.getContext?.()
  if(!gl?.fenceSync){await yieldFrame(signal);return}
  const sync=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0)
  if(!sync) throw new Error('The graphics context could not prepare the journey.')
  const deadline=Date.now()+60000
  gl.flush()
  try{
    while(true){
      checkAbort(signal)
      const result=gl.clientWaitSync(sync,0,0)
      if(result===gl.ALREADY_SIGNALED||result===gl.CONDITION_SATISFIED) break
      if(result===gl.WAIT_FAILED||Date.now()>deadline) throw new Error('Graphics preparation did not finish. Please retry.')
      await yieldFrame(signal)
    }
  }finally{gl.deleteSync(sync)}
}

/** Render behind the opaque loading screen with the canvas hidden. A normal
 * offscreen render target changes Three's output-color/tone-mapping programs;
 * a tiny default-framebuffer viewport warms the exact production variants.
 * Reflection and shadow passes still allocate their real retained targets. */
export async function prepareJourneyScene({
  renderer,scene,camera,canvas,applyStage,restore,
  stages=JOURNEY_PREPARATION_STAGES,signal,onProgress=()=>{},
  yieldFrame=yieldPreparationFrame,
}){
  const visibility=canvas?.style.visibility
  const viewport=renderer.getViewport(new THREE.Vector4())
  const scissor=renderer.getScissor(new THREE.Vector4())
  const scissorTest=renderer.getScissorTest()
  const target=renderer.getRenderTarget()
  const face=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel()
  const culling=new Map()
  scene.traverse(object=>{
    if(object.isMesh||object.isPoints||object.isLine||object.isSprite){
      culling.set(object,object.frustumCulled)
      object.frustumCulled=false
    }
  })
  const textures=collectTextures(scene)
  const textureBatches=Math.ceil(textures.length/4)
  const total=textureBatches+stages.length+1
  let completed=0
  if(canvas) canvas.style.visibility='hidden'
  onProgress(0)
  try{
    await yieldFrame(signal)
    for(let index=0;index<textures.length;index+=4){
      checkAbort(signal)
      textures.slice(index,index+4).forEach(texture=>renderer.initTexture(texture))
      onProgress(++completed/total)
      await yieldFrame(signal)
    }
    renderer.setRenderTarget(null)
    renderer.setViewport(0,0,64,64)
    renderer.setScissor(0,0,64,64)
    renderer.setScissorTest(true)
    for(const stage of stages){
      checkAbort(signal)
      applyStage(stage)
      scene.updateMatrixWorld(true)
      camera.updateMatrixWorld(true)
      renderer.compile(scene,camera)
      await waitForPrograms(renderer,signal,yieldFrame)
      checkAbort(signal)
      renderer.render(scene,camera)
      await waitForPrograms(renderer,signal,yieldFrame)
      onProgress(++completed/total)
      await yieldFrame(signal)
    }
    await waitForGPU(renderer,signal,yieldFrame)
    checkAbort(signal)
    onProgress(1)
  }finally{
    culling.forEach((value,object)=>{object.frustumCulled=value})
    renderer.setRenderTarget(target,face,mip)
    renderer.setViewport(viewport)
    renderer.setScissor(scissor)
    renderer.setScissorTest(scissorTest)
    restore()
    if(canvas) canvas.style.visibility=visibility
  }
}
