import * as THREE from 'three'
import { createExpeditionController } from './expeditionController'
import { clamp01,getJourneyState } from './journeyData'
import { createMaterials,disposeObject3D } from './primitives'

export const getRenderQuality=width=>width<768?'mobile':'desktop'
export const getWorldVisibility=()=>[]
export const getDampingFactor=delta=>1-Math.exp(-Math.max(0,delta)*4.5)

const rounded=value=>Number(value.toFixed(6))
const MOBILE_FRAMING={
  trekker:{camera:[3,2.2,8],targetY:.9},
  boat:{camera:[4,2.8,9],targetY:.8},
  jeep:{camera:[4,3.2,9],targetY:1},
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

export function createIndiaJourney(canvas,{reducedMotion=false,onContextLost=()=>{}}={}){
  const quality=getRenderQuality(window.innerWidth)
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(48,1,.1,420)
  const renderer=new THREE.WebGLRenderer({
    canvas,
    antialias:quality==='desktop',
    alpha:false,
    powerPreference:'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='mobile'?1.25:2))
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

  const cameraTarget=new THREE.Vector3(...initialState.cameraTarget)
  camera.position.set(...initialState.cameraPosition)
  camera.lookAt(cameraTarget)

  const resize=()=>{
    const parent=canvas.parentElement
    if(!parent) return
    renderer.setSize(parent.clientWidth,parent.clientHeight,false)
    camera.aspect=parent.clientWidth/Math.max(1,parent.clientHeight)
    camera.updateProjectionMatrix()
  }
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
  let pointer={x:0,y:0}
  let frame
  let paused=false
  let lost=false
  let disposed=false

  const animate=()=>{
    if(paused||lost||disposed) return
    const delta=Math.min(clock.getDelta(),.1)
    const elapsed=clock.elapsedTime
    const state=getJourneyState(progress)
    const transition=expedition.update(state.expedition,elapsed,reducedMotion)
    const damping=getDampingFactor(delta)
    desiredCamera.set(...state.cameraPosition)
    desiredTarget.set(...state.cameraTarget)

    if(quality==='mobile'){
      const transport=expedition.transports[state.expedition.activeTransport]
      const transportPosition=getTransportWorldPosition(
        state.expedition.activeTransport,
        transport,
      )
      const framing=getMobileTransportCamera(
        state.expedition.activeTransport,
        transportPosition.toArray(),
      )
      desiredCamera.set(...framing.camera)
      desiredTarget.set(...framing.target)
    }
    if(!reducedMotion){
      desiredCamera.x+=pointer.x*.45
      desiredCamera.y-=pointer.y*.25
    }

    camera.position.lerp(desiredCamera,damping)
    cameraTarget.lerp(desiredTarget,damping)
    camera.lookAt(cameraTarget)

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
