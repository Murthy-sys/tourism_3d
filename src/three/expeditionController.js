import * as THREE from 'three'
import {createExpeditionBoat,createExpeditionJeep,updateBoat,updateJeep} from './expeditionVehicles'
import {createHillWorld,updateHillWorld} from './hillWorld'
import {createJungleWorld} from './jungleWorld'
import {getLandscapeWeights,smoothstep} from './terrain'
import {createTrekkingParty,updateTrekkingParty} from './trekkingParty'
import {createWaterWorld,updateWaterWorld} from './waterWorld'
import {disposeObject3D} from './primitives'

const PHASE_RANGES={
  ambassador:[0,.38],
  'ambassador-to-jeep':[.38,.41],
  'jungle-jeep':[.41,.57],
  'jeep-to-boat':[.57,.62],
  'water-boat':[.62,.70],
  'boat-to-trek':[.70,.75],
  'hill-trek':[.75,.92],
  contact:[.92,1],
}

const clamp01=value=>Math.min(1,Math.max(0,Number.isFinite(value)?value:0))
const expeditionProgress=state=>{
  if(Number.isFinite(state.progress))return clamp01(state.progress)
  const [start,end]=PHASE_RANGES[state.phase]||[0,0]
  return start+(end-start)*clamp01(state.localProgress)
}

const landscapeProgress=progress=>progress<.655
  ? .58+(progress-.58)*(2/3)
  : .73+(progress-.73)*(2/3)

export function getTransitionState(expeditionState){
  const progress=expeditionProgress(expeditionState)
  const worlds=getLandscapeWeights(landscapeProgress(progress))
  const jeepIn=smoothstep(.35,.45,progress)
  return{
    worlds,
    transports:{
      ambassador:1-jeepIn,
      jeep:jeepIn*worlds.forest,
      boat:worlds.water,
      trekker:worlds.hills,
    },
  }
}

const materialState=new WeakMap()
const collectMaterials=root=>{
  const materials=new Set()
  root.traverse(object=>{
    const objectMaterials=Array.isArray(object.material)?object.material:[object.material]
    objectMaterials.filter(Boolean).forEach(material=>materials.add(material))
  })
  return materials
}

const isolateMaterials=(root,sharedMaterials)=>{
  const clones=new Map()
  const clone=material=>{
    if(!sharedMaterials.has(material))return material
    if(!clones.has(material))clones.set(material,material.clone())
    return clones.get(material)
  }
  root.traverse(object=>{
    if(Array.isArray(object.material))object.material=object.material.map(clone)
    else if(object.material)object.material=clone(object.material)
  })
  return collectMaterials(root)
}

const setMaterialWeight=(materials,weight)=>materials.forEach(material=>{
  if(!materialState.has(material))materialState.set(material,{
    opacity:material.opacity,
    transparent:material.transparent,
    depthWrite:material.depthWrite,
  })
  const base=materialState.get(material)
  const transparent=base.transparent||weight<1
  material.opacity=base.opacity*weight
  material.depthWrite=base.depthWrite&&weight>.35
  if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true}
})

const collectLights=root=>{
  const lights=[]
  root.traverse(object=>{if(object.isLight)lights.push({light:object,intensity:object.intensity})})
  return lights
}

const collectShadowCasters=root=>{
  const casters=[]
  root.traverse(object=>{if(object.isMesh)casters.push({object,castShadow:object.castShadow})})
  return casters
}

const setShadowWeight=(casters,weight)=>casters.forEach(({object,castShadow})=>{
  object.castShadow=castShadow&&weight>.35
})

const setWorldWeight=(world,materials,lights,casters,weight)=>{
  world.visible=true
  world.userData.zoneWeight=weight
  setMaterialWeight(materials,weight)
  lights.forEach(({light,intensity})=>{light.intensity=intensity*weight})
  setShadowWeight(casters,weight)
}

const setTransportWeight=(transport,materials,casters,weight)=>{
  transport.visible=true
  transport.userData.transitionWeight=weight
  setMaterialWeight(materials,weight)
  setShadowWeight(casters,weight)
}

const alignWorldAnchor=(world,anchor,target)=>{
  world.updateMatrixWorld(true)
  const current=anchor.getWorldPosition(new THREE.Vector3())
  world.position.add(target.clone().sub(current))
  world.updateMatrixWorld(true)
}

export function createExpeditionController(scene,materials,quality){
  const forest=createJungleWorld(materials,quality)
  const water=createWaterWorld(materials,quality)
  const hills=createHillWorld(materials,quality)
  forest.position.z=-52
  forest.updateMatrixWorld(true)
  alignWorldAnchor(water,water.userData.forestLanding,forest.userData.landing.getWorldPosition(new THREE.Vector3()))
  alignWorldAnchor(hills,hills.userData.landing,water.userData.hillLanding.getWorldPosition(new THREE.Vector3()))

  const worldMaterials={
    forest:collectMaterials(forest),
    water:collectMaterials(water),
    hills:collectMaterials(hills),
  }
  const worldLights={
    forest:collectLights(forest),
    water:collectLights(water),
    hills:collectLights(hills),
  }
  const worldShadowCasters={
    forest:collectShadowCasters(forest),
    water:collectShadowCasters(water),
    hills:collectShadowCasters(hills),
  }

  const jeep=createExpeditionJeep(materials)
  const boat=createExpeditionBoat(materials)
  const trekker=createTrekkingParty(materials)
  const sharedMaterials=new Set(Object.values(materials))
  const transportMaterials={
    jeep:isolateMaterials(jeep,sharedMaterials),
    boat:isolateMaterials(boat,sharedMaterials),
    trekker:isolateMaterials(trekker,sharedMaterials),
  }
  const transportShadowCasters={
    jeep:collectShadowCasters(jeep),
    boat:collectShadowCasters(boat),
    trekker:collectShadowCasters(trekker),
  }
  forest.add(jeep)
  water.add(boat)
  hills.add(trekker)
  scene.add(forest,water,hills)

  const worlds={forest,water,hills}
  const transports={jeep,boat,trekker}
  let disposed=false
  const update=(state,elapsed,reducedMotion)=>{
    const transition=getTransitionState(state)
    Object.entries(worlds).forEach(([name,world])=>setWorldWeight(world,worldMaterials[name],worldLights[name],worldShadowCasters[name],transition.worlds[name]))
    Object.entries(transports).forEach(([name,transport])=>setTransportWeight(transport,transportMaterials[name],transportShadowCasters[name],transition.transports[name]))

    const p=state.localProgress
    const jeepProgress=state.phase==='jungle-jeep'?p:PHASE_RANGES[state.phase]?.[0]>=.57?1:0
    const boatProgress=state.phase==='water-boat'?p:PHASE_RANGES[state.phase]?.[0]>=.70?1:0
    const trekProgress=state.phase==='hill-trek'?p:state.phase==='contact'?1:0
    updateJeep(jeep,forest.userData.route,jeepProgress,elapsed,reducedMotion)
    updateBoat(boat,water.userData.route,boatProgress,elapsed,reducedMotion)
    updateTrekkingParty(trekker,hills.userData.route,trekProgress,elapsed,reducedMotion,hills.userData.heightAt)
    updateWaterWorld(water,elapsed,boat)
    updateHillWorld(hills,elapsed)
    return transition
  }

  const dispose=()=>{
    if(disposed)return
    disposed=true
    scene.remove(forest,water,hills)
    Object.values(worlds).forEach(disposeObject3D)
  }
  return{update,worlds,transports,dispose}
}
