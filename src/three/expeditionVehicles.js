import * as THREE from 'three'
import { syncExpeditionPerson } from './realisticTravellers'
import { mesh } from './primitives'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createContactShadow,createExpeditionPerson } from './expeditionPeople'
import { createRealisticVehicle } from './realisticVehicles'
import { createEnvironmentMaterial } from './environmentSurface'

const material=(color,roughness=.55,metalness=.08,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra})
const routeUpdate=(object,curve,progress,y=0,orient=true)=>{const p=THREE.MathUtils.clamp(progress,0,1),point=curve.getPointAt(p),tangent=curve.getTangentAt(Math.min(.999,p+.002));object.position.copy(point);object.position.y+=y;if(orient) object.rotation.y=Math.atan2(tangent.x,tangent.z);return{p,tangent}}
const smooth01=value=>{const t=THREE.MathUtils.clamp(value,0,1);return t*t*t*(t*(t*6-15)+10)}
const BOAT_DOCK_MERGE_END=.12
const BOAT_DOCK_CLEARANCE=.04
const DIRECTION_CHANGE_DISTANCE=.025
const HEADING_MOVEMENT_DISTANCE=.002
const MAX_TURN_SPEED=Math.PI*2
const headingDifference=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from))

// Vehicle noses face local -Z. Route movement, rather than input events, owns
// their heading so damped scrolling and reversed anchor navigation agree.
const updateVehicleHeading=(object,curve,p,tangent,reducedMotion,options)=>{
  const forwardHeading=Math.atan2(-tangent.x,-tangent.z)
  if(!options){
    object.rotation.y=forwardHeading
    return
  }
  let motion=object.userData.travelMotion
  if(!motion){
    motion=object.userData.travelMotion={
      direction:1,extremum:p,lastProgress:p,headingProgress:p,
      heading:forwardHeading,targetHeading:forwardHeading,
      moving:false,turning:false,headingTime:0,
    }
    object.rotation.y=forwardHeading
    return
  }
  const distance=curve.getLength()
  const delta=Number.isFinite(options.deltaSeconds)
    ?THREE.MathUtils.clamp(options.deltaSeconds,0,.05):0
  if(options.lockHeading){
    motion.extremum=p
    motion.headingProgress=p
    motion.lastProgress=p
    motion.headingTime=0
    motion.moving=false
    motion.turning=false
    return
  }
  motion.extremum=motion.direction>0?Math.max(motion.extremum,p):Math.min(motion.extremum,p)
  if((motion.extremum-p)*motion.direction*distance>=DIRECTION_CHANGE_DISTANCE){
    motion.direction*=-1
    motion.extremum=p
  }
  motion.moving=Math.abs(p-motion.headingProgress)*distance>=HEADING_MOVEMENT_DISTANCE
  motion.headingTime=Math.abs(p-motion.lastProgress)*distance>1e-6
    ?Math.min(.05,motion.headingTime+delta):0
  if(motion.moving){
    motion.targetHeading=forwardHeading+(motion.direction<0?Math.PI:0)
    const error=headingDifference(motion.heading,motion.targetHeading)
    const maxStep=MAX_TURN_SPEED*motion.headingTime
    motion.heading+=reducedMotion?error:THREE.MathUtils.clamp(
      error*(1-Math.exp(-8*motion.headingTime)),
      -maxStep,maxStep,
    )
    object.rotation.y=motion.heading
    motion.headingProgress=p
    motion.headingTime=0
  }
  motion.lastProgress=p
  motion.turning=Math.abs(headingDifference(motion.heading,motion.targetHeading))>.01
}
// Forest track geometry sits this far below the authored route centerline.
const FOREST_TRACK_ROUTE_CLEARANCE=.015
const boatLateralScratch=new THREE.Vector3()
const traveller=index=>createExpeditionPerson(index,{seated:true})
const setRole=(member,role)=>{
  member.role=role
  member.userData.role=role
  return member
}
const wheel=()=>{
  const group=new THREE.Group()
  const rubber=material('#242522',.98,0),alloy=material('#95958b',.32,.78)
  group.add(
    mesh(new THREE.CylinderGeometry(.38,.38,.24,28),rubber,[0,0,0],[0,0,Math.PI/2]),
    mesh(new THREE.TorusGeometry(.3,.079,8,28),rubber,[.125,0,0],[0,Math.PI/2,0]),
    mesh(new THREE.TorusGeometry(.3,.079,8,28),rubber,[-.125,0,0],[0,Math.PI/2,0]),
    mesh(new THREE.CylinderGeometry(.235,.235,.25,24),alloy,[0,0,0],[0,0,Math.PI/2]),
    mesh(new THREE.CylinderGeometry(.075,.075,.275,12),alloy,[0,0,0],[0,0,Math.PI/2]),
  )
  return group
}

