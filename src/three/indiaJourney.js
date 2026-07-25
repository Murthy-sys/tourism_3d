import * as THREE from 'three'
import { createExpeditionController } from './expeditionController'
import { clamp01,getJourneyState } from './journeyData'
import { createMaterials,disposeObject3D } from './primitives'
import { smootherstep } from './terrain'

export const getRenderQuality=width=>width<768?'mobile':'desktop'
export const getRendererProfile=(width,devicePixelRatio=1)=>{
  const quality=getRenderQuality(width)
  const numericRatio=Number(devicePixelRatio)
  const ratio=Number.isFinite(numericRatio)&&numericRatio>0?numericRatio:1
  return{
    quality,
    antialias:true,
    pixelRatio:quality==='mobile'
      ?THREE.MathUtils.clamp(ratio,1.25,1.75)
      :Math.min(ratio,2),
  }
}
const MOBILE_PIXEL_RATIOS=[1.25,1.5,1.75]
const MAX_MEASURABLE_FRAME_MS=250

export const createAdaptivePixelRatioController=(
  initialPixelRatio,
  options={},
)=>{
  const{
    warmupFrames,
    sampleFrames,
    cooldownFrames,
    warmupMs=1000,
    sampleMs=1000,
    cooldownMs=3000,
    slowFrameMs=22,
  }=options
  const timedWarmup=warmupFrames===undefined
  const timedSample=sampleFrames===undefined
  const timedCooldown=cooldownFrames===undefined
  let ratio=THREE.MathUtils.clamp(
    initialPixelRatio,
    MOBILE_PIXEL_RATIOS[0],
    MOBILE_PIXEL_RATIOS.at(-1),
  )
  let warmup=Math.max(0,timedWarmup?warmupMs:warmupFrames)
  let cooldown=0
  let samples=[]
  let sampledMs=0
  return{
    observe(frameDurationMs){
      if(
        !Number.isFinite(frameDurationMs)||
        frameDurationMs>MAX_MEASURABLE_FRAME_MS
      ) return null
      const duration=Math.max(0,frameDurationMs)
      if(warmup>0){
        warmup-=timedWarmup?duration:1
        return null
      }
      if(cooldown>0){
        cooldown-=timedCooldown?duration:1
        return null
      }
      samples.push(duration)
      sampledMs+=duration
      if(timedSample?sampledMs<sampleMs:samples.length<sampleFrames) return null
      const average=samples.reduce((sum,value)=>sum+value,0)/samples.length
      samples=[]
      sampledMs=0
      if(average<=slowFrameMs||ratio<=MOBILE_PIXEL_RATIOS[0]) return null
      ratio=MOBILE_PIXEL_RATIOS
        .filter(candidate=>candidate<ratio)
        .at(-1)??MOBILE_PIXEL_RATIOS[0]
      cooldown=Math.max(0,timedCooldown?cooldownMs:cooldownFrames)
      return ratio
    },
    value:()=>ratio,
  }
}
export const applyAdaptivePixelRatio=(controller,delta,renderer,resize)=>{
  const nextPixelRatio=controller?.observe(delta*1000)
  if(nextPixelRatio!==null&&nextPixelRatio!==undefined){
    renderer.setPixelRatio(nextPixelRatio)
    resize()
  }
}
export const getWorldVisibility=()=>[]
export const getDampingFactor=delta=>1-Math.exp(-Math.max(0,delta)*4.5)
export const getCameraDampingFactor=(delta,quality='desktop')=>{
  const base=getDampingFactor(Math.min(Math.max(delta,0),.5))
  return base*(quality==='mobile'?.72:1)
}
export const dampCameraVector=(current,desired,damping,maxStep=Infinity)=>{
  const distance=current.distanceTo(desired)
  if(distance===0) return current
  return current.lerp(desired,Math.min(damping,maxStep/distance))
}
const distance3=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]))
export const getCameraRailJump=(progress,step=.001)=>{
  const from=getJourneyState(clamp01(progress))
  const nextProgress=progress+step<=1?progress+step:progress-step
  const to=getJourneyState(clamp01(nextProgress))
  return rounded(Math.max(
    distance3(from.cameraPosition,to.cameraPosition),
    distance3(from.cameraTarget,to.cameraTarget),
  ))
}

