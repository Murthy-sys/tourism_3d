import * as THREE from 'three'
import { createExpeditionController } from './expeditionController'
import { clamp01,getJourneyState } from './journeyData'
import { createMaterials,disposeObject3D } from './primitives'
import { smootherstep } from './terrain'
import { createArrivalController,createArrivalClouds,getArrivalCameraFrame } from './arrival'
import { createDaylight } from './daylight'
import { FINALE_CAMERAS,FOREST_DRIVE_END,getFinaleProgress } from './finaleConfig'
import { readRuntimeProfile } from './runtimeProfile'
import { getCityCameraFrame,TREK_DEPARTURE,TREK_ENTRY } from './cityJourney'
import { journeyProgressToScroll,scrollToJourneyProgress } from '../journey/scrollTimeline'
import { beginNaturalWaterFrame } from './naturalWater'
import { captureSceneTransforms,prepareJourneyScene,restoreSceneTransforms } from './scenePreparation'

export const getRenderQuality=width=>width<768?'mobile':'desktop'
export const getRendererProfile=(width,devicePixelRatio=1,runtimeProfile)=>{
  const quality=runtimeProfile?.quality||getRenderQuality(width)
  const numericRatio=Number(devicePixelRatio)
  const ratio=Number.isFinite(numericRatio)&&numericRatio>0?numericRatio:1
  return{
    quality,
    antialias:true,
    pixelRatio:runtimeProfile?.constrainedDevice?Math.min(ratio,1.25):quality==='mobile'
      ?THREE.MathUtils.clamp(ratio,1.25,1.75)
      :Math.min(ratio,2),
  }
}
const MOBILE_PIXEL_RATIOS=[1.25,1.5,1.75]
const MAX_MEASURABLE_FRAME_MS=250

export const createJourneyProgressController=({
  quality='desktop',
  reducedMotion=false,
  initial=0,
}={})=>{
  const response=quality==='mobile'?4:5
  const velocity=quality==='mobile'?.18:.22
  let current=clamp01(initial)
  let target=current
  let motionReduced=Boolean(reducedMotion)
  let seeking=false
  let pace=0
  let manualOrigin=journeyProgressToScroll(current)
  let manualElapsed=0
  const manualDuration=.22
  const snap=()=>{current=target;seeking=false;pace=0;manualElapsed=manualDuration}
  return{
    setTarget(value,options){
      const next=clamp01(value)
      // Repeated React updates must not restart the follow or erase navigation
      // intent. Native scroll distance already sets the journey's slow pace.
      if(Math.abs(next-target)>1e-8||options?.navigation===true){
        seeking=options?.navigation===true
        if(!seeking){
          manualOrigin=journeyProgressToScroll(current)
          manualElapsed=0
          pace=0
        }
      }
      target=next
      if(motionReduced) snap()
    },
    setReducedMotion(value){
      motionReduced=Boolean(value)
      if(motionReduced) snap()
    },
    advance(deltaSeconds){
      if(motionReduced){
        snap()
        return current
      }
      if(
        !Number.isFinite(deltaSeconds)||
        deltaSeconds<0||
        deltaSeconds>.25
      ) return current
      const gap=target-current
      if(Math.abs(gap)<.00001){
        snap()
        return current
      }
      if(!seeking){
        // Finish a wheel/touch follow promptly after the last input. Limiting
        // route velocity here queued seconds of travel after scrolling stopped.
        manualElapsed=Math.min(manualDuration,manualElapsed+deltaSeconds)
        const time=manualElapsed/manualDuration
        const blend=1-(1-time)**3
        current=scrollToJourneyProgress(THREE.MathUtils.lerp(
          manualOrigin,journeyProgressToScroll(target),blend,
        ))
        if(manualElapsed>=manualDuration) snap()
        return current
      }
      const convergence=1-Math.exp(-deltaSeconds*response)
      // Deliberate chapter navigation retains its continuous paced journey.
      pace=Math.min(velocity,pace+.35*deltaSeconds)
      const maximumStep=pace*deltaSeconds
      const step=Math.sign(gap)*Math.min(
        Math.abs(gap)*convergence,
        maximumStep,
        Math.abs(gap),
      )
      current=clamp01(current+step)
      if(Math.abs(target-current)<.00001) snap()
      return current
    },
    value:()=>current,
    target:()=>target,
  }
}

