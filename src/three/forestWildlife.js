import * as THREE from 'three'
import { distanceToForestRoute } from './forestTerrain'
import { sampleFinaleWater } from './finaleConfig'
import { shiftFinaleZ } from './journeySpatial'
import { createRealisticWildlife } from './realisticWildlife'
import { createWildlifeRig } from './wildlifeRig'

const habitats=[
  {kind:'deer',progress:.27,side:-1,offset:5.2,scale:1,speed:.24,radius:1.05},
  {kind:'deer',progress:.34,side:-1,offset:5.7,scale:.94,speed:.22,radius:.95},
  {kind:'deer',progress:.36,side:-1,offset:4.8,scale:.65,speed:.20,radius:.75},
  {kind:'boar',progress:.67,side:1,offset:5.2,scale:1,speed:.19,radius:.85},
]

// Integrating the speed ramp keeps the gait and path in step through pauses.
// Each animal follows its own cycle without a timer or accumulated frame drift.
const sampleWalk=(elapsed,index,speed,motion)=>{
  const walk=17,pause=5,ramp=1.2,cycle=walk+pause
  const time=Math.max(0,elapsed)+index*4.7
  const lap=Math.floor(time/cycle),local=time%cycle
  const rampDistance=t=>t*.5-ramp*Math.sin(Math.PI*t/ramp)/(2*Math.PI)
  let distance=walk-ramp,weight=0
  if(local<ramp){
    distance=rampDistance(local)
    weight=(1-Math.cos(Math.PI*local/ramp))*.5
  }else if(local<=walk-ramp){
    distance=local-ramp*.5
    weight=1
  }else if(local<walk){
    distance=walk-ramp-rampDistance(walk-local)
    weight=(1-Math.cos(Math.PI*(walk-local)/ramp))*.5
  }
  motion.distance=(lap*(walk-ramp)+distance)*speed
  motion.speed=weight*speed
}

const createWalkPath=(anchor,tangent,normal,radius)=>{
  const points=Array.from({length:12},(_,index)=>{
    const angle=index/12*Math.PI*2
    return anchor.clone().addScaledVector(normal,Math.cos(angle)*radius)
      .addScaledVector(tangent,Math.sin(angle)*radius*.72)
  })
  const path=new THREE.CatmullRomCurve3(points,true,'centripetal')
  path.arcLengthDivisions=240
  path.updateArcLengths()
  return path
}

// Sample each habitat once. Grounding four real hoofs should not repeat the
// full 1,200-point forest-track distance query in every animation frame.
const cacheHabitatGround=(anchor,heightAt)=>{
  const spacing=.25,size=21,originX=anchor.x-2.5,originZ=anchor.z-2.5
  const heights=new Float32Array(size*size)
  for(let z=0;z<size;z++) for(let x=0;x<size;x++) heights[z*size+x]=heightAt(originX+x*spacing,originZ+z*spacing)
  return(x,z)=>{
    const gx=THREE.MathUtils.clamp((x-originX)/spacing,0,size-1.001)
    const gz=THREE.MathUtils.clamp((z-originZ)/spacing,0,size-1.001)
    const ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz
    return THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(heights[iz*size+ix],heights[iz*size+ix+1],fx),
      THREE.MathUtils.lerp(heights[(iz+1)*size+ix],heights[(iz+1)*size+ix+1],fx),fz)
  }
}

export function createForestWildlife({route,heightAt,quality='desktop',assetFactory=createRealisticWildlife}){
  const group=new THREE.Group()
  group.name='forest-wildlife'
  const sample=new THREE.Vector3(),direction=new THREE.Vector3(),inverse=new THREE.Matrix4()
  const groundTargets=new Float32Array(4)
  const animals=habitats.map((spec,index)=>{
    const anchor=route.getPointAt(spec.progress)
    const tangent=route.getTangentAt(spec.progress).setY(0).normalize()
    const normal=new THREE.Vector3(-tangent.z,0,tangent.x)
    anchor.addScaledVector(normal,spec.side*spec.offset)
    for(let attempt=0;attempt<24;attempt++){
      if(distanceToForestRoute(route,anchor.x,anchor.z)>=4&&
        (anchor.z>=shiftFinaleZ(-130)||sampleFinaleWater(anchor.x,anchor.z).edgeDistance>=3)) break
      anchor.addScaledVector(normal,spec.side*.5)
    }
    const root=new THREE.Group()
    root.name=`forest-${spec.kind}-${index+1}`
    root.scale.setScalar(spec.scale)
    root.rotation.order='YXZ'
    group.add(root)
    const source=assetFactory(spec.kind)
    const rig=source?createWildlifeRig(source,spec.kind):null
    if(rig){
      root.add(rig.group)
      rig.group.traverse(object=>{
        if(!object.isMesh) return
        object.castShadow=quality!=='mobile'
        object.receiveShadow=true
      })
    }
    // No primitive substitutes or late model swaps during the journey.
    root.visible=Boolean(rig)
    const path=createWalkPath(anchor,tangent,normal,spec.radius)
    return{...spec,root,rig,anchor,groundAt:cacheHabitatGround(anchor,heightAt),
      path,pathLength:path.getLength(),motion:{distance:0,speed:0},
      clearingRadius:spec.radius+spec.scale*1.3+.15,
      hoofPositions:Array.from({length:4},()=>new THREE.Vector3()),
    }
  })
  group.userData.animals=animals
  group.userData.assetStyle='textured-anatomical-models'
  let previousTime=-1
  const update=(elapsed=0,reducedMotion=false)=>{
    const time=reducedMotion?0:Math.floor(Math.max(0,elapsed)*30)/30
    if(time===previousTime) return
    previousTime=time
    animals.forEach((animal,index)=>{
      const {root,rig,groundAt,path,pathLength,motion}=animal
      if(!rig) return
      sampleWalk(time,index,animal.speed,motion)
      const progress=(motion.distance%pathLength)/pathLength
      path.getPointAt(progress,root.position)
      path.getTangentAt(progress,direction)
      const {x,z}=root.position
      const yaw=Math.atan2(direction.x,direction.z)
      const dx=(groundAt(x+.4,z)-groundAt(x-.4,z))/.8
      const dz=(groundAt(x,z+.4)-groundAt(x,z-.4))/.8
      root.position.set(x,groundAt(x,z),z)
      root.rotation.set(-Math.atan(dx*Math.sin(yaw)+dz*Math.cos(yaw)),yaw,
        Math.atan(dx*Math.cos(yaw)-dz*Math.sin(yaw)),'YXZ')
      motion.distance/=animal.scale
      motion.speed=reducedMotion?0:motion.speed/animal.scale
      rig.pose(time+index*3.7,reducedMotion,motion)
      root.updateWorldMatrix(true,true)
      inverse.copy(root.matrixWorld).invert()
      rig.feet.forEach((foot,footIndex)=>{
        sample.copy(foot).applyMatrix4(root.matrixWorld)
        sample.y=groundAt(sample.x,sample.z)
        groundTargets[footIndex]=sample.applyMatrix4(inverse).y
      })
      rig.groundFeet(groundTargets)
      rig.feet.forEach((foot,footIndex)=>animal.hoofPositions[footIndex].copy(foot).applyMatrix4(root.matrixWorld))
    })
  }
  update(0,true)
  return{group,update}
}