const createDetailedJeep=model=>{
  model.name='jungle-jeep'
  const sprungBody=model.getObjectByName('body')
  sprungBody.name='jeep-sprung-body'
  const wheels=[0,1,2,3].map(index=>model.getObjectByName(`wheel-${index}`))
  const members=model.userData.vehicleSpecs.seats.map((position,index)=>{
    const person=setRole(traveller(index),index===0?'guide':'tourist')
    person.name=index?`jeep-passenger-${index}`:'jeep-guide'
    person.position.fromArray(position)
    person.rotation.y=Math.PI
    if(index===0){
      person.userData.arms.forEach(arm=>{arm.rotation.x=.15})
      person.userData.elbows.forEach(elbow=>{elbow.rotation.x=-2})
      syncExpeditionPerson(person)
    }
    sprungBody.add(person)
    return person
  })
  model.updateMatrixWorld(true)
  const tireBounds=wheels.map(wheel=>new THREE.Box3().setFromObject(wheel))
  const tireBottom=Math.min(...tireBounds.map(bounds=>bounds.min.y))
  const wheelRadius=tireBounds[0].getSize(new THREE.Vector3()).y/2
  const shadow=createContactShadow(2.1,4.05,.28)
  shadow.position.y=tireBottom+.004
  model.add(shadow)
  Object.assign(model.userData,{wheels,wheelRadius,doors:[],doorlessEntry:true,sprungBody,
    contactShadow:shadow,lastProgress:0,traveller:members[0],members,groundOffset:-tireBottom})
  return model
}

