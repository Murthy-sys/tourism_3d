import * as THREE from 'three'
import {createAmbassador,updateAmbassador} from './ambassador'
import {createExpeditionController,getExpeditionQASnapshot,hasRenderableMesh} from './expeditionController'
import {clamp01,getJourneyState} from './journeyData'
import {createMaterials,disposeObject3D,mesh} from './primitives'
import {createIndiaRegions} from './regions'

const ATMOSPHERES={
  forest:{fogColor:'#719080',fogNear:16,fogFar:70,exposure:1.12},
  water:{fogColor:'#79b7bd',fogNear:18,fogFar:86,exposure:1.20},
  hills:{fogColor:'#9aac9c',fogNear:20,fogFar:112,exposure:1.08},
}

export const getRenderQuality=width=>width<768?'mobile':'desktop'
export const getRenderFov=quality=>quality==='mobile'?64:48
export const getMobileHandoffTargetOffset=state=>state.phase==='jeep-to-boat'
  ? Math.sin(Math.PI*clamp01(state.localProgress))
  : 0
export const getMobileTrekCamera=([x,y,z])=>({camera:[x+3,y+3.5,z+20],target:[x,y+.7,z+4]})
export const usesMobileTrekCamera=phase=>phase==='hill-trek'||phase==='contact'
export const getDampingFactor=delta=>1-Math.exp(-Math.max(0,delta)*4.5)
export const getPartyScreenSnapshot=(party,camera,weight,scene)=>{
  camera.updateMatrixWorld(true)
  return (party.userData.members||[]).map(({role,root})=>{
    const clip=root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,1,0)).project(camera)
    return{
      name:root.name,
      role,
      visible:weight>.05&&hasRenderableMesh(root,scene)&&Math.abs(clip.x)<=1&&Math.abs(clip.y)<=1&&clip.z>=-1&&clip.z<=1,
      ndc:{x:clip.x,y:clip.y,z:clip.z},
    }
  })
}
export const getTransportScreenSnapshot=(transports,camera,weights,scene)=>{
  camera.updateMatrixWorld(true)
  return Object.entries(transports).map(([name,transport])=>{
    const bounds=new THREE.Box3().setFromObject(transport)
    const center=bounds.isEmpty()?transport.getWorldPosition(new THREE.Vector3()):bounds.getCenter(new THREE.Vector3())
    const clip=center.project(camera)
    return{
      name,
      visible:(weights[name]||0)>.05&&hasRenderableMesh(transport,scene)&&Math.abs(clip.x)<=1&&Math.abs(clip.y)<=1&&clip.z>=-1&&clip.z<=1,
      ndc:{x:clip.x,y:clip.y,z:clip.z},
    }
  })
}
export const getAtmosphereState=weights=>{
  const fogColor=new THREE.Color(0,0,0)
  const state={fogColor,fogNear:0,fogFar:0,exposure:0}
  Object.entries(ATMOSPHERES).forEach(([name,palette])=>{
    const weight=weights[name]||0
    const color=new THREE.Color(palette.fogColor)
    fogColor.r+=color.r*weight
    fogColor.g+=color.g*weight
    fogColor.b+=color.b*weight
    state.fogNear+=palette.fogNear*weight
    state.fogFar+=palette.fogFar*weight
    state.exposure+=palette.exposure*weight
  })
  return state
}

export const getWorldVisibility=phase=>({
  'vehicle-intro':['south','deccan'],
  operations:['deccan','tourism-operations-pavilion'],
  plans:[],
  contact:[],
}[phase]||[])

const collectMaterialStates=root=>{
  const states=new Map()
  root.traverse(object=>{
    const materials=Array.isArray(object.material)?object.material:[object.material]
    materials.filter(Boolean).forEach(material=>states.set(material,{
      opacity:material.opacity,
      transparent:material.transparent,
      depthWrite:material.depthWrite,
    }))
  })
  return states
}

const setObjectWeight=(root,states,weight)=>{
  root.visible=true
  states.forEach((base,material)=>{
    const transparent=base.transparent||weight<1
    material.opacity=base.opacity*weight
    material.depthWrite=base.depthWrite&&weight>.35
    if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true}
  })
}

