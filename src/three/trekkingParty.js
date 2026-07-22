import * as THREE from 'three'

const PHASES=[0,1.37,2.91,4.42]
const OFFSETS=[0,.055,.11,.165]

const PALETTES=[
  {jacket:'#244b3a',shirt:'#d3b66b',trousers:'#3b403d',boots:'#352a24',pack:'#bf7f25',roll:'#697d55'},
  {jacket:'#d8aa2b',shirt:'#f0cf70',trousers:'#263754',boots:'#342c29',pack:'#455a78',roll:'#a76135'},
  {jacket:'#a45135',shirt:'#d88a61',trousers:'#34393b',boots:'#302a27',pack:'#686d5c',roll:'#d2a44f'},
  {jacket:'#287d76',shirt:'#84aaa0',trousers:'#ae8055',boots:'#40312b',pack:'#7b5341',roll:'#d2b46c'},
]

const material=(color,roughness=.82)=>new THREE.MeshStandardMaterial({color,roughness,metalness:.02})

const namedMesh=(name,geometry,meshMaterial,position=[0,0,0],rotation=[0,0,0])=>{
  const object=new THREE.Mesh(geometry,meshMaterial)
  object.name=name
  object.position.set(...position)
  object.rotation.set(...rotation)
  object.castShadow=true
  object.receiveShadow=true
  return object
}

const createArm=(side,jacket,skin)=>{
  const label=side<0?'left':'right'
  const limb=new THREE.Group()
  limb.name=`${label}-arm-pivot`
  limb.position.set(side*.235,1.39,0)
  limb.add(
    namedMesh(`${label}-upper-arm`,new THREE.CapsuleGeometry(.057,.27,10,18),jacket,[0,-.17,0]),
    namedMesh(`${label}-forearm`,new THREE.CapsuleGeometry(.05,.25,10,18),jacket,[0,-.43,.015]),
    namedMesh(`${label}-hand`,new THREE.SphereGeometry(.058,16,12),skin,[0,-.62,.025]),
  )
  return limb
}

const createLeg=(side,trousers,boots)=>{
  const label=side<0?'left':'right'
  const limb=new THREE.Group()
  limb.name=`${label}-leg-pivot`
  limb.position.set(side*.115,.82,0)
  limb.add(
    namedMesh(`${label}-thigh`,new THREE.CapsuleGeometry(.082,.31,10,18),trousers,[0,-.2,0]),
    namedMesh(`${label}-shin`,new THREE.CapsuleGeometry(.072,.3,10,18),trousers,[0,-.49,0]),
    namedMesh(`${label}-boot`,new THREE.BoxGeometry(.15,.18,.27),boots,[0,-.75,-.065]),
    namedMesh(`${label}-boot-sole`,new THREE.BoxGeometry(.16,.055,.3),boots,[0,-.85,-.07]),
  )
  return limb
}

const createPack=(id,packMaterial,rollMaterial)=>{
  const pack=new THREE.Group()
  pack.name=id==='guide'?'guide-backpack':`${id}-backpack`
  pack.position.set(0,1.2,.235)
  pack.add(
    namedMesh('backpack-body',new THREE.BoxGeometry(.48,.64,.28),packMaterial,[0,0,.08]),
    namedMesh('backpack-pocket',new THREE.BoxGeometry(.34,.22,.12),packMaterial,[0,-.16,.27]),
    namedMesh('roll-mat',new THREE.CylinderGeometry(.105,.105,.56,16),rollMaterial,[0,.39,.09],[0,0,Math.PI/2]),
  )
  return pack
}

const createPole=(wood,boots)=>{
  const pole=new THREE.Group()
  pole.name='trekking-pole'
  pole.position.set(.43,.83,-.08)
  pole.rotation.z=-.18
  pole.add(
    namedMesh('trekking-pole-shaft',new THREE.CylinderGeometry(.017,.023,1.62,12),wood),
    namedMesh('trekking-pole-grip',new THREE.CapsuleGeometry(.035,.12,8,12),boots,[0,.85,0]),
    namedMesh('trekking-pole-foot',new THREE.ConeGeometry(.038,.1,10),boots,[0,-.85,0]),
  )
  const tip=new THREE.Object3D()
  tip.name='trekking-pole-tip'
  tip.position.y=-.9
  pole.add(tip)
  pole.userData.tip=tip
  return pole
}

