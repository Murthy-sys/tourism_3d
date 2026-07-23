import * as THREE from 'three'
import { mesh } from './primitives'

const material=(color,roughness=.78)=>new THREE.MeshStandardMaterial({
  color,
  roughness,
  metalness:.015,
})

const palettes=[
  {
    role:'guide',
    jacket:'#49643f',
    jacketLayer:'#6f8051',
    trousers:'#343c36',
    pack:'#b67d2e',
    mat:'#7a4c27',
    skin:'#9a6549',
    hair:'#29241e',
  },
  {
    role:'tourist',
    jacket:'#263d5c',
    jacketLayer:'#385576',
    trousers:'#29313a',
    pack:'#d8aa37',
    mat:'#b75b38',
    skin:'#b67855',
    hair:'#493126',
  },
  {
    role:'tourist',
    jacket:'#9a4c32',
    jacketLayer:'#b76745',
    trousers:'#33363a',
    pack:'#40454b',
    mat:'#c59a52',
    skin:'#87543f',
    hair:'#211c1b',
  },
  {
    role:'tourist',
    jacket:'#26706d',
    jacketLayer:'#3c8882',
    trousers:'#77684f',
    pack:'#b99462',
    mat:'#33595a',
    skin:'#c28560',
    hair:'#392820',
  },
]

const phases=[0,1.37,2.91,4.42]
const routeOffsets=[0,.055,.11,.165]

const namedMesh=(name,geometry,meshMaterial,position=[0,0,0],rotation=[0,0,0])=>{
  const object=mesh(geometry,meshMaterial,position,rotation)
  object.name=name
  return object
}

const createArm=(side,jacket,skin)=>{
  const arm=new THREE.Group()
  arm.name=side<0?'left-arm':'right-arm'
  arm.position.set(side*.24,1.23,0)
  arm.add(
    namedMesh(
      'jacket-sleeve',
      new THREE.CapsuleGeometry(.055,.44,5,9),
      jacket,
      [0,-.24,0],
    ),
    namedMesh(
      'hand',
      new THREE.SphereGeometry(.065,10,8),
      skin,
      [0,-.51,0],
    ),
  )
  return arm
}

const createLeg=(side,trouserMaterial,bootMaterial)=>{
  const leg=new THREE.Group()
  leg.name=side<0?'left-leg':'right-leg'
  leg.position.set(side*.115,.71,0)
  leg.add(namedMesh(
    'trouser-leg',
    new THREE.CapsuleGeometry(.07,.48,5,9),
    trouserMaterial,
    [0,-.26,0],
  ))
  const boot=namedMesh(
    'boot',
    new THREE.CapsuleGeometry(.075,.18,5,9),
    bootMaterial,
    [0,-.57,.045],
    [Math.PI/2,0,0],
  )
  boot.scale.set(1,1,1.24)
  leg.add(boot)
  return {leg,boot}
}

const createBackpack=(palette)=>{
  const packMaterial=material(palette.pack,.84)
  const darkPack=packMaterial.clone()
  darkPack.color.multiplyScalar(.72)
  const backpack=new THREE.Group()
  backpack.name='backpack'
  backpack.position.set(0,1.04,-.2)
  const bag=namedMesh(
    'backpack-bag',
    new THREE.CapsuleGeometry(.225,.46,8,14),
    packMaterial,
    [0,.08,-.09],
    [0,0,Math.PI/2],
  )
  bag.scale.set(1.06,.9,.58)
  backpack.add(
    bag,
    namedMesh(
      'backpack-pocket',
      new THREE.BoxGeometry(.3,.26,.09),
      darkPack,
      [0,-.04,-.31],
    ),
  )

  const straps=new THREE.Group()
  straps.name='straps'
  ;[-1,1].forEach(side=>{
    const strap=namedMesh(
      'backpack-strap',
      new THREE.CapsuleGeometry(.018,.53,4,7),
      darkPack,
      [side*.15,.1,.12],
    )
    strap.rotation.x=-.12
    straps.add(strap)
  })
  backpack.add(straps)

  const rollMat=new THREE.Group()
  rollMat.name='roll-mat'
  rollMat.position.set(0,-.29,-.08)
  rollMat.add(
    namedMesh(
      'roll-mat-cylinder',
      new THREE.CylinderGeometry(.095,.095,.5,14),
      material(palette.mat,.88),
      [0,0,0],
      [0,0,Math.PI/2],
    ),
    namedMesh(
      'roll-mat-tie',
      new THREE.TorusGeometry(.1,.012,6,12),
      darkPack,
      [-.14,0,0],
      [0,Math.PI/2,0],
    ),
    namedMesh(
      'roll-mat-tie',
      new THREE.TorusGeometry(.1,.012,6,12),
      darkPack,
      [.14,0,0],
      [0,Math.PI/2,0],
    ),
  )
  backpack.add(rollMat)
  return backpack
}