export function createIndiaJourney(canvas,{reducedMotion=false,onContextLost=()=>{}}={}){
  const quality=getRenderQuality(window.innerWidth)
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(getRenderFov(quality),1,.1,300)
  const renderer=new THREE.WebGLRenderer({canvas,antialias:quality==='desktop',alpha:false,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='mobile'?1.25:2))
  renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.18
  renderer.shadowMap.enabled=quality==='desktop'
  renderer.shadowMap.type=THREE.PCFSoftShadowMap

  scene.fog=new THREE.Fog('#8fc7c7',20,75)
  scene.background=new THREE.Color('#8fc7c7')
  scene.add(new THREE.HemisphereLight('#ffd9b0','#283c43',2.3))
  const sun=new THREE.DirectionalLight('#ffb46f',3.4)
  sun.position.set(-15,18,12)
  sun.castShadow=quality==='desktop'
  scene.add(sun)

  const materials=createMaterials()
  const world=createIndiaRegions(materials,quality)
  scene.add(world)
  const journeyGround=mesh(new THREE.PlaneGeometry(70,180),materials.road,[0,-.22,-68],[-Math.PI/2,0,0])
  journeyGround.name='journey-ground'
  scene.add(journeyGround)
  const routePoints=[]
  for(let i=0;i<55;i++)routePoints.push(new THREE.Vector3(Math.sin(i*.5)*2,.08,4-i*2.7))
  const routeCurve=new THREE.CatmullRomCurve3(routePoints)
  const route=mesh(new THREE.TubeGeometry(routeCurve,220,.045,6,false),materials.gold)
  route.name='travel-route'
  scene.add(route)

  const ambassador=createAmbassador(materials)
  const ambassadorMaterials=collectMaterialStates(ambassador)
  scene.add(ambassador)
  const expedition=createExpeditionController(scene,materials,quality)
  const clock=new THREE.Clock()
  let progress=0
  let pointer={x:0,y:0}
  let raf
  let paused=false
  let target=new THREE.Vector3()
  let lost=false
  let latestTransition

  const getQASnapshot=()=>{
    const state=getJourneyState(progress)
    const snapshot=getExpeditionQASnapshot(expedition,scene)
    const ambassadorWeight=hasRenderableMesh(ambassador,scene)?latestTransition?.transports.ambassador||0:0
    const transportWeights={ambassador:ambassadorWeight,...snapshot.transportWeights}
    const members=getPartyScreenSnapshot(expedition.transports.trekker,camera,transportWeights.trekker,scene)
    const transports=getTransportScreenSnapshot({ambassador,...expedition.transports},camera,transportWeights,scene)
    return{
      ...snapshot,
      progress,
      phase:state.expedition.phase,
      transportWeights,
      members,
      transports,
      visibleMembers:{
        guides:members.filter(member=>member.visible&&member.role==='guide').length,
        tourists:members.filter(member=>member.visible&&member.role==='tourist').length,
      },
    }
  }
  window.__journeyQA=getQASnapshot

  const resize=()=>{
    const parent=canvas.parentElement
    if(!parent)return
    renderer.setSize(parent.clientWidth,parent.clientHeight,false)
    camera.aspect=parent.clientWidth/Math.max(1,parent.clientHeight)
    camera.updateProjectionMatrix()
  }
  const ro=new ResizeObserver(resize)
  if(canvas.parentElement)ro.observe(canvas.parentElement)
  resize()

  const animate=()=>{
    if(paused||lost)return
    const delta=clock.getDelta()
    const elapsed=clock.elapsedTime
    const state=getJourneyState(progress)
    let desiredPosition=new THREE.Vector3(...state.cameraPosition)
    const visible=new Set(getWorldVisibility(state.phase))
    world.children.forEach(group=>{group.visible=visible.has(group.name)})

    updateAmbassador(ambassador,routeCurve,Math.min(progress,.41),elapsed,reducedMotion)
    const transition=expedition.update(state.expedition,elapsed,reducedMotion)
    latestTransition=transition
    setObjectWeight(ambassador,ambassadorMaterials,transition.transports.ambassador)
    route.visible=transition.transports.ambassador>0
    journeyGround.visible=state.phase==='vehicle-intro'||state.phase==='operations'

    let desiredTarget=state.phase==='vehicle-intro'
      ? ambassador.position.clone().add(new THREE.Vector3(0,1,0))
      : new THREE.Vector3(...state.cameraTarget)
    if(quality==='mobile')desiredTarget.x+=getMobileHandoffTargetOffset(state.expedition)
    if(quality==='mobile'&&usesMobileTrekCamera(state.expedition.phase)){
      const party=expedition.transports.trekker
      const guide=party.userData.members?.[0]?.root||party
      const framing=getMobileTrekCamera(guide.getWorldPosition(new THREE.Vector3()).toArray())
      desiredPosition=new THREE.Vector3(...framing.camera)
      desiredTarget=new THREE.Vector3(...framing.target)
    }
    if(!reducedMotion){
      desiredPosition.x+=pointer.x*.45
      desiredPosition.y-=pointer.y*.25
    }

    const damping=getDampingFactor(delta)
    camera.position.lerp(desiredPosition,damping)
    target.lerp(desiredTarget,damping)
    camera.lookAt(target)

    const atmosphere=getAtmosphereState(transition.worlds)
    scene.background.lerp(atmosphere.fogColor,damping)
    scene.fog.color.copy(scene.background)
    scene.fog.near=atmosphere.fogNear
    scene.fog.far=atmosphere.fogFar
    renderer.toneMappingExposure=atmosphere.exposure
    renderer.render(scene,camera)
    raf=requestAnimationFrame(animate)
  }

  const onLost=event=>{
    event.preventDefault()
    lost=true
    cancelAnimationFrame(raf)
    onContextLost()
  }
  canvas.addEventListener('webglcontextlost',onLost)
  animate()

  return{
    setProgress:value=>{progress=clamp01(value)},
    setPointer:(x,y)=>{pointer={x,y}},
    setReducedMotion:value=>{reducedMotion=value},
    getQASnapshot,
    pause:()=>{paused=true;cancelAnimationFrame(raf)},
    resume:()=>{if(paused){paused=false;clock.getDelta();animate()}},
    dispose:()=>{
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('webglcontextlost',onLost)
      if(window.__journeyQA===getQASnapshot)delete window.__journeyQA
      expedition.dispose()
      disposeObject3D(scene)
      renderer.dispose()
    },
  }
}