export function createExpeditionJeep(m){
  const detailed=createRealisticVehicle('jeep')
  if(detailed) return createDetailedJeep(detailed)
  const jeep=new THREE.Group()
  jeep.name='jungle-jeep'
  const green=new THREE.MeshPhysicalMaterial({color:'#535b42',roughness:.39,metalness:.17,clearcoat:.32,clearcoatRoughness:.32})
  const canvas=material('#8a8167',.97,0),steel=material('#353a35',.38,.63)
  const rubber=material('#272b26',.96,0),upholstery=material('#655d48',.91,0)
  jeep.add(
    namedMesh('jeep-body',new RoundedBoxGeometry(1.9,.55,3.2,2,.07),green,[0,.75,0]),
    namedMesh('jeep-bonnet',new RoundedBoxGeometry(1.76,.3,1.12,2,.055),green,[0,1.07,-1.08]),
    namedMesh('jeep-front-bumper',new RoundedBoxGeometry(1.96,.16,.19,1,.035),steel,[0,.64,-1.72]),
    namedMesh('jeep-rear-bumper',new RoundedBoxGeometry(1.96,.16,.19,1,.035),steel,[0,.64,1.7]),
  )
  const cage=new THREE.Group()
  cage.name='jeep-roll-cage'
  ;[-.79,.79].forEach(x=>[-.55,.98].forEach(z=>cage.add(mesh(new THREE.CylinderGeometry(.033,.033,1.16,10),steel,[x,1.57,z]))))
  cage.add(mesh(new RoundedBoxGeometry(1.76,.07,1.86,2,.035),canvas,[0,2.16,.22]))
  jeep.add(cage)
  const glass=new THREE.MeshPhysicalMaterial({color:'#a7b9b8',roughness:.12,metalness:.05,transparent:true,opacity:.18,depthWrite:false,clearcoat:.7})
  jeep.add(namedMesh('jeep-windscreen',new THREE.BoxGeometry(1.48,.72,.018),glass,[0,1.65,-.56],[-.12,0,0]))
  const wheels=[]
  ;[-1.02,1.02].forEach(x=>[-1.12,1.08].forEach(z=>{
    const wheelRoot=wheel()
    wheelRoot.position.set(x,.55,z)
    jeep.add(wheelRoot)
    wheels.push(wheelRoot)
    jeep.add(namedMesh('jeep-wheel-arch',new THREE.TorusGeometry(.43,.055,8,24,Math.PI),rubber,[x,.55,z],[0,Math.PI/2,0]))
  }))
  const doors=[]
  ;[-1,1].forEach(side=>{
    const door=new THREE.Group()
    door.name=side<0?'jeep-left-door':'jeep-right-door'
    door.position.set(side*.964,1.09,-.51)
    door.add(
      namedMesh('jeep-door-inset',new RoundedBoxGeometry(.025,.35,.96,1,.025),green,[0,0,.48]),
      namedMesh('jeep-door-handle',new THREE.BoxGeometry(.04,.035,.19),steel,[side*.024,.11,.71]),
    )
    doors.push({object:door,side})
    jeep.add(
      door,
      namedMesh('jeep-side-step',new RoundedBoxGeometry(.22,.07,1.53,1,.025),steel,[side*1.02,.53,-.02]),
      namedMesh('jeep-mirror',new RoundedBoxGeometry(.09,.19,.23,2,.04),steel,[side*.98,1.65,-.59]),
      namedMesh('jeep-headlight',new THREE.CylinderGeometry(.13,.13,.035,20),material('#d6d2b9',.18,.2),[side*.65,1,-1.675],[Math.PI/2,0,0]),
    )
  })
  jeep.add(namedMesh('jeep-radiator',new THREE.BoxGeometry(.86,.31,.028),rubber,[0,.99,-1.665]))
  for(let slot=-3;slot<=3;slot++) jeep.add(mesh(new THREE.BoxGeometry(.05,.28,.04),steel,[slot*.105,.99,-1.69]))
  jeep.add(mesh(new THREE.TorusGeometry(.29,.1,10,24),rubber,[0,1.14,1.74]))
  const person=setRole(traveller(0),'guide')
  person.position.set(-.39,1.04,-.17)
  person.rotation.y=Math.PI
  jeep.add(person)
  const passengers=[
    [.39,1.04,-.17],[-.39,1.04,.65],[.39,1.04,.65],
  ].map((position,index)=>{
    const passenger=setRole(traveller(index+1),'tourist')
    passenger.name=`jeep-passenger-${index+1}`
    passenger.position.set(...position)
    passenger.rotation.y=Math.PI
    jeep.add(passenger)
    return passenger
  })
  ;[person,...passengers].forEach(member=>{
    jeep.add(namedMesh('jeep-seat-cushion',new RoundedBoxGeometry(.49,.1,.43,2,.045),upholstery,[member.position.x,1.02,member.position.z]))
  })
  const steering=mesh(new THREE.TorusGeometry(.16,.018,6,18),rubber,[-.39,1.42,-.59],[-.5,0,0])
  steering.name='jeep-steering-wheel'
  jeep.add(steering)
  const shadow=createContactShadow(2.5,4,.28)
  jeep.add(shadow)
  const sprungBody=new THREE.Group()
  sprungBody.name='jeep-sprung-body'
  sprungBody.add(...jeep.children.filter(child=>child!==shadow&&!wheels.includes(child)))
  jeep.add(sprungBody)
  jeep.updateMatrixWorld(true)
  const tireBottom=Math.min(...wheels.map(candidate=>new THREE.Box3().setFromObject(candidate).min.y))
  shadow.position.y=tireBottom+.004
  jeep.userData={wheels,doors,sprungBody,contactShadow:shadow,lastProgress:0,traveller:person,members:[person,...passengers],groundOffset:-tireBottom}
  return jeep
}

export function updateJeep(jeep,curve,progress,elapsed,reducedMotion,motionOptions){
  const {p,tangent}=routeUpdate(jeep,curve,progress,jeep.userData.groundOffset-FOREST_TRACK_ROUTE_CLEARANCE,false)
  updateVehicleHeading(jeep,curve,p,tangent,reducedMotion,motionOptions)
  // Roll according to travel along the current nose, including the brief
  // backwards roll while a direction change is still turning the vehicle.
  const facingTravel=-Math.sin(jeep.rotation.y)*tangent.x-Math.cos(jeep.rotation.y)*tangent.z
  const distance=(p-jeep.userData.lastProgress)*curve.getLength()*facingTravel
  jeep.userData.wheels.forEach(wheel=>{wheel.rotation.x-=distance/(jeep.userData.wheelRadius||.38)})
  jeep.userData.sprungBody.position.y=reducedMotion?0:Math.sin(elapsed*7)*.012
  jeep.userData.lastProgress=p
}