const rounded=value=>Number(value.toFixed(6))
const hierarchyVisible=(object,root)=>{
  let current=object
  while(current){
    if(current.visible===false) return false
    if(root&&current===root) return true
    current=current.parent
  }
  return !root
}
const materialsVisible=object=>{
  const materials=Array.isArray(object.material)?object.material:[object.material]
  return materials.filter(Boolean).some(material=>
    material.visible!==false&&(material.opacity??1)>.01
  )
}

const getCameraFrustum=camera=>{
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),
  )
}

export const getRenderedWorldVisibility=(worlds,weights,camera)=>{
  const frustum=getCameraFrustum(camera)
  return Object.fromEntries(Object.entries(worlds).map(([name,world])=>{
    if(world.visible===false||!(weights[name]>.01)) return[name,false]
    world.updateMatrixWorld(true)
    let rendered=false
    world.traverse(object=>{
      if(
        rendered||
        !object.isMesh||
        !hierarchyVisible(object,world)||
        !materialsVisible(object)
      ) return
      if(frustum.intersectsObject(object)) rendered=true
    })
    return[name,rendered]
  }))
}

export const getRenderedTransportMembers=(transport,weight,camera)=>{
  if(!transport||!(weight>.01)||!camera||!hierarchyVisible(transport)) return[]
  transport.updateWorldMatrix(true,true)
  const frustum=getCameraFrustum(camera)
  return(transport.userData?.members||[]).filter(member=>{
    if(!hierarchyVisible(member)) return false
    let rendered=false
    member.traverse(object=>{
      if(
        rendered||
        !object.isMesh||
        !hierarchyVisible(object)||
        !materialsVisible(object)
      ) return
      if(frustum.intersectsObject(object)) rendered=true
    })
    return rendered
  })
}

export const getProjectedObjectBounds=(object,camera)=>{
  if(!object||!camera||!hierarchyVisible(object)){
    return{
      rendered:false,
      fullyFramed:false,
      coverage:0,
      ndcBounds:null,
    }
  }
  object.updateWorldMatrix(true,true)
  const bounds=new THREE.Box3()
  const meshBounds=new THREE.Box3()
  object.traverse(candidate=>{
    if(
      !candidate.isMesh||
      !hierarchyVisible(candidate,object)||
      !materialsVisible(candidate)||
      !candidate.geometry
    ) return
    if(!candidate.geometry.boundingBox) candidate.geometry.computeBoundingBox()
    const geometryBounds=candidate.geometry.boundingBox
    if(geometryBounds&&!geometryBounds.isEmpty()){
      meshBounds.copy(geometryBounds).applyMatrix4(candidate.matrixWorld)
      bounds.union(meshBounds)
    }
  })
  if(bounds.isEmpty()){
    return{
      rendered:false,
      fullyFramed:false,
      coverage:0,
      ndcBounds:null,
    }
  }
  const frustum=getCameraFrustum(camera)
  const minimum=new THREE.Vector3(Infinity,Infinity,Infinity)
  const maximum=new THREE.Vector3(-Infinity,-Infinity,-Infinity)
  const corner=new THREE.Vector3()
  for(const x of [bounds.min.x,bounds.max.x]){
    for(const y of [bounds.min.y,bounds.max.y]){
      for(const z of [bounds.min.z,bounds.max.z]){
        corner.set(x,y,z).project(camera)
        minimum.min(corner)
        maximum.max(corner)
      }
    }
  }
  const left=THREE.MathUtils.clamp((minimum.x+1)/2,0,1)
  const right=THREE.MathUtils.clamp((maximum.x+1)/2,0,1)
  const top=THREE.MathUtils.clamp((1-maximum.y)/2,0,1)
  const bottom=THREE.MathUtils.clamp((1-minimum.y)/2,0,1)
  const rendered=frustum.intersectsBox(bounds)
  const fullyFramed=rendered&&
    minimum.x>=-1&&maximum.x<=1&&
    minimum.y>=-1&&maximum.y<=1&&
    minimum.z>=-1&&maximum.z<=1
  return{
    rendered,
    fullyFramed,
    coverage:rounded(Math.max(0,right-left)*Math.max(0,bottom-top)),
    ndcBounds:{
      min:minimum.toArray().map(rounded),
      max:maximum.toArray().map(rounded),
    },
  }
}