const createMember=(palette,index)=>{
  const root=new THREE.Group()
  root.name=palette.role==='guide'?'trekking-guide':`trekking-tourist-${index}`
  const jacket=material(palette.jacket,.79)
  const jacketLayer=material(palette.jacketLayer,.75)
  const trousersMaterial=material(palette.trousers,.9)
  const skin=material(palette.skin,.74)
  const hairMaterial=material(palette.hair,.93)
  const bootMaterial=material('#2b2926',.96)

  const torso=new THREE.Group()
  torso.name='torso'
  torso.position.set(0,.82,0)
  const torsoShell=namedMesh(
    'layered-torso-shell',
    new THREE.CapsuleGeometry(.205,.48,7,12),
    jacket,
    [0,.27,0],
  )
  torsoShell.scale.set(1,.98,.72)
  const jacketPanel=namedMesh(
    'layered-torso-panel',
    new THREE.BoxGeometry(.29,.45,.035),
    jacketLayer,
    [0,.28,.165],
  )
  jacketPanel.scale.set(.72,1,1)
  const collar=namedMesh(
    'jacket-collar',
    new THREE.TorusGeometry(.105,.027,7,14,Math.PI*1.35),
    jacketLayer,
    [0,.56,.04],
    [Math.PI/2,0,-Math.PI*.17],
  )
  torso.add(torsoShell,jacketPanel,collar)
  root.add(torso)

  const trousers=new THREE.Group()
  trousers.name='trousers'
  trousers.position.set(0,.75,0)
  trousers.add(namedMesh(
    'trouser-waist',
    new THREE.BoxGeometry(.34,.21,.25),
    trousersMaterial,
    [0,0,0],
  ))
  root.add(trousers)

  const neck=namedMesh(
    'neck',
    new THREE.CylinderGeometry(.07,.08,.14,10),
    skin,
    [0,1.47,0],
  )
  const head=namedMesh(
    'head',
    new THREE.SphereGeometry(.17,16,12),
    skin,
    [0,1.67,0],
  )
  head.scale.set(.9,1.07,.92)
  const hair=namedMesh(
    'hair',
    new THREE.SphereGeometry(.176,16,10,0,Math.PI*2,0,Math.PI*.56),
    hairMaterial,
    [0,1.735,-.004],
  )
  if(index===0){
    hair.scale.set(1.03,.72,1.04)
  }else if(index===2){
    hair.scale.set(.94,.58,1.03)
  }
  root.add(neck,head,hair)

  const arms=new THREE.Group()
  arms.name='arms'
  const leftArm=createArm(-1,jacket,skin)
  const rightArm=createArm(1,jacket,skin)
  arms.add(leftArm,rightArm)
  root.add(arms)

  const legs=new THREE.Group()
  legs.name='legs'
  const left=createLeg(-1,trousersMaterial,bootMaterial)
  const right=createLeg(1,trousersMaterial,bootMaterial)
  legs.add(left.leg,right.leg)
  root.add(legs)

  const boots=new THREE.Group()
  boots.name='boots'
  boots.userData.parts=[left.boot,right.boot]
  root.add(boots)

  const backpack=createBackpack(palette)
  root.add(backpack)

  const pole=new THREE.Group()
  pole.name='walking-pole'
  pole.position.set(.36,1.02,.04)
  pole.add(
    namedMesh(
      'walking-pole-shaft',
      new THREE.CylinderGeometry(.012,.018,1.32,7),
      material('#786347',.68),
      [0,-.5,.12],
      [.14,0,-.08],
    ),
    namedMesh(
      'walking-pole-grip',
      new THREE.CapsuleGeometry(.025,.15,4,7),
      material('#2f322f',.86),
      [0,.16,0],
    ),
  )
  root.add(pole)

  root.role=palette.role
  root.phase=phases[index]
  root.routeOffset=routeOffsets[index]
  root.userData={
    role:root.role,
    phase:root.phase,
    routeOffset:root.routeOffset,
    torso,
    arms:[leftArm,rightArm],
    legs:[left.leg,right.leg],
    backpack,
    pole,
  }
  return root
}

export function createTrekkingParty(materials){
  const party=new THREE.Group()
  party.name='trekking-party'
  const members=palettes.map((palette,index)=>createMember(palette,index,materials))
  members.forEach(member=>party.add(member))
  party.userData={members,phases:[...phases],routeOffsets:[...routeOffsets]}
  return party
}

export function updateTrekkingParty(party,curve,progress,elapsed,reducedMotion,heightAt){
  if(!party?.userData?.members||!curve) return
  const terrainHeight=typeof heightAt==='function'
    ?heightAt
    :(x,z,point)=>point.y
  party.userData.members.forEach(member=>{
    const routeProgress=THREE.MathUtils.clamp(progress-member.routeOffset,0,1)
    const point=curve.getPointAt(routeProgress)
    const tangent=curve.getTangentAt(Math.min(.9999,routeProgress+.0005))
    member.position.set(point.x,terrainHeight(point.x,point.z,point),point.z)
    member.rotation.y=Math.atan2(tangent.x,tangent.z)

    const phase=elapsed*5.2+member.phase
    const swing=reducedMotion?0:Math.sin(phase)*.58
    const secondary=reducedMotion?0:Math.sin(phase*.5)
    const [leftArm,rightArm]=member.userData.arms
    const [leftLeg,rightLeg]=member.userData.legs
    leftArm.rotation.x=swing*.72
    rightArm.rotation.x=-swing*.72
    leftLeg.rotation.x=-swing
    rightLeg.rotation.x=swing
    member.userData.pole.rotation.x=-swing*.34
    member.userData.torso.rotation.z=secondary*.018
    member.userData.torso.rotation.x=reducedMotion?0:Math.abs(Math.sin(phase))*.018
    member.userData.backpack.rotation.z=secondary*-.012
  })
}