export const advanceJourneyFrame=(controller,delta)=>controller.advance(delta)

// A busy foreground frame must still advance the intro and quality controller.
// Visibility changes reset the clock; multi-second gaps remain suspended time.
export const getActiveFrameDelta=delta=>
  Number.isFinite(delta)&&delta>=0&&delta<2?Math.min(delta,.24):delta

// A missed frame must not teleport the subject or camera to catch up with
// elapsed wall time. Quality adaptation still receives the measured delta.
export const getMotionFrameDelta=delta=>
  Number.isFinite(delta)&&delta>=0&&delta<2?Math.min(delta,.05):0

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
    fastFrameMs=Math.min(18.5,slowFrameMs*.85),
    recoveryMs=sampleFrames===undefined?3000:0,
    pixelRatios=MOBILE_PIXEL_RATIOS,
  }=options
  const timedWarmup=warmupFrames===undefined
  const timedSample=sampleFrames===undefined
  const timedCooldown=cooldownFrames===undefined
  let ratio=THREE.MathUtils.clamp(
    initialPixelRatio,
    pixelRatios[0],
    pixelRatios.at(-1),
  )
  const ceiling=ratio
  let warmup=Math.max(0,timedWarmup?warmupMs:warmupFrames)
  let cooldown=0
  let samples=[]
  let sampledMs=0
  let healthyMs=0
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
      const sampleDuration=sampledMs
      samples=[]
      sampledMs=0
      healthyMs=average<=fastFrameMs?healthyMs+sampleDuration:0
      if(average>slowFrameMs&&ratio>pixelRatios[0]){
        ratio=pixelRatios
          .filter(candidate=>candidate<ratio)
          .at(-1)??pixelRatios[0]
        cooldown=Math.max(0,timedCooldown?cooldownMs:cooldownFrames)
        return ratio
      }
      if(average<=fastFrameMs&&healthyMs>=recoveryMs&&ratio<ceiling){
        const nextRatio=pixelRatios
          .find(candidate=>candidate>ratio&&candidate<=ceiling)
        if(nextRatio===undefined) return null
        ratio=nextRatio
        healthyMs=0
        cooldown=Math.max(0,timedCooldown?cooldownMs:cooldownFrames)
        return ratio
      }
      return null
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
  const duration=Number.isFinite(delta)?Math.min(Math.max(delta,0),.5):0
  // Progress already smooths scroll input. A second long camera ease made the
  // view continue drifting after the traveller had reached the scroll position.
  return 1-Math.exp(-duration*(quality==='mobile'?12:14))
}
export const getCameraMaximumStep=delta=>
  Number.isFinite(delta)?Math.min(.78,46.8*Math.max(delta,0)):0
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

const TRANSPORT_FRAMING={
  mobile:{
    trekker:{camera:[6,12,20],targetY:-.2,lookAheadZ:-2},
    boat:{camera:[4,3.5,19.8],targetY:.5,lookAheadZ:-.5},
    jeep:{camera:[4,4,25],targetY:.9,lookAheadZ:-1.5},
  },
  desktop:{
    trekker:{camera:[6,8.5,14.1],targetY:-.2,lookAheadZ:-2.5},
    boat:{camera:[4,3.5,13],targetY:.5,lookAheadZ:-.5},
    jeep:{camera:[3,4,13.5],targetY:.9,lookAheadZ:-2},
  },
}

export const getTransportCamera=(quality,transport,[x,y,z])=>{
  const framing=(TRANSPORT_FRAMING[quality]||TRANSPORT_FRAMING.desktop)[transport]||
    (TRANSPORT_FRAMING[quality]||TRANSPORT_FRAMING.desktop).trekker
  return{
    camera:[
      rounded(x+framing.camera[0]),
      rounded(y+framing.camera[1]),
      rounded(z+framing.camera[2]),
    ],
    target:[rounded(x),rounded(y+framing.targetY),rounded(z+framing.lookAheadZ)],
  }
}