export const createCameraJumpTracker=()=>{
  const previousCamera=new THREE.Vector3()
  const previousTarget=new THREE.Vector3()
  let initialized=false
  let maximum=0
  return{
    observe(camera,target){
      if(initialized){
        maximum=Math.max(
          maximum,
          previousCamera.distanceTo(camera),
          previousTarget.distanceTo(target),
        )
      }
      previousCamera.copy(camera)
      previousTarget.copy(target)
      initialized=true
    },
    reset(camera,target){
      previousCamera.copy(camera)
      previousTarget.copy(target)
      initialized=true
      maximum=0
    },
    value:()=>rounded(maximum),
  }
}

const MOBILE_FRAMING={
  trekker:{camera:[7,12,15],targetY:-.2},
  boat:{camera:[2.4,1.5,5.5],targetY:.5},
  jeep:{camera:[.4,1.7,5.7],targetY:.9},
}

export const getMobileTransportCamera=(transport,[x,y,z])=>{
  const framing=MOBILE_FRAMING[transport]||MOBILE_FRAMING.trekker
  return{
    camera:[
      rounded(x+framing.camera[0]),
      rounded(y+framing.camera[1]),
      rounded(z+framing.camera[2]),
    ],
    target:[x,rounded(y+framing.targetY),z],
  }
}

const MOBILE_OPENING_FRAME=Object.freeze({
  camera:Object.freeze([3.5,5.1,67]),
  target:Object.freeze([-2.5,1.55,34.8]),
})

const lerpFrame=(from,to,weight)=>({
  camera:from.camera.map(
    (value,index)=>rounded(THREE.MathUtils.lerp(value,to.camera[index],weight)),
  ),
  target:from.target.map(
    (value,index)=>rounded(THREE.MathUtils.lerp(value,to.target[index],weight)),
  ),
})

export const getResolvedCameraFrame=({
  quality,
  progress,
  state,
  transportPosition,
})=>{
  const desktop={
    camera:[...state.cameraPosition],
    target:[...state.cameraTarget],
  }
  if(quality!=='mobile') return desktop
  const transport=getMobileTransportCamera(
    state.expedition.activeTransport,
    transportPosition,
  )
  if(state.expedition.activeTransport!=='trekker'||progress>=.12){
    return transport
  }
  return lerpFrame(
    MOBILE_OPENING_FRAME,
    transport,
    smootherstep(.045,.12,progress),
  )
}

export const getTransportWorldPosition=(name,transport,target=new THREE.Vector3())=>{
  const members=name==='trekker'?transport?.userData?.members:null
  if(!members?.length) return transport.getWorldPosition(target)
  transport.updateWorldMatrix(true,true)
  const memberPosition=new THREE.Vector3()
  target.set(0,0,0)
  members.forEach(member=>target.add(member.getWorldPosition(memberPosition)))
  return target.multiplyScalar(1/members.length)
}

const ATMOSPHERE={
  mountain:{
    background:'#9bbab3',
    fogNear:24,
    fogFar:158,
    exposure:1.14,
    hemisphereIntensity:2.35,
    directionalColor:'#ffe0a8',
  },
  water:{
    background:'#79b7c4',
    fogNear:30,
    fogFar:184,
    exposure:1.2,
    hemisphereIntensity:2.55,
    directionalColor:'#ffd19a',
  },
  forest:{
    background:'#526f60',
    fogNear:19,
    fogFar:136,
    exposure:1.08,
    hemisphereIntensity:1.95,
    directionalColor:'#e8ca82',
  },
}

const weightedColor=(weights,key)=>{
  const color=new THREE.Color(0,0,0)
  Object.entries(weights).forEach(([biome,weight])=>{
    const contribution=new THREE.Color(ATMOSPHERE[biome][key]).multiplyScalar(weight)
    color.add(contribution)
  })
  return color
}

const weightedNumber=(weights,key)=>Object.entries(weights).reduce(
  (total,[biome,weight])=>total+ATMOSPHERE[biome][key]*weight,
  0,
)

