import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { mesh } from './primitives'
import { createRealisticTraveller } from './realisticTravellers'

export { syncExpeditionPerson } from './realisticTravellers'

export const EXPEDITION_PALETTES=[
  {role:'guide',jacket:'#59634c',jacketLayer:'#727b60',trousers:'#353b34',pack:'#9b784b',mat:'#66503c',skin:'#9a6549',hair:'#29241e'},
  {role:'tourist',jacket:'#394b5d',jacketLayer:'#576777',trousers:'#303740',pack:'#b39961',mat:'#875d47',skin:'#b67855',hair:'#493126'},
  {role:'tourist',jacket:'#875c48',jacketLayer:'#a47760',trousers:'#363a3b',pack:'#4b514e',mat:'#b19a70',skin:'#87543f',hair:'#211c1b'},
  {role:'tourist',jacket:'#516e67',jacketLayer:'#70887c',trousers:'#746854',pack:'#a18d6d',mat:'#405c59',skin:'#c28560',hair:'#392820'},
]

const material=(color,roughness=.86)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0})
const namedMesh=(name,geometry,mat,position=[0,0,0],rotation=[0,0,0])=>{
  const result=mesh(geometry,mat,position,rotation)
  result.name=name
  return result
}

const combine=geometries=>{
  const parts=geometries.map(geometry=>{
    const part=geometry.index?geometry.toNonIndexed():geometry
    if(part!==geometry) geometry.dispose()
    return part
  })
  const result=mergeGeometries(parts)
  parts.forEach(part=>part.dispose())
  return result
}

const ellipsoid=(x,y,z,position)=>
  new THREE.SphereGeometry(1,14,10).scale(x,y,z).translate(...position)

export function createHumanHead(palette,index=0){
  const group=new THREE.Group()
  group.name='anatomical-head'
  // A defined chin, jaw, cheekbones and narrow cranium replace the sphere head.
  const profile=[
    [0,0],[.038,.005],[.061,.025],[.079,.06],[.089,.105],
    [.091,.155],[.087,.205],[.066,.24],[.035,.258],[0,.263],
  ].map(([radius,y])=>new THREE.Vector2(radius,y))
  const skull=new THREE.LatheGeometry(profile,20).scale(1,.98,1.02)
  const skin=material(palette.skin,.69)
  const headGeometry=combine([
    skull,
    ellipsoid(.021,.039,.026,[0,.122,.085]),
    ellipsoid(.024,.014,.022,[0,.101,.104]),
    ellipsoid(.019,.032,.014,[-.089,.123,0]),
    ellipsoid(.019,.032,.014,[.089,.123,0]),
  ])
  const head=namedMesh('head',headGeometry,skin)
  group.add(head)
  const hairGeometry=new THREE.SphereGeometry(1,18,12,0,Math.PI*2,0,Math.PI*.58)
    .scale(.093,.092,.099).translate(0,.181,-.012)
  const positions=hairGeometry.attributes.position
  for(let vertex=0;vertex<positions.count;vertex++){
    const x=positions.getX(vertex),y=positions.getY(vertex),z=positions.getZ(vertex)
    positions.setY(vertex,y+.0025*Math.sin(x*79+index)*Math.cos(z*83))
  }
  hairGeometry.computeVertexNormals()
  group.add(namedMesh('hair',hairGeometry,material(palette.hair,.98)))
  const features=combine([
    ellipsoid(.008,.0045,.0035,[-.034,.151,.083]),
    ellipsoid(.008,.0045,.0035,[.034,.151,.083]),
    ellipsoid(.019,.003,.003,[-.034,.165,.083]),
    ellipsoid(.019,.003,.003,[.034,.165,.083]),
  ])
  group.add(namedMesh('eyes-and-brows',features,material(palette.hair,.85)))
  group.add(namedMesh('lips',ellipsoid(.023,.0035,.0035,[0,.071,.076]),material('#785344',.8)))
  group.userData={adultProportions:true,headHeight:.263,identity:index}
  return group
}

const createArm=(side,jacket,skin,shoulderY,seated)=>{
  const arm=new THREE.Group()
  arm.name=side<0?'left-arm':'right-arm'
  arm.position.set(side*.215,shoulderY,0)
  arm.rotation.z=side*.065
  const sleeve=namedMesh('jacket-sleeve',new THREE.CapsuleGeometry(.061,.2,5,12),jacket,[0,-.14,0])
  sleeve.scale.z=.9
  const elbow=new THREE.Group()
  elbow.name=side<0?'left-elbow':'right-elbow'
  elbow.position.set(0,-.285,0)
  elbow.rotation.x=seated?-1.2:-.16
  elbow.add(
    namedMesh('jacket-forearm',new THREE.CapsuleGeometry(.047,.19,5,12),jacket,[0,-.12,0]),
    namedMesh('hand',ellipsoid(.034,.065,.023,[0,-.285,.008]),skin),
  )
  arm.add(sleeve,elbow)
  arm.userData.elbow=elbow
  return arm
}

