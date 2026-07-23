import * as THREE from 'three'
import { mesh } from './primitives'

const material=(color,roughness=.55,metalness=.08,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra})
const routeUpdate=(object,curve,progress,y=0)=>{const p=THREE.MathUtils.clamp(progress,0,1),point=curve.getPointAt(p),tangent=curve.getTangentAt(Math.min(.999,p+.002));object.position.copy(point);object.position.y+=y;object.rotation.y=Math.atan2(tangent.x,tangent.z);return{p,tangent}}
const smooth01=value=>{const t=THREE.MathUtils.clamp(value,0,1);return t*t*t*(t*(t*6-15)+10)}
const BOAT_DOCK_MERGE_END=.12
const boatLateralScratch=new THREE.Vector3()
const traveller=(m)=>{const g=new THREE.Group();g.name='expedition-traveller';g.add(mesh(new THREE.CapsuleGeometry(.16,.36,4,8),m.gold,[0,.38,0]),mesh(new THREE.SphereGeometry(.16,12,9),m.sand,[0,.78,0]),mesh(new THREE.SphereGeometry(.17,12,7,0,Math.PI*2,0,Math.PI/2),m.dark,[0,.86,0]));return g}
const wheel=()=>{const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.38,.38,.22,20),material('#111318',.92),[0,0,0],[0,0,Math.PI/2]),mesh(new THREE.CylinderGeometry(.21,.21,.24,14),material('#9c9d92',.25,.65),[0,0,0],[0,0,Math.PI/2]));return g}

export function createExpeditionJeep(m){
  const jeep=new THREE.Group();jeep.name='jungle-jeep';const green=material('#374c32',.6,.12),canvas=material('#928063',.82),steel=material('#272b27',.32,.62)
  jeep.add(mesh(new THREE.BoxGeometry(1.9,.55,3.2),green,[0,.75,0]),mesh(new THREE.BoxGeometry(1.75,.34,1.08),green,[0,1.06,-1.2]),mesh(new THREE.BoxGeometry(1.7,.18,.16),steel,[0,.65,-1.72]))
  const cage=new THREE.Group();cage.name='jeep-roll-cage';[-.78,.78].forEach(x=>[-.45,.85].forEach(z=>cage.add(mesh(new THREE.CylinderGeometry(.035,.035,1.25,8),steel,[x,1.55,z]))));cage.add(mesh(new THREE.BoxGeometry(1.65,.06,1.45),steel,[0,2.15,.2]),mesh(new THREE.BoxGeometry(1.55,.04,1.3),canvas,[0,2.2,.2]));jeep.add(cage)
  const wheels=[];[-1.02,1.02].forEach(x=>[-1.12,1.08].forEach(z=>{const w=wheel();w.position.set(x,.55,z);jeep.add(w);wheels.push(w)}))
  jeep.add(mesh(new THREE.TorusGeometry(.42,.12,10,20),material('#151718',.9),[0,1.1,1.66],[0,Math.PI/2,0]),mesh(new THREE.BoxGeometry(1.4,.18,.45),material('#624b36',.75),[0,1.08,.48]))
  const person=traveller(m);person.position.set(-.38,1.08,-.12);jeep.add(person)
  jeep.updateMatrixWorld(true)
  const tireBottom=Math.min(...wheels.map(candidate=>new THREE.Box3().setFromObject(candidate).min.y))
  jeep.userData={wheels,lastProgress:0,traveller:person,groundOffset:-tireBottom};return jeep
}

export function updateJeep(jeep,curve,progress,elapsed,reducedMotion){const {p}=routeUpdate(jeep,curve,progress,jeep.userData.groundOffset+(reducedMotion?0:Math.sin(elapsed*7)*.025));const distance=Math.abs(p-jeep.userData.lastProgress)*curve.getLength();jeep.userData.wheels.forEach(w=>w.rotation.x-=distance/.32);jeep.userData.lastProgress=p}

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
        new THREE.Vector3(side*.9,0,2.8),
        new THREE.Vector3(side*1.45,0,4.5),
      ]),28,.027,5,false),
      createWakeMaterial(.38),
    )
    trail.userData.baseOpacity=.38
    wake.add(trail)
  })
  ;[2.05,2.8,3.65].forEach((z,index)=>{
    const wash=namedMesh(`boat-wake-ripple-${index+1}`,new THREE.RingGeometry(.52+index*.28,.58+index*.3,28),createWakeMaterial(.2),[0,.01,z],[-Math.PI/2,0,0])
    wash.scale.x=1.7
    wash.userData.baseOpacity=.2
    wake.add(wash)
  })
  return wake
}