export const getAtmosphere=weights=>({
  background:weightedColor(weights,'background'),
  fogNear:weightedNumber(weights,'fogNear'),
  fogFar:weightedNumber(weights,'fogFar'),
  exposure:weightedNumber(weights,'exposure'),
  hemisphereIntensity:weightedNumber(weights,'hemisphereIntensity'),
  directionalColor:weightedColor(weights,'directionalColor'),
})

const nextBiomeForPhase=phase=>{
  if(phase==='mountain-trek'||phase==='trek-to-boat') return'water'
  if(phase==='water-boat'||phase==='boat-to-jeep') return'forest'
  return null
}

export const getJourneyQASnapshot=({
  state,
  transition,
  renderedWorlds,
  transports,
  scenery,
  camera,
  cameraJump,
  consoleFailures=[],
  audioControls=0,
})=>{
  const activeTransport=state?.expedition?.activeTransport
  const members=getRenderedTransportMembers(
    transports?.[activeTransport],
    transition.transports[activeTransport],
    camera,
  )
  const coach=scenery?.coach
  const coachProjection=getProjectedObjectBounds(coach,camera)
  const fullyFramedMembers=members.filter(member=>
    getProjectedObjectBounds(member,camera).fullyFramed
  )
  coach?.updateWorldMatrix(true,true)
  const activeBiome=Object.entries(transition.worlds)
    .reduce((active,[name,weight])=>weight>active.weight?{name,weight}:active,{name:null,weight:-1})
    .name
  const nextBiomeName=nextBiomeForPhase(state?.expedition?.phase)
  return{
    phase:state.expedition.phase,
    activeBiome,
    activeTransport,
    biomeWeights:{...transition.worlds},
    transportWeights:{...transition.transports},
    visibleMembers:{
      guides:members.filter(member=>(member.role||member.userData?.role)==='guide').length,
      tourists:members.filter(member=>(member.role||member.userData?.role)==='tourist').length,
    },
    opening:{
      departureWeight:transition.opening?.departureWeight??1,
      coach:{
        mounted:Boolean(coach?.parent),
        rendered:coachProjection.rendered,
        fullyFramed:coachProjection.fullyFramed,
        worldMatrix:coach
          ?coach.matrixWorld.elements.map(rounded)
          :[],
      },
      fullyFramedMembers:{
        guides:fullyFramedMembers.filter(
          member=>(member.role||member.userData?.role)==='guide'
        ).length,
        tourists:fullyFramedMembers.filter(
          member=>(member.role||member.userData?.role)==='tourist'
        ).length,
      },
    },
    distantVisibility:{
      nextBiome:nextBiomeName?renderedWorlds[nextBiomeName]===true:null,
      nextBiomeName,
      ...renderedWorlds,
    },
    cameraJump:rounded(cameraJump),
    consoleFailures:[...consoleFailures],
    audioControls,
  }
}

const getProjectedVisualDebug=(scene,camera,cameraTarget,desiredCamera,desiredTarget)=>{
  scene.updateMatrixWorld(true)
  camera.updateMatrixWorld(true)
  const candidates=[]
  const corner=new THREE.Vector3()
  scene.traverse(object=>{
    if(
      object.visible===false||
      !object.name||
      !/^(jungle-tree-|crown-silhouette-|mist-veil|jungle-mist|jungle-sun-shafts|hill-mist-pocket|tour-coach|trailhead-)/.test(object.name)
    ) return
    const bounds=new THREE.Box3().setFromObject(object)
    if(bounds.isEmpty()) return
    const minimum=new THREE.Vector2(Infinity,Infinity)
    const maximum=new THREE.Vector2(-Infinity,-Infinity)
    for(const x of [bounds.min.x,bounds.max.x]){
      for(const y of [bounds.min.y,bounds.max.y]){
        for(const z of [bounds.min.z,bounds.max.z]){
          corner.set(x,y,z).project(camera)
          if(!Number.isFinite(corner.x)||!Number.isFinite(corner.y)) continue
          minimum.min(corner)
          maximum.max(corner)
        }
      }
    }
    const left=THREE.MathUtils.clamp((minimum.x+1)/2,0,1)
    const right=THREE.MathUtils.clamp((maximum.x+1)/2,0,1)
    const top=THREE.MathUtils.clamp((1-maximum.y)/2,0,1)
    const bottom=THREE.MathUtils.clamp((1-minimum.y)/2,0,1)
    const center=bounds.getCenter(new THREE.Vector3())
    candidates.push({
      name:object.name,
      coverage:rounded(Math.max(0,right-left)*Math.max(0,bottom-top)),
      distance:rounded(center.distanceTo(camera.position)),
      containsCamera:bounds.containsPoint(camera.position),
      center:center.toArray().map(rounded),
    })
  })
  candidates.sort((a,b)=>
    Number(b.containsCamera)-Number(a.containsCamera)||
    b.coverage-a.coverage||
    a.distance-b.distance
  )
  return{
    camera:camera.position.toArray().map(rounded),
    cameraTarget:cameraTarget.toArray().map(rounded),
    desiredCamera:desiredCamera.toArray().map(rounded),
    desiredTarget:desiredTarget.toArray().map(rounded),
    topObjects:candidates.slice(0,16),
  }
}