const namedMesh=(name,geometry,mat,position=[0,0,0],rotation=[0,0,0])=>{const object=mesh(geometry,mat,position,rotation);object.name=name;return object}

function createBoatOar(side,shaftMat,bladeMat,metalMat){
  const legacyName=side<0?'boat-oar-port':'boat-oar-starboard'
  const pivot=new THREE.Group();pivot.name=side<0?'boat-oar-left':'boat-oar-right';pivot.position.set(side*.72,.78,.05);pivot.rotation.order='YXZ';pivot.rotation.z=side<0?-.18:.18
  const visibleAssembly=new THREE.Group();visibleAssembly.name=legacyName
  const shaft=namedMesh(`${legacyName}-shaft`,new THREE.CylinderGeometry(.035,.045,2.65,16),shaftMat,[side*1.2,0,0],[0,0,Math.PI/2])
  const bladeShape=new THREE.Shape();bladeShape.moveTo(-.08,-.42);bladeShape.bezierCurveTo(-.18,-.3,-.19,.22,-.11,.42);bladeShape.bezierCurveTo(-.04,.53,.04,.53,.11,.42);bladeShape.bezierCurveTo(.19,.22,.18,-.3,.08,-.42);bladeShape.closePath()
  const blade=namedMesh(`${legacyName}-blade`,new THREE.ExtrudeGeometry(bladeShape,{depth:.055,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:4}),bladeMat,[side*2.55,0,-.03],[Math.PI/2,0,side<0?-Math.PI/2:Math.PI/2])
  const collar=namedMesh(`${legacyName}-collar`,new THREE.CylinderGeometry(.07,.07,.16,16),metalMat,[0,0,0],[Math.PI/2,0,0])
  visibleAssembly.add(shaft,blade,collar);pivot.add(visibleAssembly);return pivot
}

function createBoatWake(){
  const wake=new THREE.Group();wake.name='boat-wake';wake.position.y=.08
  const createWakeMaterial=opacity=>new THREE.MeshBasicMaterial({color:'#d7f3ec',transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide})
  ;[-1,1].forEach(side=>{
    const trail=namedMesh(
      `boat-wake-trail-${side<0?'left':'right'}`,
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*.48,0,1.72),
        new THREE.Vector3(side*.72,0,2.3),
        new THREE.Vector3(side*1.02,0,3.05),
      ]),28,.027,5,false),
      createWakeMaterial(.18),
    )
    trail.userData.baseOpacity=.18
    wake.add(trail)
  })
  ;[2.05,2.5,2.95].forEach((z,index)=>{
    const wash=namedMesh(`boat-wake-ripple-${index+1}`,new THREE.RingGeometry(.34+index*.1,.39+index*.11,28),createWakeMaterial(.08),[0,.01,z],[-Math.PI/2,0,0])
    wash.scale.x=1.4
    wash.userData.baseOpacity=.08
    wake.add(wash)
  })
  return wake
}

function createBoatRower(){
  const root=createExpeditionPerson(0,{seated:true})
  root.name='boat-rower'
  root.position.set(0,.46,.22)
  root.rotation.y=Math.PI
  const torsoPivot=root.userData.torso
  torsoPivot.name='boat-rower-torso-pivot'
  torsoPivot.getObjectByName('layered-torso-shell').name='boat-rower-torso'
  torsoPivot.attach(root.userData.head)
  torsoPivot.attach(root.getObjectByName('neck'))
  torsoPivot.attach(root.getObjectByName('arms'))
  const [leftElbow,rightElbow]=root.userData.elbows
  leftElbow.name='boat-rower-left-elbow'
  rightElbow.name='boat-rower-right-elbow'
  root.userData.arms.forEach((arm,index)=>{
    arm.rotation.x=-.48
    arm.rotation.z=index===0?.36:-.36
  })
  Object.assign(root.userData,{torsoPivot,leftElbow,rightElbow})
  return root
}