function createBoatRower(){
  const root=new THREE.Group();root.name='boat-rower';root.position.set(0,.32,.22);root.rotation.y=Math.PI;root.scale.setScalar(.86)
  const skin=material('#9b5d42',.62),shirt=material('#e86524',.54),shorts=material('#273039',.78),hair=material('#2a1a15',.92),shoe=material('#ece8dc',.66),eye=material('#151718',.72)
  const torsoPivot=new THREE.Group();torsoPivot.name='boat-rower-torso-pivot';torsoPivot.position.set(0,.58,0)
  const torso=namedMesh('boat-rower-torso',new THREE.CapsuleGeometry(.25,.58,10,24),shirt,[0,.28,0]);torso.scale.set(1,.98,.72);torsoPivot.add(torso)
  const neck=namedMesh('boat-rower-neck',new THREE.CylinderGeometry(.075,.085,.16,16),skin,[0,.69,0]);const head=namedMesh('boat-rower-head',new THREE.SphereGeometry(.2,28,20),skin,[0,.91,0]);head.scale.set(.88,1.08,.9)
  const hairCap=namedMesh('boat-rower-hair',new THREE.SphereGeometry(.205,24,12,0,Math.PI*2,0,Math.PI/2),hair,[0,1.01,0])
  const beard=namedMesh('boat-rower-beard',new THREE.SphereGeometry(.15,20,12,0,Math.PI*2,Math.PI*.38,Math.PI*.5),hair,[0,.84,-.12],[Math.PI,0,0]);beard.scale.set(.85,.8,.42)
  const nose=namedMesh('boat-rower-nose',new THREE.ConeGeometry(.035,.09,12),skin,[0,.91,-.19],[Math.PI/2,0,0]);torsoPivot.add(neck,head,hairCap,beard,nose)
  ;[-1,1].forEach(side=>{
    const eyeMesh=namedMesh(`boat-rower-eye-${side<0?'left':'right'}`,new THREE.SphereGeometry(.018,12,8),eye,[side*.065,.95,-.178]);torsoPivot.add(eyeMesh)
    const shoulder=new THREE.Group();shoulder.name=`boat-rower-${side<0?'left':'right'}-shoulder`;shoulder.position.set(side*.27,.57,-.02);shoulder.rotation.z=side<0?-.42:.42
    const upper=namedMesh(`${shoulder.name}-upper`,new THREE.CapsuleGeometry(.07,.34,8,16),skin,[0,-.18,0]);upper.rotation.z=side<0?.22:-.22
    const elbow=new THREE.Group();elbow.name=`boat-rower-${side<0?'left':'right'}-elbow`;elbow.position.set(side*.08,-.43,0)
    const forearm=namedMesh(`${elbow.name}-forearm`,new THREE.CapsuleGeometry(.06,.31,8,16),skin,[side*.1,-.17,-.04]);forearm.rotation.z=side<0?-.38:.38
    const hand=namedMesh(`${elbow.name}-hand`,new THREE.SphereGeometry(.072,16,12),skin,[side*.2,-.35,-.08]);elbow.add(forearm,hand);shoulder.add(upper,elbow);torsoPivot.add(shoulder)
  })
  root.add(torsoPivot)
  ;[-1,1].forEach(side=>{
    const hip=new THREE.Group();hip.name=`boat-rower-${side<0?'left':'right'}-hip`;hip.position.set(side*.16,.5,.04);hip.rotation.x=-1.1
    hip.add(namedMesh(`${hip.name}-thigh`,new THREE.CapsuleGeometry(.09,.42,8,16),shorts,[0,-.22,0]))
    const shin=namedMesh(`${hip.name}-shin`,new THREE.CapsuleGeometry(.075,.38,8,16),skin,[0,-.53,-.19],[.8,0,0]);const foot=namedMesh(`${hip.name}-shoe`,new THREE.CapsuleGeometry(.08,.22,8,16),shoe,[0,-.68,-.38],[Math.PI/2,0,0]);hip.add(shin,foot);root.add(hip)
  })
  root.userData={torsoPivot,leftElbow:root.getObjectByName('boat-rower-left-elbow'),rightElbow:root.getObjectByName('boat-rower-right-elbow')};return root
}

