import * as THREE from 'three'
import { createRealisticTraveller,syncExpeditionPerson } from './realisticTravellers'
import { EXPEDITION_PALETTES } from './expeditionPeople'
import { smootherstep } from './terrain'

const hash=(index,salt)=>{
  const value=Math.sin(index*127.1+salt*311.7)*43758.5453
  return value-Math.floor(value)
}
const shirts=['#75808a','#9a907e','#6b7c68','#a1a59a','#82736a','#6d7d80']
const trousers=['#474b49','#4e5056','#615b4f']
const ambientPositions=[141,163,178,203,222,239]

/** Reuse the already-loaded anatomical traveller, including photographic skin,
 * clothes, shoes and a separate skeleton. No primitive substitute is shown if
 * that optional asset failed to load. Buffer and texture ownership stays with
 * the existing traveller cache; per-person materials follow scene disposal. */
export function createCityCrowd(quality='desktop',factory=createRealisticTraveller){
  const group=new THREE.Group()
  group.name='city-workers-and-travellers'
  const people=Array.from({length:quality==='mobile'?6:10},(_,index)=>{
    const boarding=index<4
    const palette=boarding?EXPEDITION_PALETTES[index]:{
      role:'commuter',jacket:shirts[(index-4)%shirts.length],
      trousers:trousers[index%trousers.length],hair:['#282620','#493b2c','#35322e'][index%3],
    }
    const actor=factory(index,{palette,seated:false})
    const height=.93+hash(index,37)*.11
    if(actor){
      actor.name=boarding?`city-boarding-traveller-${index+1}`:`city-pedestrian-${index-3}`
      actor.scale.set(height*(.97+hash(index,28)*.06),height,height)
      actor.traverse(object=>{
        if(!object.isMesh) return
        object.castShadow=quality==='desktop'&&boarding
        object.receiveShadow=true
      })
      group.add(actor)
    }
    return{index,boarding,actor,height,
      x:boarding?-.4+(index%2)*1.1:index%2?-16.9:.4,
      z:boarding?149.4+index*1.9:ambientPositions[index-4],
      direction:index%2?-1:1,pace:.65+hash(index,31)*.22,
      position:new THREE.Vector3(),boarded:false,bootBottomOffset:0,
    }
  })
  return{group,people,previousTime:-1,previousBoarding:-1,
    bootBounds:new THREE.Box3(),rootPosition:new THREE.Vector3()}
}

export function updateCityCrowd(crowd,elapsed=0,reducedMotion=false,boarding=0){
  // Slow walking tolerates 30 Hz pose updates while keeping the main scene at
  // its normal refresh rate. Scroll-driven boarding always updates immediately.
  const time=reducedMotion?0:Math.floor(Math.max(0,elapsed)*30)/30
  if(time===crowd.previousTime&&boarding===crowd.previousBoarding) return
  crowd.previousTime=time
  crowd.previousBoarding=boarding
  crowd.people.forEach(person=>{
    const {index,actor}=person
    let x=person.x,z=person.z,y=.51,heading=person.direction>0?0:Math.PI,walk=1,visible=true
    if(person.boarding){
      const progress=smootherstep(index*.12,.64+index*.12,boarding)
      x=THREE.MathUtils.lerp(person.x,-3.55,progress)
      z=THREE.MathUtils.lerp(person.z,146.2,progress)
      y=.51+smootherstep(.69,.98,progress)*.57
      heading=Math.atan2(-3.55-person.x,146.2-person.z)
      walk=progress>0&&progress<1?1:0
      visible=progress<.995
      person.boarded=!visible
    }else z=130+((person.z-130+time*person.pace*person.direction)%118+118)%118
    person.position.set(x,y,z)
    if(!actor) return
    actor.visible=visible
    actor.position.copy(person.position)
    actor.rotation.y=heading
    if(!visible) return
    const phase=time*(3.6+person.pace)+index*1.37
    const stride=reducedMotion?0:Math.sin(phase)*.34*walk
    const {arms,legs,elbows,knees,torso,head,bootMeshes}=actor.userData
    arms[0].rotation.x=stride*.65
    arms[1].rotation.x=-stride*.65
    legs[0].rotation.x=-stride
    legs[1].rotation.x=stride
    elbows.forEach((elbow,side)=>{elbow.rotation.x=-.16-Math.max(0,side?-stride:stride)*.18})
    knees.forEach((knee,side)=>{knee.rotation.x=.035+Math.max(0,side?-stride:stride)*.5})
    torso.rotation.z=reducedMotion?0:Math.sin(phase*.5)*.009*walk
    head.rotation.y=reducedMotion?0:Math.sin(time*.37+index)*.045
    syncExpeditionPerson(actor)
    actor.updateWorldMatrix(true,true)
    const rootY=actor.getWorldPosition(crowd.rootPosition).y
    crowd.bootBounds.makeEmpty()
    bootMeshes.forEach(boot=>crowd.bootBounds.expandByObject(boot))
    person.bootBottomOffset=crowd.bootBounds.min.y-rootY
    actor.position.y=y-person.bootBottomOffset
  })
}