export function createExpeditionBoat(m){
  const boat=new THREE.Group();boat.name='water-boat'
  const hullMat=new THREE.MeshPhysicalMaterial({color:'#35645e',roughness:.37,metalness:.02,clearcoat:.38,clearcoatRoughness:.3}),innerMat=material('#425850',.6,.02),trim=material('#89998a',.42,.18),wood=createEnvironmentMaterial('#b8a48b','wood',{roughness:.82,bumpScale:.016}),metal=material('#a6ada6',.28,.72),shaft=createEnvironmentMaterial('#b8aa91','wood',{roughness:.74,bumpScale:.012}),blade=createEnvironmentMaterial('#ae9576','wood',{roughness:.71,bumpScale:.014})
  const shape=new THREE.Shape();shape.moveTo(-1.28,.08);shape.bezierCurveTo(-1.16,-.36,-.92,-.72,-.56,-.78);shape.lineTo(.56,-.78);shape.bezierCurveTo(.92,-.72,1.16,-.36,1.28,.08);shape.lineTo(.98,.32);shape.bezierCurveTo(.52,.18,-.52,.18,-.98,.32);shape.closePath()
  const hull=namedMesh('boat-hull',new THREE.ExtrudeGeometry(shape,{depth:4.55,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:5,curveSegments:20}),hullMat,[0,-.02,-2.28]);hull.scale.set(.65,.72,.92)
  const hullVertices=hull.geometry.attributes.position
  for(let vertex=0;vertex<hullVertices.count;vertex++){
    const z=hullVertices.getZ(vertex),end=Math.min(1,Math.abs((z-2.275)/2.275))
    hullVertices.setX(vertex,hullVertices.getX(vertex)*(1-.48*end**3))
    hullVertices.setY(vertex,hullVertices.getY(vertex)+.18*end**4)
  }
  hull.geometry.computeVertexNormals()
  boat.add(hull)
  const interior=namedMesh('boat-interior',new THREE.BoxGeometry(1.58,.1,3.45),innerMat,[0,.39,0]);boat.add(interior)
  ;[-1,1].forEach(side=>{
    const rail=new THREE.CatmullRomCurve3([-2.18,-1.65,-.85,0,.85,1.65,2.18].map(z=>{
      const end=Math.abs(z)/2.18
      return new THREE.Vector3(side*.91*(1-.48*end**3),.55+.13*end**4,z)
    }))
    boat.add(namedMesh(`boat-gunwale-${side<0?'port':'starboard'}`,new THREE.TubeGeometry(rail,32,.043,8,false),trim))
  })
  for(let z=-1.45;z<=1.45;z+=.58){const rib=namedMesh('boat-rib',new THREE.CapsuleGeometry(.025,1.46,5,10),trim,[0,.47,z],[0,0,Math.PI/2]);boat.add(rib)}
  ;[-.72,.18,.98].forEach((z,i)=>boat.add(namedMesh(`boat-bench-${i+1}`,new THREE.BoxGeometry(1.58,.1,.4),wood,[0,.58,z])))
  boat.add(namedMesh('boat-bow-cap',new THREE.SphereGeometry(.13,20,12),trim,[0,.55,-2.18]),namedMesh('boat-stern-cap',new THREE.SphereGeometry(.11,20,12),trim,[0,.53,2.18]))
  const port=createBoatOar(-1,shaft,blade,metal),starboard=createBoatOar(1,shaft,blade,metal)
  boat.add(port,starboard)
  const person=createBoatRower();boat.add(person)
  setRole(person,'guide')
  const passengers=[
    [-.42,.55,-1.05],
    [.42,.55,-1.05],
    [0,.55,1.02],
  ].map((position,index)=>{
    const passenger=setRole(traveller(index+1),'tourist')
    passenger.name=`boat-passenger-${index+1}`
    passenger.position.set(...position)
    passenger.scale.setScalar(1)
    passenger.rotation.y=Math.PI
    boat.add(passenger)
    return passenger
  })
  const wakeAnchors=[new THREE.Object3D(),new THREE.Object3D()];wakeAnchors[0].position.set(-.65,.05,1.95);wakeAnchors[1].position.set(.65,.05,1.95);wakeAnchors.forEach(a=>boat.add(a))
  const wake=createBoatWake();boat.add(wake)
  boat.userData={
    wakeAnchors,
    traveller:person,
    members:[person,...passengers],
    wake,
    oars:{port,starboard},
  }
  return boat
}