export const getMobileTransportCamera=(transport,position)=>
  getTransportCamera('mobile',transport,position)

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
  transportPositions,
  transportWeights,
})=>{
  if(progress<=TREK_DEPARTURE) return getCityCameraFrame(progress,quality)
  let transportFrame=getTransportCamera(
    quality,
    state.expedition.activeTransport,
    transportPosition,
  )
  const subjects=transportPositions&&transportWeights
    ?Object.entries(transportWeights).filter(([name,weight])=>
      weight>0&&transportPositions[name]
    )
    :[]
  if(subjects.length){
    const total=subjects.reduce((sum,[,weight])=>sum+weight,0)
    transportFrame={camera:[0,0,0],target:[0,0,0]}
    subjects.forEach(([name,weight])=>{
      const frame=getTransportCamera(quality,name,transportPositions[name])
      for(let index=0;index<3;index++){
        transportFrame.camera[index]+=frame.camera[index]*weight/total
        transportFrame.target[index]+=frame.target[index]*weight/total
      }
    })
    transportFrame.camera=transportFrame.camera.map(rounded)
    transportFrame.target=transportFrame.target.map(rounded)
  }
  if(progress>=.875){
    return lerpFrame(transportFrame,FINALE_CAMERAS[quality]||FINALE_CAMERAS.desktop,smootherstep(.875,.955,progress))
  }
  if(state.expedition.activeTransport!=='trekker'||progress>=TREK_ENTRY){
    return transportFrame
  }
  return lerpFrame(
    getCityCameraFrame(TREK_DEPARTURE,quality),
    transportFrame,
    smootherstep(TREK_DEPARTURE,TREK_ENTRY,progress),
  )
}

export const getTransportWorldPosition=(name,transport,target=new THREE.Vector3())=>{
  if(transport?.userData?.cameraAnchor){
    target.copy(transport.userData.cameraAnchor)
    return transport.parent?transport.parent.localToWorld(target):target
  }
  const members=name==='trekker'?transport?.userData?.members:null
  if(!members?.length) return transport.getWorldPosition(target)
  transport.updateWorldMatrix(true,true)
  const memberPosition=new THREE.Vector3()
  target.set(0,0,0)
  members.forEach(member=>{
    if(Number.isFinite(member.userData.cameraGroundY)){
      memberPosition.copy(member.position)
      memberPosition.y=member.userData.cameraGroundY
      member.parent?.localToWorld(memberPosition)
    }else member.getWorldPosition(memberPosition)
    target.add(memberPosition)
  })
  return target.multiplyScalar(1/members.length)
}