const createLeg=(side,trousers,bootMaterial,hipY,seated)=>{
  const leg=new THREE.Group()
  leg.name=side<0?'left-leg':'right-leg'
  leg.position.set(side*.105,hipY,0)
  leg.rotation.x=seated?-1.48:0
  const thigh=namedMesh('trouser-leg',new THREE.CapsuleGeometry(.077,.255,5,12),trousers,[0,-.19,0])
  thigh.scale.z=.92
  const knee=new THREE.Group()
  knee.name=side<0?'left-knee':'right-knee'
  knee.position.set(0,-.385,0)
  knee.rotation.x=seated?1.48:.035
  knee.add(namedMesh('trouser-calf',new THREE.CapsuleGeometry(.058,.265,5,12),trousers,[0,-.17,0]))
  const boot=namedMesh('boot',new THREE.CapsuleGeometry(.061,.13,5,12),bootMaterial,[0,-.365,.045],[Math.PI/2,0,0])
  boot.scale.set(1,1.17,.88)
  const sole=namedMesh('boot-sole',new THREE.BoxGeometry(.124,.025,.252),material('#2c2925',.99),[0,-.413,.045])
  boot.add(namedMesh('boot-laces',combine([
    new THREE.BoxGeometry(.073,.008,.007).translate(0,.01,.058),
    new THREE.BoxGeometry(.073,.008,.007).translate(0,.045,.058),
    new THREE.BoxGeometry(.073,.008,.007).translate(0,.08,.058),
  ]),material('#877e6d',.98)))
  knee.add(boot,sole)
  leg.add(thigh,knee)
  leg.userData={knee,sole}
  return{leg,boot,sole}
}

export function createExpeditionPerson(index=0,{seated=false,bootMaterial}={}){
  const palette=EXPEDITION_PALETTES[index%EXPEDITION_PALETTES.length]
  const realistic=createRealisticTraveller(index,{palette,seated})
  if(realistic) return realistic
  const root=new THREE.Group()
  root.name='expedition-traveller'
  const jacket=material(palette.jacket),trim=material(palette.jacketLayer),skin=material(palette.skin,.69)
  const trouserMaterial=material(palette.trousers,.96)
  const shoes=bootMaterial||material('#342f29',.91)
  const hipY=seated?.035:.87
  const torso=new THREE.Group()
  torso.name='torso'
  torso.position.y=hipY+.015
  const torsoProfile=[[0,0],[.15,0],[.158,.08],[.177,.27],[.21,.44],[.196,.49],[.076,.55],[0,.55]]
    .map(([radius,y])=>new THREE.Vector2(radius,y))
  const torsoGeometry=new THREE.LatheGeometry(torsoProfile,20).scale(1,1,.64)
  torso.add(namedMesh('layered-torso-shell',torsoGeometry,jacket))
  const jacketDetails=combine([
    new THREE.BoxGeometry(.009,.44,.009).translate(0,.25,.114),
    new THREE.BoxGeometry(.082,.012,.012).translate(-.1,.32,.108),
    new THREE.BoxGeometry(.082,.012,.012).translate(.1,.32,.108),
  ])
  torso.add(namedMesh('layered-torso-panel',jacketDetails,trim))
  torso.add(namedMesh('jacket-collar',new THREE.TorusGeometry(.079,.014,6,16,Math.PI*1.6),trim,[0,.535,.01],[Math.PI/2,0,-Math.PI*.3]))
  root.add(torso)
  const trousers=new THREE.Group()
  trousers.name='trousers'
  trousers.position.y=hipY
  const waist=namedMesh('trouser-waist',new THREE.CapsuleGeometry(.145,.075,5,14),trouserMaterial,[0,0,0],[0,0,Math.PI/2])
  waist.scale.set(1,.72,.75)
  trousers.add(waist)
  root.add(trousers,namedMesh('neck',new THREE.CylinderGeometry(.045,.055,.11,12),skin,[0,hipY+.615,0]))
  const head=createHumanHead(palette,index)
  head.position.set(0,hipY+.66,.008)
  root.add(head)
  const arms=new THREE.Group()
  arms.name='arms'
  const leftArm=createArm(-1,jacket,skin,hipY+.49,seated)
  const rightArm=createArm(1,jacket,skin,hipY+.49,seated)
  arms.add(leftArm,rightArm)
  root.add(arms)
  const legs=new THREE.Group()
  legs.name='legs'
  const left=createLeg(-1,trouserMaterial,shoes,hipY,seated)
  const right=createLeg(1,trouserMaterial,shoes,hipY,seated)
  legs.add(left.leg,right.leg)
  root.add(legs)
  const boots=new THREE.Group()
  boots.name='boots'
  boots.userData.parts=[left.boot,right.boot,left.sole,right.sole]
  root.add(boots)
  root.role=palette.role
  root.userData={role:palette.role,identity:index,adultProportions:true,seated,torso,
    arms:[leftArm,rightArm],legs:[left.leg,right.leg],
    elbows:[leftArm.userData.elbow,rightArm.userData.elbow],knees:[left.leg.userData.knee,right.leg.userData.knee],
    bootMeshes:boots.userData.parts,head,
  }
  return root
}

export function createContactShadow(width,length,opacity=.2){
  const mat=new THREE.MeshBasicMaterial({color:'#24281f',transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1})
  mat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 vContactUv;\n'+shader.vertexShader
    shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvContactUv=uv;')
    shader.fragmentShader='varying vec2 vContactUv;\n'+shader.fragmentShader
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=1.0-smoothstep(0.05,0.5,length((vContactUv-0.5)*vec2(1.0,1.0)));')
  }
  mat.customProgramCacheKey=()=> 'expedition-contact-shadow'
  const shadow=namedMesh('ground-contact-shadow',new THREE.PlaneGeometry(width,length),mat,[0,.012,0],[-Math.PI/2,0,0])
  shadow.castShadow=false
  shadow.receiveShadow=false
  return shadow
}