export function updateBoat(boat,curve,progress,elapsed,reducedMotion,motionOptions){
  const bob=reducedMotion?0:Math.sin(elapsed*1.8)*.035
  const {p,tangent}=routeUpdate(boat,curve,progress,bob,false)
  const dockBlend=1-smooth01((p-BOAT_DOCK_CLEARANCE)/(BOAT_DOCK_MERGE_END-BOAT_DOCK_CLEARANCE))
  const arrivalBlend=1-smooth01((1-p-BOAT_DOCK_CLEARANCE)/(BOAT_DOCK_MERGE_END-BOAT_DOCK_CLEARANCE))
  boatLateralScratch.set(tangent.z,0,-tangent.x).normalize()
  boat.position.addScaledVector(boatLateralScratch,
    (boat.userData.dockLateralOffset||0)*dockBlend+(boat.userData.arrivalDockLateralOffset||0)*arrivalBlend,
  )
  const cameraAnchor=boat.userData.cameraAnchor||(boat.userData.cameraAnchor=new THREE.Vector3())
  cameraAnchor.copy(boat.position)
  cameraAnchor.y-=bob
  updateVehicleHeading(boat,curve,p,tangent,reducedMotion,motionOptions)
  boat.rotation.z=reducedMotion?0:Math.sin(elapsed*1.3)*.025;boat.rotation.x=reducedMotion?0:Math.sin(elapsed*1.7)*.018
  boat.userData.routeTangent=tangent.clone()
  const occupied=motionOptions?.occupied!==false
  const rowing=occupied&&!reducedMotion
  const stroke=rowing?Math.sin(elapsed*2.8):0,recovery=rowing?Math.cos(elapsed*2.8):0
  const port=boat.getObjectByName('boat-oar-left'),starboard=boat.getObjectByName('boat-oar-right'),rower=boat.getObjectByName('boat-rower')
  if(port&&starboard){
    port.rotation.x=-.18+stroke*.42;starboard.rotation.x=port.rotation.x;port.rotation.y=.12+recovery*.08;starboard.rotation.y=-port.rotation.y
  }
  if(rower){const torso=rower.userData.torsoPivot,left=rower.userData.leftElbow,right=rower.userData.rightElbow;torso.rotation.x=-.04-stroke*.18;left.rotation.x=-1.05+recovery*.28;right.rotation.x=left.rotation.x}
  if(rower&&occupied) syncExpeditionPerson(rower)
  const wake=boat.userData.wake
  if(wake) wake.visible=occupied
  if(wake&&!reducedMotion){
    wake.scale.x=1+Math.sin(elapsed*2.1)*.06
    const wakePulse=Math.sin(elapsed*2.6)*.05
    wake.children.forEach(child=>{child.material.opacity=child.userData.baseOpacity+wakePulse})
  }
}

export function createTrekker(m){
  const root=new THREE.Group();root.name='ice-trekker';const coat=material('#d38832',.75),dark=material('#272c31',.85),skin=m.sand
  root.add(mesh(new THREE.CapsuleGeometry(.18,.48,5,10),coat,[0,1.15,0]),mesh(new THREE.SphereGeometry(.18,12,9),skin,[0,1.68,0]),mesh(new THREE.SphereGeometry(.19,12,7,0,Math.PI*2,0,Math.PI/2),dark,[0,1.78,0]))
  const limbs=[];[[-.2,1.35],[.2,1.35],[-.13,.72],[.13,.72]].forEach(([x,y],i)=>{const limb=new THREE.Group();limb.position.set(x,y,0);limb.add(mesh(new THREE.CylinderGeometry(i<2?.045:.06,i<2?.05:.07,i<2?.65:.75,8),i<2?coat:dark,[0,-(i<2?.28:.34),0]));root.add(limb);limbs.push(limb)})
  const pack=mesh(new THREE.BoxGeometry(.55,.7,.28),material('#46614b',.82),[0,1.22,.23]);pack.name='trekker-backpack';root.add(pack)
  const pole=mesh(new THREE.CylinderGeometry(.018,.025,1.65,8),material('#8b704c',.62),[.48,.72,-.08],[0,0,-.18]);pole.name='trekking-pole';root.add(pole)
  root.userData={limbs,pole};return root
}

export function updateTrekker(trekker,curve,progress,elapsed,reducedMotion){routeUpdate(trekker,curve,progress,.02);const swing=reducedMotion?0:Math.sin(elapsed*5.5)*.62;trekker.userData.limbs.forEach((limb,i)=>{limb.rotation.x=(i%2?swing:-swing)*(i<2?.7:1)});trekker.rotation.z=reducedMotion?0:Math.sin(elapsed*2.75)*.018}