export function createIndiaJourney(
  canvas,
  {reducedMotion=false,onContextLost=()=>{},onReady=()=>{}}={},
){
  const rendererProfile=getRendererProfile(
    window.innerWidth,
    window.devicePixelRatio,
  )
  const quality=rendererProfile.quality
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(quality==='mobile'?60:48,1,.1,420)
  const renderer=new THREE.WebGLRenderer({
    canvas,
    antialias:rendererProfile.antialias,
    alpha:false,
    powerPreference:'high-performance',
  })
  renderer.setPixelRatio(rendererProfile.pixelRatio)
  renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled=quality==='desktop'
  renderer.shadowMap.type=THREE.PCFSoftShadowMap

  const initialState=getJourneyState(0)
  const materials=createMaterials()
  const expedition=createExpeditionController(scene,materials,quality)
  const initialTransition=expedition.update(initialState.expedition,0,reducedMotion)
  const initialAtmosphere=getAtmosphere(initialTransition.worlds)
  scene.background=initialAtmosphere.background.clone()
  scene.fog=new THREE.Fog(
    initialAtmosphere.background,
    initialAtmosphere.fogNear,
    initialAtmosphere.fogFar,
  )
  renderer.toneMappingExposure=initialAtmosphere.exposure

  const hemisphere=new THREE.HemisphereLight('#ffe0b4','#263b37',initialAtmosphere.hemisphereIntensity)
  const sun=new THREE.DirectionalLight(initialAtmosphere.directionalColor,3.25)
  sun.position.set(-15,18,12)
  sun.castShadow=quality==='desktop'
  scene.add(hemisphere,sun)

  const initialTransport=expedition.transports[initialState.expedition.activeTransport]
  const initialTransportPosition=getTransportWorldPosition(
    initialState.expedition.activeTransport,
    initialTransport,
  ).toArray()
  const initialFrame=getResolvedCameraFrame({
    quality,
    progress:0,
    state:initialState,
    transportPosition:initialTransportPosition,
  })
  const cameraTarget=new THREE.Vector3(...initialFrame.target)
  camera.position.set(...initialFrame.camera)
  camera.lookAt(cameraTarget)
  const cameraJumpTracker=createCameraJumpTracker()
  cameraJumpTracker.reset(camera.position,cameraTarget)

  const resize=()=>{
    const parent=canvas.parentElement
    if(!parent) return
    renderer.setSize(parent.clientWidth,parent.clientHeight,false)
    camera.aspect=parent.clientWidth/Math.max(1,parent.clientHeight)
    camera.updateProjectionMatrix()
  }
  const adaptivePixelRatio=quality==='mobile'
    ?createAdaptivePixelRatioController(rendererProfile.pixelRatio)
    :null
  const resizeObserver=new ResizeObserver(resize)
  if(canvas.parentElement) resizeObserver.observe(canvas.parentElement)
  resize()
  renderer.compile(scene,camera)

  const clock=new THREE.Clock()
  const desiredCamera=new THREE.Vector3()
  const desiredTarget=new THREE.Vector3()
  const atmosphereColor=new THREE.Color()
  const directionalColor=new THREE.Color()
  let progress=0
  let latestState=initialState
  let latestTransition=initialTransition
  let pointer={x:0,y:0}
  let frame
  let paused=false
  let lost=false
  let disposed=false
  let ready=false

  const animate=()=>{
    if(paused||lost||disposed) return
    const delta=clock.getDelta()
    const elapsed=clock.elapsedTime
    const state=getJourneyState(progress)
    const transition=expedition.update(state.expedition,elapsed,reducedMotion)
    const damping=getCameraDampingFactor(delta,quality)
    const transport=expedition.transports[state.expedition.activeTransport]
    const transportPosition=getTransportWorldPosition(
      state.expedition.activeTransport,
      transport,
    ).toArray()
    const resolvedFrame=getResolvedCameraFrame({
      quality,
      progress,
      state,
      transportPosition,
    })
    desiredCamera.set(...resolvedFrame.camera)
    desiredTarget.set(...resolvedFrame.target)
    if(!reducedMotion){
      desiredCamera.x+=pointer.x*.45
      desiredCamera.y-=pointer.y*.25
    }

    const maximumCameraStep=.78
    dampCameraVector(camera.position,desiredCamera,damping,maximumCameraStep)
    dampCameraVector(cameraTarget,desiredTarget,damping,maximumCameraStep)
    camera.lookAt(cameraTarget)
    cameraJumpTracker.observe(camera.position,cameraTarget)
    latestState=state
    latestTransition=transition

    const atmosphere=getAtmosphere(transition.worlds)
    atmosphereColor.copy(atmosphere.background)
    scene.background.lerp(atmosphereColor,damping)
    scene.fog.color.copy(scene.background)
    scene.fog.near=THREE.MathUtils.lerp(scene.fog.near,atmosphere.fogNear,damping)
    scene.fog.far=THREE.MathUtils.lerp(scene.fog.far,atmosphere.fogFar,damping)
    renderer.toneMappingExposure=THREE.MathUtils.lerp(
      renderer.toneMappingExposure,
      atmosphere.exposure,
      damping,
    )
    hemisphere.intensity=THREE.MathUtils.lerp(
      hemisphere.intensity,
      atmosphere.hemisphereIntensity,
      damping,
    )
    directionalColor.copy(atmosphere.directionalColor)
    sun.color.lerp(directionalColor,damping)

    renderer.render(scene,camera)
    applyAdaptivePixelRatio(adaptivePixelRatio,delta,renderer,resize)
    if(!ready){
      ready=true
      onReady()
    }
    frame=requestAnimationFrame(animate)
  }

  const onLost=event=>{
    event.preventDefault()
    lost=true
    cancelAnimationFrame(frame)
    onContextLost()
  }
  canvas.addEventListener('webglcontextlost',onLost)
  animate()

  return{
    setProgress:value=>{progress=clamp01(value)},
    setPointer:(x,y)=>{pointer={x,y}},
    setReducedMotion:value=>{reducedMotion=value},
    getQASnapshot:extras=>({
      ...getJourneyQASnapshot({
        state:latestState,
        transition:latestTransition,
        renderedWorlds:getRenderedWorldVisibility(
          expedition.worlds,
          latestTransition.worlds,
          camera,
        ),
        transports:expedition.transports,
        scenery:expedition.scenery,
        camera,
        cameraJump:cameraJumpTracker.value(),
        ...extras,
      }),
      visualDebug:getProjectedVisualDebug(
        scene,
        camera,
        cameraTarget,
        desiredCamera,
        desiredTarget,
      ),
    }),
    resetQAMetrics:()=>cameraJumpTracker.reset(camera.position,cameraTarget),
    pause:()=>{
      paused=true
      cancelAnimationFrame(frame)
    },
    resume:()=>{
      if(!paused||lost||disposed) return
      paused=false
      clock.getDelta()
      animate()
    },
    dispose:()=>{
      if(disposed) return
      disposed=true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost',onLost)
      expedition.dispose()
      disposeObject3D(scene)
      Object.values(materials).forEach(material=>material.dispose())
      renderer.dispose()
    },
  }
}