const ATMOSPHERE={
  mountain:{
    background:'#b6c8c9',
    fogNear:24,
    fogFar:205,
    exposure:.94,
    hemisphereIntensity:.78,
    directionalColor:'#fff0d7',
  },
  water:{
    background:'#b2c7cb',
    fogNear:30,
    fogFar:240,
    exposure:.96,
    hemisphereIntensity:.8,
    directionalColor:'#fff0db',
  },
  forest:{
    background:'#84968a',
    fogNear:19,
    fogFar:175,
    exposure:.92,
    hemisphereIntensity:.65,
    directionalColor:'#f2e8cf',
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
      city:scenery?.city?.visible??false,
      journey:coach?.userData.cityJourney??null,
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
  {reducedMotion=false,onContextLost=()=>{},onReady=()=>{},onPrepareProgress=()=>{},onPrepareError=()=>{},intro=false,onIntroComplete=()=>{},onFinaleProgress=()=>{},onProgress=()=>{},runtimeProfile=readRuntimeProfile()}={},
){
  const rendererProfile=getRendererProfile(
    window.innerWidth,
    window.devicePixelRatio,
    runtimeProfile,
  )
  const quality=rendererProfile.quality
  let cameraQuality=getRenderQuality(window.innerWidth)
  let rendererReducedMotion=Boolean(reducedMotion)
  const arrival=createArrivalController(intro)
  const progressController=createJourneyProgressController({
    quality,
    reducedMotion:rendererReducedMotion,
    initial:0,
  })
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(cameraQuality==='mobile'?60:48,1,.1,420)
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
  const initialTransition=expedition.update(
    initialState.expedition,
    0,
    rendererReducedMotion,
  )
  const initialAtmosphere=getAtmosphere(initialTransition.worlds)
  scene.background=initialAtmosphere.background.clone()
  scene.fog=new THREE.Fog(
    initialAtmosphere.background,
    initialAtmosphere.fogNear,
    initialAtmosphere.fogFar,
  )
  renderer.toneMappingExposure=initialAtmosphere.exposure

  const daylight=createDaylight(renderer,scene)
  const hemisphere=new THREE.HemisphereLight('#d5e5ed','#464234',initialAtmosphere.hemisphereIntensity)
  const sun=new THREE.DirectionalLight(initialAtmosphere.directionalColor,2.2)
  sun.position.set(-15,18,12)
  sun.castShadow=quality==='desktop'
  sun.shadow.mapSize.set(1536,1536)
  Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:90})
  sun.shadow.normalBias=.04
  sun.shadow.bias=-.00015
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(hemisphere,sun,sun.target)

  const initialTransport=expedition.transports[initialState.expedition.activeTransport]
  const initialTransportPosition=getTransportWorldPosition(
    initialState.expedition.activeTransport,
    initialTransport,
  ).toArray()
  let initialFrame=getResolvedCameraFrame({
    quality:cameraQuality,
    progress:0,
    state:initialState,
    transportPosition:initialTransportPosition,
  })
  const clouds=createArrivalClouds(initialFrame)
  scene.add(clouds.group)
  const startingFrame=intro?getArrivalCameraFrame(initialFrame,0):initialFrame
  const cameraTarget=new THREE.Vector3(...startingFrame.target)
  camera.position.set(...startingFrame.camera)
  camera.lookAt(cameraTarget)
  const cameraJumpTracker=createCameraJumpTracker()
  cameraJumpTracker.reset(camera.position,cameraTarget)

  const resize=()=>{
    const parent=canvas.parentElement
    if(!parent) return
    // Geometry can keep its startup budget; composition must follow the live viewport.
    cameraQuality=getRenderQuality(parent.clientWidth)
    camera.fov=cameraQuality==='mobile'?60:48
    initialFrame=getResolvedCameraFrame({
      quality:cameraQuality,
      progress:0,
      state:initialState,
      transportPosition:initialTransportPosition,
    })
    renderer.setSize(parent.clientWidth,parent.clientHeight,false)
    camera.aspect=parent.clientWidth/Math.max(1,parent.clientHeight)
    camera.updateProjectionMatrix()
  }
  const adaptivePixelRatio=createAdaptivePixelRatioController(rendererProfile.pixelRatio,{
    pixelRatios:quality==='mobile'?[1,1.25,1.5,1.75]:[.75,1,1.25,1.5,1.75,2],
  })
  const resizeObserver=new ResizeObserver(()=>{resize();wake()})
  if(canvas.parentElement) resizeObserver.observe(canvas.parentElement)
  resize()

  const clock=new THREE.Clock()
  const desiredCamera=new THREE.Vector3(...startingFrame.camera)
  const desiredTarget=new THREE.Vector3(...startingFrame.target)
  const atmosphereColor=new THREE.Color()
  const directionalColor=new THREE.Color()
  const sunOffset=new THREE.Vector3(-18,28,16)
  let latestState=initialState
  let latestTransition=initialTransition
  let pointer={x:0,y:0}
  let frame
  let paused=false
  let lost=false
  let disposed=false
  let ready=false
  let prepared=false
  let preparationProgress=0
  const preparationAbort=new AbortController()
  let skipArrivalFrame=false
  let elapsed=0
  let lastFinaleProgress=0
  let finaleNotifyElapsed=0
  let progressNotifyElapsed=0
  let lastNotifiedProgress=-1

  const resolveSceneFrame=(state,transition,progress)=>{
    const transport=expedition.transports[state.expedition.activeTransport]
    const transportPosition=getTransportWorldPosition(state.expedition.activeTransport,transport).toArray()
    const transportPositions={[state.expedition.activeTransport]:transportPosition}
    Object.entries(transition.transports).forEach(([name,weight])=>{
      if(weight>0&&!transportPositions[name]){
        transportPositions[name]=getTransportWorldPosition(name,expedition.transports[name]).toArray()
      }
    })
    return getResolvedCameraFrame({
      quality:cameraQuality,progress,state,transportPosition,transportPositions,
      transportWeights:transition.transports,
    })
  }

  const animate=()=>{
    frame=0
    if(!prepared||paused||lost||disposed) return
    const measuredDelta=getActiveFrameDelta(clock.getDelta())
    const delta=getMotionFrameDelta(measuredDelta)
    const arrived=arrival.advance(delta,rendererReducedMotion)
    const arriving=arrival.phase()!=='complete'
    const skippedArrival=skipArrivalFrame
    if(!arriving&&Number.isFinite(delta)&&delta<.25) elapsed+=delta
    const renderedProgress=advanceJourneyFrame(progressController,delta)
    const state=getJourneyState(renderedProgress)
    const transition=expedition.update(
      state.expedition,
      elapsed,
      rendererReducedMotion||arriving,
      delta,
    )
    const damping=getCameraDampingFactor(delta,cameraQuality)
    const resolvedFrame=resolveSceneFrame(state,transition,renderedProgress)
    desiredCamera.set(...resolvedFrame.camera)
    desiredTarget.set(...resolvedFrame.target)
    if(!rendererReducedMotion&&!arriving&&!arrived){
      desiredCamera.x+=pointer.x*.45
      desiredCamera.y-=pointer.y*.25
    }

    if(arriving||arrived){
      const arrivalFrame=getArrivalCameraFrame(initialFrame,arrival.progress())
      desiredCamera.set(...arrivalFrame.camera)
      desiredTarget.set(...arrivalFrame.target)
      camera.position.copy(desiredCamera)
      cameraTarget.copy(desiredTarget)
    }else if(rendererReducedMotion||skipArrivalFrame){
      camera.position.copy(desiredCamera)
      cameraTarget.copy(desiredTarget)
      skipArrivalFrame=false
    }else{
      const maximumCameraStep=getCameraMaximumStep(delta)
      dampCameraVector(camera.position,desiredCamera,damping,maximumCameraStep)
      dampCameraVector(cameraTarget,desiredTarget,damping,maximumCameraStep)
    }
    camera.lookAt(cameraTarget)
    if(arriving||arrived||skippedArrival||rendererReducedMotion) cameraJumpTracker.reset(camera.position,cameraTarget)
    else cameraJumpTracker.observe(camera.position,cameraTarget)
    latestState=state
    latestTransition=transition
    progressNotifyElapsed+=Number.isFinite(delta)?Math.min(delta,.08):0
    if(progressNotifyElapsed>=.05||rendererReducedMotion||arrived){
      const visibleProgress=Math.round(renderedProgress*10000)/10000
      if(visibleProgress!==lastNotifiedProgress){
        onProgress(visibleProgress)
        lastNotifiedProgress=visibleProgress
      }
      progressNotifyElapsed=0
    }
    finaleNotifyElapsed+=Number.isFinite(delta)?Math.min(delta,.08):0
    if((renderedProgress>=FOREST_DRIVE_END||lastFinaleProgress>=FOREST_DRIVE_END)&&
      (finaleNotifyElapsed>=.08||rendererReducedMotion||renderedProgress===1)){
      // A jump from another chapter can outrun the damped camera. Keep the
      // ending copy out of earlier scenery until the viewpoint has caught up.
      const cameraSettled=camera.position.distanceToSquared(desiredCamera)<1&&cameraTarget.distanceToSquared(desiredTarget)<1
      const copyProgress=renderedProgress>=.955&&!cameraSettled ? .955 : renderedProgress
      const nextFinaleProgress=copyProgress>=FOREST_DRIVE_END?Math.round(copyProgress*1000)/1000:0
      if(nextFinaleProgress!==lastFinaleProgress){
        lastFinaleProgress=nextFinaleProgress
        onFinaleProgress(nextFinaleProgress)
      }
      finaleNotifyElapsed=0
    }

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
    // Keep contact shadows near the subject as the journey moves across the world.
    sun.target.position.copy(desiredTarget)
    sun.position.copy(desiredTarget).add(sunOffset)
    if(arriving){
      const reveal=smootherstep(.12,.72,arrival.progress())
      scene.fog.near=THREE.MathUtils.lerp(8,atmosphere.fogNear,reveal)
      scene.fog.far=THREE.MathUtils.lerp(90,atmosphere.fogFar,reveal)
    }else if(arrived||skippedArrival){
      scene.fog.near=atmosphere.fogNear
      scene.fog.far=atmosphere.fogFar
    }
    clouds.update(arrival.progress(),initialFrame)
    daylight.update(camera)

    beginNaturalWaterFrame(renderer,{reducedMotion:rendererReducedMotion,constrainedDevice:runtimeProfile.constrainedDevice})
    renderer.render(scene,camera)
    applyAdaptivePixelRatio(adaptivePixelRatio,measuredDelta,renderer,resize)
    if(!ready){
      ready=true
      onReady()
    }
    if(arrived) onIntroComplete()
    // The opaque start gate and a settled reduced-motion view need one frame,
    // not a continuous GPU loop. Input wakes the same animation owner.
    if(arrival.phase()==='playing'||(arrival.phase()==='complete'&&!rendererReducedMotion)){
      frame=requestAnimationFrame(animate)
    }
  }

  const wake=()=>{
    if(!prepared||frame||paused||lost||disposed) return
    clock.getDelta()
    frame=requestAnimationFrame(animate)
  }

  const onLost=event=>{
    event.preventDefault()
    lost=true
    cancelAnimationFrame(frame)
    preparationAbort.abort()
    if(prepared) onContextLost()
    else onPrepareError(new Error('The graphics context was interrupted while preparing the journey.'))
  }
  canvas.addEventListener('webglcontextlost',onLost)

  const initialTransforms=captureSceneTransforms(scene)
  const restoreInitialScene=()=>{
    if(disposed||lost) return
    resize()
    // Warmup route jumps must not leave a reversing vehicle or a spun wheel in
    // the first real journey frame. Rebuild motion history from the true start.
    Object.values(expedition.transports).forEach(transport=>{
      delete transport.userData.travelMotion
      if('lastProgress' in transport.userData) transport.userData.lastProgress=0
    })
    latestState=initialState
    latestTransition=expedition.update(initialState.expedition,0,true,0)
    restoreSceneTransforms(initialTransforms)
    scene.background.copy(initialAtmosphere.background)
    scene.fog.color.copy(initialAtmosphere.background)
    scene.fog.near=initialAtmosphere.fogNear
    scene.fog.far=initialAtmosphere.fogFar
    renderer.toneMappingExposure=initialAtmosphere.exposure
    hemisphere.intensity=initialAtmosphere.hemisphereIntensity
    sun.color.copy(initialAtmosphere.directionalColor)
    const restored=arrival.phase()==='complete'?initialFrame:getArrivalCameraFrame(initialFrame,arrival.progress())
    desiredCamera.set(...restored.camera)
    desiredTarget.set(...restored.target)
    camera.position.copy(desiredCamera)
    cameraTarget.copy(desiredTarget)
    camera.lookAt(cameraTarget)
    clouds.update(arrival.progress(),initialFrame)
    daylight.update(camera)
    cameraJumpTracker.reset(camera.position,cameraTarget)
    scene.updateMatrixWorld(true)
  }
  const preparation=prepareJourneyScene({
    renderer,scene,camera,canvas,signal:preparationAbort.signal,
    onProgress:value=>{
      preparationProgress=value
      if(!disposed&&!lost) onPrepareProgress(value)
    },
    applyStage:({progress,arrivalProgress})=>{
      const state=getJourneyState(progress)
      const transition=expedition.update(state.expedition,0,true,0)
      const view=arrivalProgress===undefined?resolveSceneFrame(state,transition,progress)
        :getArrivalCameraFrame(initialFrame,arrivalProgress)
      camera.position.set(...view.camera)
      cameraTarget.set(...view.target)
      camera.lookAt(cameraTarget)
      const atmosphere=getAtmosphere(transition.worlds)
      scene.background.copy(atmosphere.background)
      scene.fog.color.copy(atmosphere.background)
      scene.fog.near=atmosphere.fogNear
      scene.fog.far=atmosphere.fogFar
      renderer.toneMappingExposure=atmosphere.exposure
      hemisphere.intensity=atmosphere.hemisphereIntensity
      sun.color.copy(atmosphere.directionalColor)
      sun.target.position.copy(cameraTarget)
      sun.position.copy(cameraTarget).add(sunOffset)
      clouds.update(arrivalProgress??1,initialFrame)
      daylight.update(camera)
      beginNaturalWaterFrame(renderer,{reducedMotion:true,constrainedDevice:runtimeProfile.constrainedDevice})
    },
    restore:restoreInitialScene,
  }).then(()=>{
    initialTransforms.clear()
    if(disposed||lost) return
    prepared=true
    clock.start()
    animate()
  }).catch(error=>{
    initialTransforms.clear()
    if(disposed||lost||error?.name==='AbortError') return
    onPrepareError(error)
  })

  return{
    setProgress:(value,options)=>{
      progressController.setTarget(arrival.phase()==='complete'?value:0,options)
      wake()
    },
    setIntroPhase:phase=>{
      if(phase==='complete'&&arrival.phase()!=='complete') skipArrivalFrame=true
      arrival.setPhase(phase)
      wake()
    },
    setPointer:(x,y)=>{pointer={x,y}},
    setReducedMotion:value=>{
      rendererReducedMotion=Boolean(value)
      progressController.setReducedMotion(rendererReducedMotion)
      wake()
    },
    getQASnapshot:extras=>({
      preparation:{ready,progress:rounded(preparationProgress)},
      arrival:{phase:arrival.phase(),progress:rounded(arrival.progress())},
      finale:{progress:rounded(getFinaleProgress(progressController.value())),stages:expedition.finale.group.userData.stages,members:expedition.finale.members.map(member=>({role:member.role,position:member.getWorldPosition(new THREE.Vector3()).toArray().map(rounded),heading:member.rotation.y}))},
      progress:{rendered:rounded(progressController.value()),target:rounded(progressController.target())},
      wildlife:expedition.worlds.forest.userData.wildlife.group.userData.animals.map(animal=>({
        kind:animal.kind,visible:animal.root.visible,
        position:animal.root.position.toArray().map(rounded),
        heading:rounded(animal.root.rotation.y),speed:rounded(animal.motion.speed*animal.scale),
        feet:animal.hoofPositions.map(foot=>foot.toArray().map(rounded)),
      })),
      vehicleMotion:Object.fromEntries(['boat','jeep'].map(name=>{
        const vehicle=expedition.transports[name]
        const motion=vehicle.userData.travelMotion
        return[name,{direction:motion?.direction||1,heading:rounded(vehicle.rotation.y),
          moving:motion?.moving||false,turning:motion?.turning||false,
          position:vehicle.position.toArray().map(rounded),
          nose:[rounded(-Math.sin(vehicle.rotation.y)),0,rounded(-Math.cos(vehicle.rotation.y))]}]
      })),
      renderer:{quality,cameraQuality,reducedMotion:rendererReducedMotion,compactAssets:runtimeProfile.compactAssets,fov:camera.fov,pixelRatio:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles},
      destinations:{
        boat:getProjectedObjectBounds(expedition.transports.boat.getObjectByName('boat-hull'),camera),
        waterfall:getProjectedObjectBounds(expedition.scenery.waterfall.getObjectByName('waterfall-cascade-1'),camera),
      },
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
      frame=0
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
      preparationAbort.abort()
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('webglcontextlost',onLost)
      const release=()=>{
        daylight.dispose()
        sun.shadow.dispose()
        expedition.dispose()
        disposeObject3D(scene)
        Object.values(materials).forEach(material=>material.dispose())
        renderer.dispose()
      }
      // Let the abort unwind viewport/visibility restoration before destroying
      // its renderer. The cancellation wait clears its timer immediately.
      if(prepared) release()
      else preparation.finally(release)
    },
  }
}
