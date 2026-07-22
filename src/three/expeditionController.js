import {createExpeditionBoat,createExpeditionJeep,updateBoat,updateJeep} from './expeditionVehicles'
import {createHillWorld,updateHillWorld} from './hillWorld'
import {createJungleWorld} from './jungleWorld'
import {getLandscapeWeights,smoothstep} from './terrain'
import {createTrekkingParty,updateTrekkingParty} from './trekkingParty'
import {createWaterWorld,updateWaterWorld} from './waterWorld'

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

const setWorldWeight=(world,materials,lights,weight)=>{
  world.visible=true
  world.userData.zoneWeight=weight
  setMaterialWeight(materials,weight)
  lights.forEach(({light,intensity})=>{light.intensity=intensity*weight})
}

const setTransportWeight=(transport,materials,weight)=>{
  transport.visible=true
  transport.userData.transitionWeight=weight
  setMaterialWeight(materials,weight)
}

export function createExpeditionController(scene,materials,quality){
  const forest=createJungleWorld(materials,quality)
  const water=createWaterWorld(materials,quality)
  const hills=createHillWorld(materials,quality)
  forest.position.z=-52
  water.position.z=-94
  hills.position.z=-132

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

  const jeep=createExpeditionJeep(materials)
  const boat=createExpeditionBoat(materials)
  const trekker=createTrekkingParty(materials)
  const sharedMaterials=new Set(Object.values(materials))
  const transportMaterials={
    jeep:isolateMaterials(jeep,sharedMaterials),
    boat:isolateMaterials(boat,sharedMaterials),
    trekker:isolateMaterials(trekker,sharedMaterials),
  }
  forest.add(jeep)
  water.add(boat)
  hills.add(trekker)
  scene.add(forest,water,hills)

  const worlds={forest,water,hills}
  const transports={jeep,boat,trekker}
  const update=(state,elapsed,reducedMotion)=>{
    const transition=getTransitionState(state)
    Object.entries(worlds).forEach(([name,world])=>setWorldWeight(world,worldMaterials[name],worldLights[name],transition.worlds[name]))
    Object.entries(transports).forEach(([name,transport])=>setTransportWeight(transport,transportMaterials[name],transition.transports[name]))

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

  return{update,worlds,transports,dispose:()=>{scene.remove(forest,water,hills)}}
}