export function createExpeditionBoat(m){
  const boat=new THREE.Group();boat.name='water-boat'
  const hullMat=new THREE.MeshPhysicalMaterial({color:'#176f70',roughness:.24,metalness:.12,clearcoat:.72,clearcoatRoughness:.2}),innerMat=material('#0b4e52',.38,.08),trim=material('#72b7ad',.3,.18),wood=material('#73513a',.66),metal=material('#c6d4d0',.2,.72),shaft=material('#269a9b',.32,.16),blade=material('#f2a229',.38,.08)
  const shape=new THREE.Shape();shape.moveTo(-1.28,.08);shape.bezierCurveTo(-1.16,-.36,-.92,-.72,-.56,-.78);shape.lineTo(.56,-.78);shape.bezierCurveTo(.92,-.72,1.16,-.36,1.28,.08);shape.lineTo(.98,.32);shape.bezierCurveTo(.52,.18,-.52,.18,-.98,.32);shape.closePath()
  const hull=namedMesh('boat-hull',new THREE.ExtrudeGeometry(shape,{depth:4.55,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:5,curveSegments:20}),hullMat,[0,-.02,-2.28]);hull.scale.set(.65,.72,.92);boat.add(hull)
  const interior=namedMesh('boat-interior',new THREE.BoxGeometry(1.58,.1,3.45),innerMat,[0,.39,0]);boat.add(interior)
  ;[-1,1].forEach(side=>{
    boat.add(namedMesh(`boat-gunwale-${side<0?'port':'starboard'}`,new THREE.CapsuleGeometry(.055,4.18,8,18),trim,[side*.91,.55,0],[Math.PI/2,0,0]))
    for(let z=-1.45;z<=1.45;z+=.58){const rib=namedMesh('boat-rib',new THREE.CapsuleGeometry(.025,1.55,5,10),trim,[0,.47,z],[0,0,Math.PI/2]);rib.scale.y=.95;boat.add(rib)}
  })
  ;[-.72,.18,.98].forEach((z,i)=>boat.add(namedMesh(`boat-bench-${i+1}`,new THREE.BoxGeometry(1.58,.1,.4),wood,[0,.58,z])))
  boat.add(namedMesh('boat-bow-cap',new THREE.SphereGeometry(.13,20,12),trim,[0,.55,-2.18]),namedMesh('boat-stern-cap',new THREE.SphereGeometry(.11,20,12),trim,[0,.53,2.18]))
  const port=createBoatOar(-1,shaft,blade,metal),starboard=createBoatOar(1,shaft,blade,metal)
  boat.add(port,starboard)
  const person=createBoatRower();boat.add(person)
  const wakeAnchors=[new THREE.Object3D(),new THREE.Object3D()];wakeAnchors[0].position.set(-.65,.05,1.95);wakeAnchors[1].position.set(.65,.05,1.95);wakeAnchors.forEach(a=>boat.add(a))
  const wake=createBoatWake();boat.add(wake)
  boat.userData={wakeAnchors,traveller:person,wake,oars:{port,starboard}};return boat
}

export function updateBoat(boat,curve,progress,elapsed,reducedMotion){
  const {p,tangent}=routeUpdate(boat,curve,progress,reducedMotion?0:Math.sin(elapsed*1.8)*.035)
  const dockBlend=1-smooth01(p/BOAT_DOCK_MERGE_END)
  boatLateralScratch.set(tangent.z,0,-tangent.x).normalize()
  boat.position.addScaledVector(boatLateralScratch,(boat.userData.dockLateralOffset||0)*dockBlend)
  boat.rotation.y+=Math.PI;boat.rotation.z=reducedMotion?0:Math.sin(elapsed*1.3)*.025;boat.rotation.x=reducedMotion?0:Math.sin(elapsed*1.7)*.018
  boat.userData.routeTangent=tangent.clone()
  const stroke=reducedMotion?0:Math.sin(elapsed*2.8),recovery=reducedMotion?0:Math.cos(elapsed*2.8)
  const port=boat.getObjectByName('boat-oar-left'),starboard=boat.getObjectByName('boat-oar-right'),rower=boat.getObjectByName('boat-rower')
  if(port&&starboard){
    port.rotation.x=-.18+stroke*.42;starboard.rotation.x=port.rotation.x;port.rotation.y=.12+recovery*.08;starboard.rotation.y=-port.rotation.y
  }
  if(rower){const torso=rower.userData.torsoPivot,left=rower.userData.leftElbow,right=rower.userData.rightElbow;torso.rotation.x=-.04-stroke*.18;left.rotation.x=.32+recovery*.38;right.rotation.x=left.rotation.x}
  const wake=boat.userData.wake
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
