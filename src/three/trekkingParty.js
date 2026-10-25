import * as THREE from 'three'
import { mesh } from './primitives'
import { createHikingBackpack } from './hikingEquipment'
import { syncExpeditionPerson } from './realisticTravellers'
import { createContactShadow,createExpeditionPerson,EXPEDITION_PALETTES } from './expeditionPeople'

export const TRAILHEAD_STANDING_POSES=Object.freeze([
  Object.freeze({role:'guide',position:Object.freeze([3.2,.35,33.7]),heading:-3.04}),
  Object.freeze({role:'tourist',position:Object.freeze([1.8,.35,36.5]),heading:-2.35}),
  Object.freeze({role:'tourist',position:Object.freeze([3.2,.35,36.7]),heading:2.65}),
  Object.freeze({role:'tourist',position:Object.freeze([2.4,.35,38]),heading:-2.7}),
])

const palettes=EXPEDITION_PALETTES

const phases=[0,1.37,2.91,4.42]
const routeOffsets=[0,.055,.11,.165]
const bootBoundsScratch=new THREE.Box3()
const rootPositionScratch=new THREE.Vector3()
const lerpHeading=(from,to,weight)=>
  from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*weight

const namedMesh=(name,geometry,meshMaterial,position=[0,0,0],rotation=[0,0,0])=>{
  const object=mesh(geometry,meshMaterial,position,rotation)
  object.name=name
  return object
}

const createMember=(palette,index,materials)=>{
  const root=createExpeditionPerson(index,{bootMaterial:materials.dark})
  root.name=palette.role==='guide'?'trekking-guide':`trekking-tourist-${index}`
  const backpack=createHikingBackpack(palette)
  root.add(backpack)
  const pole=new THREE.Group()
  pole.name='walking-pole'
  pole.position.set(.32,1.02,.04)
  pole.add(
    namedMesh('walking-pole-shaft',new THREE.CylinderGeometry(.009,.013,1.12,8),materials.wood,[0,-.47,.12],[.14,0,-.08]),
    namedMesh('walking-pole-grip',new THREE.CapsuleGeometry(.022,.115,4,8),materials.dark,[0,.12,0]),
  )
  root.add(pole)
  const contactShadow=createContactShadow(.72,.86,.21)
  root.add(contactShadow)
  root.phase=phases[index]
  root.routeOffset=routeOffsets[index]
  Object.assign(root.userData,{
    phase:root.phase,
    routeOffset:root.routeOffset,
    backpack,
    pole,
    contactShadow,
  })
  return root
}

export function createTrekkingParty(materials){
  const party=new THREE.Group()
  party.name='trekking-party'
  const members=palettes.map((palette,index)=>createMember(palette,index,materials))
  members.forEach(member=>party.add(member))
  party.userData={
    members,
    phases:[...phases],
    routeOffsets:[...routeOffsets],
    standingPoses:TRAILHEAD_STANDING_POSES.map(pose=>({
      role:pose.role,
      position:[...pose.position],
      heading:pose.heading,
    })),
    departureWeight:1,
  }
  return party
}

export function updateTrekkingParty(
  party,
  curve,
  progress,
  elapsed,
  reducedMotion,
  surfaceHeightAt,
  {
    departureWeight=1,
    standingPoses=party?.userData?.standingPoses||TRAILHEAD_STANDING_POSES,
  }={},
){
  if(!party?.userData?.members||!curve) return
  const contactHeight=typeof surfaceHeightAt==='function'
    ?surfaceHeightAt
    :(x,z,point)=>point.y
  const weight=THREE.MathUtils.clamp(departureWeight,0,1)
  const partySpan=Math.max(...party.userData.members.map(member=>member.routeOffset))
  party.userData.departureWeight=weight

  party.userData.members.forEach((member,index)=>{
    const routeProgress=THREE.MathUtils.clamp(progress+partySpan-member.routeOffset,0,1)
    const routePoint=curve.getPointAt(routeProgress)
    const tangent=curve.getTangentAt(Math.min(.9999,routeProgress+.0005))
    const routeHeading=Math.atan2(tangent.x,tangent.z)
    const standing=standingPoses[index]
    const standingPoint=new THREE.Vector3(...standing.position)
    member.position.lerpVectors(standingPoint,routePoint,weight)
    const surfaceY=contactHeight(member.position.x,member.position.z,routePoint)
    // Camera framing follows the route surface, not the root compensation
    // that keeps a walking character's alternating soles on the terrain.
    member.userData.cameraGroundY=surfaceY
    member.rotation.y=lerpHeading(standing.heading,routeHeading,weight)

    const phase=elapsed*5.2+member.phase
    const swing=weight===0?0:Math.sin(phase)*.58*weight
    const counterSwing=weight===0?0:-swing
    const idle=reducedMotion?0:Math.sin(elapsed*.9+member.phase)
    const secondary=reducedMotion?0:Math.sin(phase*.5)*weight
    const [leftArm,rightArm]=member.userData.arms
    const [leftLeg,rightLeg]=member.userData.legs
    leftArm.rotation.x=swing*.72
    rightArm.rotation.x=counterSwing*.72
    leftLeg.rotation.x=counterSwing
    rightLeg.rotation.x=swing
    member.userData.elbows.forEach((elbow,armIndex)=>{
      elbow.rotation.x=-.16-Math.max(0,armIndex?swing:counterSwing)*.24
    })
    member.userData.knees.forEach((knee,legIndex)=>{
      knee.rotation.x=.035+Math.max(0,legIndex?counterSwing:swing)*.56
    })
    member.userData.pole.rotation.x=counterSwing*.34
    member.userData.torso.rotation.z=secondary*.018+idle*.006*(1-weight)
    member.userData.torso.rotation.x=
      reducedMotion?0:Math.abs(Math.sin(phase))*.018*weight
    member.userData.backpack.rotation.z=reducedMotion?0:secondary*-.012

    member.position.y=surfaceY
    syncExpeditionPerson(member)
    member.updateWorldMatrix(true,true)
    const rootY=member.getWorldPosition(rootPositionScratch).y
    bootBoundsScratch.makeEmpty()
    member.userData.bootMeshes.forEach(boot=>bootBoundsScratch.expandByObject(boot))
    const bootBottomOffset=bootBoundsScratch.min.y-rootY
    member.userData.bootBottomOffset=bootBottomOffset
    member.position.y=surfaceY-bootBottomOffset
    member.userData.contactShadow.position.y=bootBottomOffset+.014
  })
}
