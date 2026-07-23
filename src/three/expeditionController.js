import * as THREE from 'three'
import { createExpeditionBoat,createExpeditionJeep,updateBoat,updateJeep } from './expeditionVehicles'
import { createHillWorld,updateHillWorld } from './hillWorld'
import { createJungleWorld } from './jungleWorld'
import { disposeObject3D } from './primitives'
import { getBiomeWeights,smootherstep } from './terrain'
import { createTrekkingParty,updateTrekkingParty } from './trekkingParty'
import { createWaterWorld,updateWaterWorld } from './waterWorld'

const PHASE_RANGES={
  'mountain-trek':[0,.28],
  'trek-to-boat':[.28,.42],
  'water-boat':[.42,.60],
  'boat-to-jeep':[.60,.74],
  'forest-jeep':[.74,.94],
  contact:[.94,1],
}

const getStateProgress=state=>{
  const [start=0,end=1]=PHASE_RANGES[state?.phase]||[]
  return THREE.MathUtils.lerp(start,end,THREE.MathUtils.clamp(state?.localProgress||0,0,1))
}

export const getExpeditionTransition=state=>{
  const handoff=state.phase==='trek-to-boat'||state.phase==='boat-to-jeep'
    ?smootherstep(0,1,state.localProgress)
    :0
  const transports={
    trekker:state.phase==='mountain-trek'
      ?1
      :state.phase==='trek-to-boat'
        ?1-handoff
        :0,
    boat:state.phase==='trek-to-boat'
      ?handoff
      :state.phase==='water-boat'
        ?1
        :state.phase==='boat-to-jeep'
          ?1-handoff
          :0,
    jeep:state.phase==='boat-to-jeep'
      ?handoff
      :state.phase==='forest-jeep'||state.phase==='contact'
        ?1
        :0,
  }
  return{
    worlds:getBiomeWeights(getStateProgress(state)),
    transports,
    cameraBlend:handoff,
  }
}

const collectMaterials=root=>{
  const materials=new Set()
  root.traverse(object=>{
    const values=Array.isArray(object.material)?object.material:[object.material]
    values.filter(Boolean).forEach(material=>materials.add(material))
  })
  return materials
}

const isolateSharedMaterials=(roots,callerMaterials)=>{
  const ownership=new Map()
  roots.forEach(root=>collectMaterials(root).forEach(material=>{
    ownership.set(material,(ownership.get(material)||0)+1)
  }))
  const shared=new Set([
    ...Object.values(callerMaterials).filter(material=>material?.isMaterial),
    ...[...ownership].filter(([,count])=>count>1).map(([material])=>material),
  ])
  roots.forEach(root=>{
    const clones=new Map()
    root.traverse(object=>{
      if(!object.material) return
      const values=Array.isArray(object.material)?object.material:[object.material]
      const isolated=values.map(material=>{
        if(!shared.has(material)) return material
        if(!clones.has(material)) clones.set(material,material.clone())
        return clones.get(material)
      })
      object.material=Array.isArray(object.material)?isolated:isolated[0]
    })
  })
}

const createBlendState=root=>{
  const materials=new Map()
  const lights=new Map()
  const shadows=new Map()
  root.traverse(object=>{
    const values=Array.isArray(object.material)?object.material:[object.material]
    values.filter(Boolean).forEach(material=>{
      if(materials.has(material)) return
      materials.set(material,{
        opacity:material.opacity,
        depthWrite:material.depthWrite,
      })
      material.transparent=true
    })
    if(object.isLight) lights.set(object,object.intensity)
    if(object.isMesh) shadows.set(object,object.castShadow)
  })
  return{materials,lights,shadows}
}

const resetBlendState=({materials,lights,shadows})=>{
  materials.forEach((base,material)=>{
    material.opacity=base.opacity
    material.depthWrite=base.depthWrite
  })
  lights.forEach((intensity,light)=>{light.intensity=intensity})
  shadows.forEach((castShadow,object)=>{object.castShadow=castShadow})
}

const applyBlendWeight=(blendState,weight)=>{
  blendState.materials.forEach((base,material)=>{
    material.opacity*=weight
    material.depthWrite=base.depthWrite&&weight>.999
  })
  blendState.lights.forEach((intensity,light)=>{light.intensity=intensity*weight})
  blendState.shadows.forEach((castShadow,object)=>{
    object.castShadow=castShadow&&weight>.01
  })
}

