import * as THREE from 'three'
import { steadyTravelProgress } from '../journey/scrollTimeline'
import { ACCESS_ROAD_POINTS,ACCESS_ROAD_CLEARANCE } from './accessRoad'
import { sampleMountainHeight,smootherstep } from './terrain'
import { createForestTreeGeometry } from './forestGeometry'
import { createEnvironmentMaterial,createFoliageMaterial,createCanopyTexture } from './environmentSurface'

export const CITY_BOARDING_START=.025
export const CITY_DEPARTURE=.045
export const CITY_ARRIVAL=.105
export const TREK_DEPARTURE=.14
export const TREK_ENTRY=.19

const route=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4,0,150),
  ...ACCESS_ROAD_POINTS.map(([x,z])=>new THREE.Vector3(x,0,z)),
  new THREE.Vector3(-4,0,34),
],false,'centripetal')
route.arcLengthDivisions=600

export const getCityJourneyState=progress=>{
  const drive=steadyTravelProgress((progress-CITY_DEPARTURE)/(CITY_ARRIVAL-CITY_DEPARTURE))
  const position=route.getPointAt(drive)
  const tangent=route.getTangentAt(drive)
  position.y=sampleMountainHeight(position.x,position.z)+ACCESS_ROAD_CLEARANCE*
    smootherstep(0,.15,drive)*(1-smootherstep(.94,1,drive))
  // Both stops retain the exact surface height of their existing departure pads.
  return{
    drive,
    phase:progress<CITY_BOARDING_START?'city':progress<CITY_DEPARTURE?'boarding':progress<CITY_ARRIVAL?'drive':'trailhead',
    position,
    heading:Math.atan2(-tangent.x,-tangent.z),
  }
}

export const getCityCameraFrame=(progress,quality='desktop')=>{
  const {position,drive}=getCityJourneyState(progress)
  const mobile=quality==='mobile'
  const following={
    camera:[position.x+(mobile?17:17),position.y+(mobile?11:8.5),position.z+(mobile?30:24)],
    target:[position.x,position.y+1.8,position.z-2],
  }
  const established={
    camera:mobile?[13,11,112]:[12,8,124],
    target:mobile?[-4,3,157]:[-5,3,160],
  }
  const parked={
    camera:mobile?[3.5,5.1,67]:[8.5,3.8,46],
    target:mobile?[-2.5,1.55,34.8]:[-2,1.55,34.8],
  }
  const blend=(a,b,t)=>({
    camera:a.camera.map((v,i)=>THREE.MathUtils.lerp(v,b.camera[i],t)),
    target:a.target.map((v,i)=>THREE.MathUtils.lerp(v,b.target[i],t)),
  })
  return blend(blend(established,following,smootherstep(0,.24,drive)),parked,smootherstep(.84,1,drive))
}

export const createCoachRoadSampler=(road,coach)=>{
  const samples=320
  const heights=new Float32Array(samples+1)
  const pitches=new Float32Array(samples+1),rolls=new Float32Array(samples+1)
  const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0))
  const contacts=coach?.userData.wheelContactPoints||[]
  const ground=(x,z)=>{
    ray.ray.origin.set(x,60,z)
    return (z<128?ray.intersectObject(road,false)[0]?.point.y:null)??sampleMountainHeight(x,z)
  }
  road.updateWorldMatrix(true,true)
  for(let index=0;index<=samples;index++){
    const point=route.getPointAt(index/samples)
    heights[index]=ground(point.x,point.z)
    if(!contacts.length||index===0||index===samples) continue
    const tangent=route.getTangentAt(index/samples)
    const heading=Math.atan2(-tangent.x,-tangent.z)
    const cos=Math.cos(heading),sin=Math.sin(heading)
    const points=contacts.map(contact=>({
      x:contact.x,z:contact.z,
      y:ground(point.x+contact.x*cos+contact.z*sin,point.z-contact.x*sin+contact.z*cos),
    }))
    const average=key=>points.reduce((sum,p)=>sum+p[key],0)/points.length
    const x=average('x'),z=average('z'),y=average('y')
    const covariance=(a,b)=>points.reduce((sum,p)=>sum+(p[a]-({x,z,y}[a]))*(p[b]-({x,z,y}[b])),0)
    const xx=covariance('x','x'),zz=covariance('z','z'),xz=covariance('x','z')
    const xy=covariance('x','y'),zy=covariance('z','y'),denominator=xx*zz-xz*xz
    const lateral=(xy*zz-zy*xz)/denominator,longitudinal=(zy*xx-xy*xz)/denominator
    heights[index]=y-lateral*x-longitudinal*z
    pitches[index]=-Math.atan(longitudinal)
    rolls[index]=Math.atan(lateral)
  }
  const sample=(values,drive)=>{
    const sample=THREE.MathUtils.clamp(drive,0,1)*samples
    const index=Math.min(samples-1,Math.floor(sample))
    return THREE.MathUtils.lerp(values[index],values[index+1],sample-index)
  }
  const heightAt=drive=>sample(heights,drive)
  heightAt.pitchAt=drive=>sample(pitches,drive)
  heightAt.rollAt=drive=>sample(rolls,drive)
  return heightAt
}