const createMember=(materials,index)=>{
  const role=index===0?'guide':'tourist'
  const id=role==='guide'?'guide':`tourist-${index}`
  const colors=PALETTES[index]
  const jacket=material(colors.jacket)
  const shirt=material(colors.shirt)
  const trousers=material(colors.trousers)
  const boots=material(colors.boots)
  const packMaterial=material(colors.pack)
  const rollMaterial=material(colors.roll)
  const root=new THREE.Group()
  root.name=`${id}-trekker`

  root.add(
    namedMesh('trekking-shirt',new THREE.CapsuleGeometry(.175,.48,12,24),shirt,[0,1.18,0]),
    namedMesh('trekking-jacket',new THREE.CapsuleGeometry(.19,.38,12,24),jacket,[0,1.18,-.012]),
    namedMesh('jacket-left-panel',new THREE.BoxGeometry(.082,.39,.055),jacket,[-.05,1.17,-.18]),
    namedMesh('jacket-right-panel',new THREE.BoxGeometry(.082,.39,.055),jacket,[.05,1.17,-.18]),
    namedMesh('trouser-waist',new THREE.BoxGeometry(.31,.2,.24),trousers,[0,.83,0]),
    namedMesh('trekker-head',new THREE.SphereGeometry(.175,24,16),materials.sand,[0,1.68,0]),
    namedMesh('trekker-hair',new THREE.SphereGeometry(.184,24,12,0,Math.PI*2,0,Math.PI/2),materials.dark,[0,1.75,0]),
    namedMesh('left-pack-strap',new THREE.CapsuleGeometry(.025,.48,8,14),packMaterial,[-.13,1.25,-.14],[0,0,-.08]),
    namedMesh('right-pack-strap',new THREE.CapsuleGeometry(.025,.48,8,14),packMaterial,[.13,1.25,-.14],[0,0,.08]),
  )

  const limbs=[
    createArm(-1,jacket,materials.sand),
    createArm(1,jacket,materials.sand),
    createLeg(-1,trousers,boots),
    createLeg(1,trousers,boots),
  ]
  const pack=createPack(id,packMaterial,rollMaterial)
  const pole=createPole(materials.wood,boots)
  root.add(...limbs,pack,pole)

  return {role,phase:PHASES[index],root,limbs,pole}
}

export function createTrekkingParty(materials){
  const party=new THREE.Group()
  party.name='guide-led-trekking-party'
  const members=PHASES.map((_,index)=>createMember(materials,index))
  members.forEach(member=>party.add(member.root))
  party.userData.members=members
  return party
}

export function updateTrekkingParty(party,curve,progress,elapsed,reducedMotion,heightAt){
  const routeLength=curve.getLength()
  party.userData.members.forEach((member,index)=>{
    const rawProgress=progress-OFFSETS[index]
    const routeProgress=THREE.MathUtils.clamp(rawProgress,0,1)
    const point=curve.getPointAt(routeProgress)
    const tangent=curve.getTangentAt(routeProgress).normalize()
    if(rawProgress<0)point.addScaledVector(tangent,rawProgress*routeLength)
    member.root.position.set(point.x,heightAt(point.x,point.z),point.z)
    member.root.rotation.y=Math.atan2(-tangent.x,-tangent.z)

    if(reducedMotion){
      member.limbs.forEach(limb=>{limb.rotation.x=0})
    }else{
      const swing=Math.sin(elapsed*5.2+member.phase)
      member.limbs[0].rotation.x=swing*.48
      member.limbs[1].rotation.x=-swing*.48
      member.limbs[2].rotation.x=-swing*.62
      member.limbs[3].rotation.x=swing*.62
    }

    member.pole.position.y=.83
    party.updateMatrixWorld(true)
    const tipPosition=party.worldToLocal(member.pole.userData.tip.getWorldPosition(new THREE.Vector3()))
    member.pole.position.y+=heightAt(tipPosition.x,tipPosition.z)-tipPosition.y
  })
  party.updateMatrixWorld(true)
}
