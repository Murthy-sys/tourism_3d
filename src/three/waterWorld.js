import * as THREE from 'three'
import { createTree,mesh } from './primitives'

const named=name=>{const group=new THREE.Group();group.name=name;return group}
const START_Z=18,END_Z=-18,BANK_SECTIONS=12
const centerAt=t=>-3*(1-t)+Math.sin(t*Math.PI)*.7
const widthAt=t=>12-(7*t)
const innerEdge=(side,t)=>centerAt(t)+(side*widthAt(t)/2)

function createStripGeometry(side,waterOffset=0){
  const positions=[],indices=[]
  for(let index=0;index<=BANK_SECTIONS;index++){
    const t=index/BANK_SECTIONS,z=THREE.MathUtils.lerp(START_Z,END_Z,t),inner=innerEdge(side,t)
    const outer=waterOffset?inner-(side*waterOffset):side*26
    positions.push(inner,0,z,outer,0,z)
  }
  for(let index=0;index<BANK_SECTIONS;index++){
    const current=index*2,next=current+2
    if(waterOffset?side>0:side<0)indices.push(current,next,current+1,next,next+1,current+1)
    else indices.push(current,current+1,next,current+1,next+1,next)
  }
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals()
  return geometry
}

function createLanding(name,position,materials,width,lateralOffset){
  const landing=named(name);landing.position.copy(position);landing.position.x+=lateralOffset
  for(let plank=0;plank<8;plank++)landing.add(mesh(new THREE.BoxGeometry(width,.16,.42),materials.wood,[0,.12,(plank-3.5)*.43]))
  ;[-1,1].forEach(side=>[-1.15,1.15].forEach(z=>landing.add(mesh(new THREE.CylinderGeometry(.08,.11,1.1,8),materials.wood,[side*(width/2-.25),-.28,z]))))
  return landing
}

function createReflectionGeometry(){
  const geometry=new THREE.PlaneGeometry(52,40,32,24),positions=geometry.getAttribute('position')
  for(let index=0;index<positions.count;index++)positions.setZ(index,Math.sin(positions.getX(index)*.45+positions.getY(index)*.32)*.012)
  positions.needsUpdate=true;geometry.computeVertexNormals();return geometry
}

function createForestHandoffBankDetail(materials,landing,quality){
  const detail=named('forest-handoff-bank-detail')
  const count=quality==='mobile'?22:36
  for(let index=0;index<count;index++){
    const type=['tree','shrub','reed','rock'][index%4],side=index%2?-1:1
    const x=landing.position.x+side*(2.8+(index%5)*.72)
    const z=landing.position.z-6+(index*2.37)%11
    let object
    if(type==='tree')object=createTree(materials,x,z,.52+(index%3)*.12)
    else if(type==='shrub'){
      object=named(`forest-bank-shrub-${index}`);object.position.set(x,0,z)
      object.add(mesh(new THREE.IcosahedronGeometry(.48,1),index%3===0?materials.leaf2:materials.leaf,[-.3,.35,0]),mesh(new THREE.IcosahedronGeometry(.58,1),materials.leaf,[.25,.42,.08]),mesh(new THREE.IcosahedronGeometry(.35,1),materials.leaf2,[0,.72,-.08]))
    }else if(type==='reed'){
      object=named(`forest-bank-reeds-${index}`);object.position.set(x,0,z)
      for(let reed=0;reed<5;reed++){const height=.65+(reed%3)*.2;object.add(mesh(new THREE.CylinderGeometry(.016,.026,height,5),materials.reed,[(reed-2)*.09,height/2,(reed%2)*.08]))}
    }else{
      object=mesh(new THREE.DodecahedronGeometry(.28+(index%3)*.1,1),materials.wetRock,[x,.13,z]);object.name=`forest-bank-rock-${index}`;object.scale.set(1.25,.48,.85)
    }
    object.userData.detailType=type;detail.add(object)
  }
  return detail
}