const routeProgress=(state,transport,partySpan=0)=>{
  if(transport==='trekker'){
    const endpoint=1-partySpan
    return state.phase==='mountain-trek'?state.localProgress*endpoint:endpoint
  }
  if(transport==='boat'){
    if(state.phase==='mountain-trek'||state.phase==='trek-to-boat') return 0
    if(state.phase==='water-boat') return state.localProgress
    return 1
  }
  if(state.phase==='forest-jeep') return state.localProgress
  if(state.phase==='contact') return 1
  return 0
}

const getDeckSurfaceBounds=deck=>{
  const bounds=new THREE.Box3()
  deck.children
    .filter(child=>child.geometry?.type==='BoxGeometry')
    .forEach(plank=>bounds.expandByObject(plank))
  return bounds
}

const clearanceAlongLateral=(hullBounds,deckBounds,lateral,gap=.24)=>{
  const thresholds=['x','z'].map(axis=>{
    const component=lateral[axis]
    if(Math.abs(component)<1e-6) return Infinity
    return component>0
      ?(deckBounds.max[axis]+gap-hullBounds.min[axis])/component
      :(hullBounds.max[axis]+gap-deckBounds.min[axis])/-component
  })
  return Math.max(0,Math.min(...thresholds))
}

export function createExpeditionController(scene,materials,quality){
  const mountain=createHillWorld(materials,quality)
  const water=createWaterWorld(materials,quality)
  const forest=createJungleWorld(materials,quality)
  const trekker=createTrekkingParty(materials)
  const boat=createExpeditionBoat(materials)
  const jeep=createExpeditionJeep(materials)
  const transportRoot=new THREE.Group()
  transportRoot.name='expedition-transports'
  transportRoot.add(trekker,boat,jeep)

  mountain.updateMatrixWorld(true)
  water.updateMatrixWorld(true)
  const mountainDeck=mountain.getObjectByName('mountain-landing-deck')
  const waterDeck=water.getObjectByName('boat-jetty')
  const mountainDeckSurface=getDeckSurfaceBounds(mountainDeck)
  const mountainSurfaceHeightAt=(x,z,point)=>
    x>=mountainDeckSurface.min.x&&x<=mountainDeckSurface.max.x&&
    z>=mountainDeckSurface.min.z&&z<=mountainDeckSurface.max.z
      ?mountainDeckSurface.max.y
      :point.y

  updateBoat(boat,water.userData.route,0,0,true)
  transportRoot.updateMatrixWorld(true)
  const hullBounds=new THREE.Box3().setFromObject(boat.getObjectByName('boat-hull'))
  const startTangent=water.userData.route.getTangentAt(.002).normalize()
  const dockLateral=new THREE.Vector3(startTangent.z,0,-startTangent.x).normalize()
  boat.userData.dockLateralOffset=Math.max(
    clearanceAlongLateral(hullBounds,new THREE.Box3().setFromObject(mountainDeck),dockLateral),
    clearanceAlongLateral(hullBounds,new THREE.Box3().setFromObject(waterDeck),dockLateral),
  )

  const worlds={mountain,water,forest}
  const transports={trekker,boat,jeep}
  const partySpan=Math.max(...trekker.userData.routeOffsets)
  const roots=[...Object.values(worlds),...Object.values(transports)]
  isolateSharedMaterials(roots,materials)
  const blendStates=new Map(roots.map(root=>[root,createBlendState(root)]))

  Object.values(worlds).forEach(world=>{world.visible=true})
  scene.add(mountain,water,forest,transportRoot)

  const update=(state,elapsed,reducedMotion)=>{
    roots.forEach(root=>resetBlendState(blendStates.get(root)))
    updateTrekkingParty(
      trekker,
      mountain.userData.route,
      routeProgress(state,'trekker',partySpan),
      elapsed,
      reducedMotion,
      mountainSurfaceHeightAt,
    )
    updateBoat(boat,water.userData.route,routeProgress(state,'boat'),elapsed,reducedMotion)
    updateJeep(jeep,forest.userData.route,routeProgress(state,'jeep'),elapsed,reducedMotion)
    updateHillWorld(mountain,elapsed)
    updateWaterWorld(water,elapsed,boat)

    const transition=getExpeditionTransition(state)
    Object.entries(worlds).forEach(([name,world])=>{
      world.visible=true
      applyBlendWeight(blendStates.get(world),transition.worlds[name])
    })
    Object.entries(transports).forEach(([name,transport])=>{
      transport.visible=true
      applyBlendWeight(blendStates.get(transport),transition.transports[name])
    })
    return transition
  }

  let disposed=false
  const dispose=()=>{
    if(disposed) return
    disposed=true
    ;[mountain,water,forest,transportRoot].forEach(root=>{
      root.parent?.remove(root)
      disposeObject3D(root)
    })
  }

  return{update,worlds,transports,transportRoot,dispose}
}