export const updateCityCoach=(coach,progress,heightAtDrive)=>{
  const state=getCityJourneyState(progress)
  coach.position.copy(state.position)
  if(heightAtDrive) coach.position.y=heightAtDrive(state.drive)
  coach.rotation.order='YXZ'
  coach.rotation.set(heightAtDrive?.pitchAt?.(state.drive)||0,state.heading,heightAtDrive?.rollAt?.(state.drive)||0)
  const travel=state.drive*route.getLength()
  for(const wheel of coach.userData.wheels||[]){
    if(!wheel.userData.cityRestQuaternion) wheel.userData.cityRestQuaternion=wheel.quaternion.clone()
    const spin=travel/(coach.userData.dimensions?.wheelRadius||.48)
    wheel.quaternion.copy(wheel.userData.cityRestQuaternion)
    // Detailed asset wheels use the X axle; fallback tire geometry uses local Y.
    if(wheel.name.startsWith('wheel-')) wheel.rotateX(-spin)
    else wheel.rotateY((wheel.userData.side==='left'?1:-1)*spin)
  }
  const open=1-smootherstep(.041,CITY_DEPARTURE,progress)+smootherstep(CITY_ARRIVAL,.112,progress)
  const fallbackDoor=coach.getObjectByName('tour-coach-door-pivot')
  if(fallbackDoor) fallbackDoor.rotation.y=-.72*open
  for(let index=0;index<2;index++){
    const door=coach.getObjectByName(`entry-${index}`)
    if(door) door.rotation.y=(index===0?1.05:-1.05)*open
  }
  coach.userData.cityJourney={phase:state.phase,drive:state.drive}
}

// A sparse, instanced rural verge connects the urban edge to the existing hills.
// Trees keep their physical proportions across the longer route.
export const createCityApproach=quality=>{
  const group=new THREE.Group()
  group.name='city-to-hills-verge'
  const count=quality==='mobile'?28:48
  const geometry=createForestTreeGeometry(2,quality,{distant:true})
  const wood=new THREE.InstancedMesh(geometry.skeleton,createEnvironmentMaterial('#655d4e','bark'),count)
  const leaves=new THREE.InstancedMesh(geometry.crown,createFoliageMaterial('#39813f',createCanopyTexture()),count)
  const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3()
  const up=new THREE.Vector3(0,1,0)
  for(let index=0;index<count;index++){
    const t=.14+(index/count)*.48
    const point=route.getPointAt(t),tangent=route.getTangentAt(t)
    const side=index%2?1:-1
    const distance=13+(Math.sin(index*13.7)*.5+.5)*18
    point.x+=-tangent.z*distance*side
    point.z+=tangent.x*distance*side
    point.y=sampleMountainHeight(point.x,point.z)
    const size=.55+(Math.sin(index*4.5)*.5+.5)*.55
    rotation.setFromAxisAngle(up,index*2.4)
    matrix.compose(point,rotation,scale.set(size,size,size))
    wood.setMatrixAt(index,matrix);leaves.setMatrixAt(index,matrix)
  }
  for(const mesh of [wood,leaves]){
    mesh.castShadow=quality==='desktop';mesh.receiveShadow=true
    mesh.computeBoundingSphere()
    group.add(mesh)
  }
  return group
}