export function createWaterWorld(m,quality='desktop'){
  const world=named('water-world')
  const local=Object.fromEntries(['wood','leaf'].map(key=>[key,m[key].clone()]))
  const materials={
    ...local,
    bank:new THREE.MeshStandardMaterial({color:'#617044',roughness:.94,metalness:.01}),
    shallows:new THREE.MeshStandardMaterial({color:'#79c2bd',roughness:.26,metalness:.08,transparent:true,opacity:.38,depthWrite:false}),
    wetRock:new THREE.MeshStandardMaterial({color:'#49575a',roughness:.38,metalness:.14}),
    reed:new THREE.MeshStandardMaterial({color:'#748c55',roughness:.86,metalness:0}),
    wetBank:new THREE.MeshStandardMaterial({color:'#394839',roughness:.97}),
  }
  const waterMat=new THREE.MeshStandardMaterial({color:'#317c8d',roughness:.3,metalness:.1,transparent:true,opacity:.9})
  const water=mesh(new THREE.PlaneGeometry(52,40,32,32),waterMat,[0,.01,0],[-Math.PI/2,0,0]);water.name='reflective-water';world.add(water)

  const reflectionMat=new THREE.MeshStandardMaterial({color:'#bce4df',roughness:.16,metalness:.18,transparent:true,opacity:.16,depthWrite:false})
  const reflection=mesh(createReflectionGeometry(),reflectionMat,[0,.04,0],[-Math.PI/2,0,0]);reflection.name='water-reflection-layer';reflection.renderOrder=1;world.add(reflection)

  const banks=named('river-banks')
  const leftBank=mesh(createStripGeometry(-1),materials.bank,[0,.09,0]);leftBank.name='left-river-bank'
  const rightBank=mesh(createStripGeometry(1),materials.bank,[0,.09,0]);rightBank.name='right-river-bank'
  banks.add(leftBank,rightBank);world.add(banks)

  const wetBankShelves=named('wet-bank-shelves')
  const leftShelf=mesh(createStripGeometry(-1,.72),materials.wetBank,[0,.072,0]);leftShelf.name='left-wet-bank-shelf'
  const rightShelf=mesh(createStripGeometry(1,.72),materials.wetBank,[0,.072,0]);rightShelf.name='right-wet-bank-shelf'
  wetBankShelves.add(leftShelf,rightShelf);world.add(wetBankShelves)

  const shallows=named('water-shallows')
  const leftShallows=mesh(createStripGeometry(-1,1.35),materials.shallows,[0,.062,0]);leftShallows.name='left-water-shallows'
  const rightShallows=mesh(createStripGeometry(1,1.35),materials.shallows,[0,.062,0]);rightShallows.name='right-water-shallows'
  shallows.add(leftShallows,rightShallows);world.add(shallows)

  const route=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-3,.1,16),new THREE.Vector3(-2.4,.1,9),new THREE.Vector3(-.7,.1,2),new THREE.Vector3(.45,.1,-7),new THREE.Vector3(0,.1,-16),
  ])
  const forestLanding=createLanding('forest-water-landing',route.getPoint(0),local,4.8,-4)
  const hillLanding=createLanding('hill-water-landing',route.getPoint(1),local,3.7,3.3)
  const forestBankDetail=createForestHandoffBankDetail({...local,...materials},forestLanding,quality)
  world.add(forestLanding,hillLanding,forestBankDetail)

  const shore=named('water-shoreline'),treeCount=quality==='mobile'?10:24
  for(let index=0;index<treeCount;index++){
    const side=index%2?-1:1,t=Math.sqrt((index+.5)/treeCount),z=THREE.MathUtils.lerp(START_Z,END_Z,t)
    const x=innerEdge(side,t)+side*(2.4+(index%3)*1.2)
    shore.add(createTree(local,x,z,.62+(index%4)*.09))
  }
  world.add(shore)

  const jetty=named('boat-jetty');jetty.position.set(-7,.3,-12)
  for(let index=0;index<8;index++)jetty.add(mesh(new THREE.BoxGeometry(1.3,.16,2.2),local.wood,[index*.9,0,0]))
  ;[-1,1].forEach(z=>{for(let index=0;index<5;index++)jetty.add(mesh(new THREE.CylinderGeometry(.05,.07,1.7,8),local.wood,[index*1.7,.65,z*.9]))});world.add(jetty)

  const rocks=named('water-rocks'),rockCount=quality==='mobile'?7:16
  for(let index=0;index<rockCount;index++){
    const t=(index+.5)/rockCount,side=index%2?-1:1,z=THREE.MathUtils.lerp(START_Z,END_Z,t)
    const rock=mesh(new THREE.DodecahedronGeometry(.42+(index%4)*.19,1),materials.wetRock,[innerEdge(side,t)+side*(.7+(index%3)*.45),.2,z])
    rock.scale.y=.58;rocks.add(rock)
  }
  world.add(rocks)

  const reeds=named('water-reeds'),reedCount=quality==='mobile'?12:30
  for(let index=0;index<reedCount;index++){
    const t=(index+.35)/reedCount,side=index%2?-1:1,z=THREE.MathUtils.lerp(START_Z,END_Z,t)
    reeds.add(mesh(new THREE.CylinderGeometry(.018,.025,.9+(index%3)*.18,5),materials.reed,[innerEdge(side,t)+side*(.28+(index%4)*.16),.45,z]))
  }
  world.add(reeds)

  const wake=named('boat-wake'),wakeMat=new THREE.MeshBasicMaterial({color:'#d8f4ed',transparent:true,opacity:.38,depthWrite:false})
  ;[-1,1].forEach(x=>wake.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(x*.8,0,2),new THREE.Vector3(x*1.8,0,5)]),30,.035,5,false),wakeMat)))
  world.add(wake)
  world.userData={route,water,reflection,wake,forestLanding,hillLanding,copyAnchor:new THREE.Vector3(-7,2,-12)}
  const sun=new THREE.DirectionalLight('#ffd399',3.2);sun.position.set(-8,12,6);world.add(sun)
  return world
}

export function updateWaterWorld(world,elapsed,boat){
  const {water,reflection,wake}=world.userData
  water.position.y=.02+Math.sin(elapsed*1.4)*.018
  if(reflection)reflection.position.y=.04+Math.sin(elapsed*.9+.6)*.006
  if(boat&&wake){wake.position.copy(boat.position);wake.rotation.y=boat.rotation.y}
}
