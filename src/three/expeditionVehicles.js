import * as THREE from 'three'
import { mesh } from './primitives'

const material=(color,roughness=.55,metalness=.08,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra})
const routeUpdate=(object,curve,progress,y=0)=>{const p=THREE.MathUtils.clamp(progress,0,1),point=curve.getPointAt(p),tangent=curve.getTangentAt(Math.min(.999,p+.002));object.position.copy(point);object.position.y+=y;object.rotation.y=Math.atan2(tangent.x,tangent.z);return{p,tangent}}
const traveller=(m)=>{const g=new THREE.Group();g.name='expedition-traveller';g.add(mesh(new THREE.CapsuleGeometry(.16,.36,4,8),m.gold,[0,.38,0]),mesh(new THREE.SphereGeometry(.16,12,9),m.sand,[0,.78,0]),mesh(new THREE.SphereGeometry(.17,12,7,0,Math.PI*2,0,Math.PI/2),m.dark,[0,.86,0]));return g}
const wheel=()=>{const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.38,.38,.22,20),material('#111318',.92),[0,0,0],[0,0,Math.PI/2]),mesh(new THREE.CylinderGeometry(.21,.21,.24,14),material('#9c9d92',.25,.65),[0,0,0],[0,0,Math.PI/2]));return g}

export function createExpeditionJeep(m){
  const jeep=new THREE.Group();jeep.name='jungle-jeep';const green=material('#374c32',.6,.12),canvas=material('#928063',.82),steel=material('#272b27',.32,.62)
  jeep.add(mesh(new THREE.BoxGeometry(1.9,.55,3.2),green,[0,.75,0]),mesh(new THREE.BoxGeometry(1.75,.34,1.08),green,[0,1.06,-1.2]),mesh(new THREE.BoxGeometry(1.7,.18,.16),steel,[0,.65,-1.72]))
  const cage=new THREE.Group();cage.name='jeep-roll-cage';[-.78,.78].forEach(x=>[-.45,.85].forEach(z=>cage.add(mesh(new THREE.CylinderGeometry(.035,.035,1.25,8),steel,[x,1.55,z]))));cage.add(mesh(new THREE.BoxGeometry(1.65,.06,1.45),steel,[0,2.15,.2]),mesh(new THREE.BoxGeometry(1.55,.04,1.3),canvas,[0,2.2,.2]));jeep.add(cage)
  const wheels=[];[-1.02,1.02].forEach(x=>[-1.12,1.08].forEach(z=>{const w=wheel();w.position.set(x,.55,z);jeep.add(w);wheels.push(w)}))
  jeep.add(mesh(new THREE.TorusGeometry(.42,.12,10,20),material('#151718',.9),[0,1.1,1.66],[0,Math.PI/2,0]),mesh(new THREE.BoxGeometry(1.4,.18,.45),material('#624b36',.75),[0,1.08,.48]))
  const person=traveller(m);person.position.set(-.38,1.08,-.12);jeep.add(person)
  jeep.userData={wheels,lastProgress:0,traveller:person};return jeep
}

export function updateJeep(jeep,curve,progress,elapsed,reducedMotion){const {p}=routeUpdate(jeep,curve,progress,.25+(reducedMotion?0:Math.sin(elapsed*7)*.025));const distance=Math.abs(p-jeep.userData.lastProgress)*curve.getLength();jeep.userData.wheels.forEach(w=>w.rotation.x-=distance/.32);jeep.userData.lastProgress=p}

export function createExpeditionBoat(m){
  const boat=new THREE.Group();boat.name='water-boat';const hullMat=material('#7d3827',.45,.14),trim=material('#e0bb76',.5),wood=material('#4b2d23',.72)
  const shape=new THREE.Shape();shape.moveTo(-1.15,0);shape.lineTo(-.78,-.62);shape.lineTo(.78,-.62);shape.lineTo(1.15,0);shape.lineTo(.8,.28);shape.lineTo(-.8,.28);shape.closePath();const hull=mesh(new THREE.ExtrudeGeometry(shape,{depth:3.8,bevelEnabled:true,bevelSize:.09,bevelThickness:.08,bevelSegments:2}),hullMat,[-0,-.05,-1.9],[0,Math.PI/2,0]);hull.name='boat-hull';hull.scale.set(.5,.8,.5);boat.add(hull)
  boat.add(mesh(new THREE.BoxGeometry(1.75,.12,3.2),wood,[0,.42,0]),mesh(new THREE.BoxGeometry(1.65,.12,1.9),trim,[0,2.05,.1]))
  ;[-.7,.7].forEach(x=>[-.72,.82].forEach(z=>boat.add(mesh(new THREE.CylinderGeometry(.035,.045,1.55,8),wood,[x,1.25,z]))))
  boat.add(mesh(new THREE.BoxGeometry(.75,.55,.65),material('#2c3338',.4,.5),[0,.65,1.42]))
  const person=traveller(m);person.position.set(0,.55,-.25);boat.add(person)
  const wakeAnchors=[new THREE.Object3D(),new THREE.Object3D()];wakeAnchors[0].position.set(-.65,.05,1.95);wakeAnchors[1].position.set(.65,.05,1.95);wakeAnchors.forEach(a=>boat.add(a));boat.userData={wakeAnchors,traveller:person};return boat
}

export function updateBoat(boat,curve,progress,elapsed,reducedMotion){routeUpdate(boat,curve,progress,.12+(reducedMotion?0:Math.sin(elapsed*1.8)*.035));boat.rotation.z=reducedMotion?0:Math.sin(elapsed*1.3)*.025;boat.rotation.x=reducedMotion?0:Math.sin(elapsed*1.7)*.018}

export function createTrekker(m){
  const root=new THREE.Group();root.name='ice-trekker';const coat=material('#d38832',.75),dark=material('#272c31',.85),skin=m.sand
  root.add(mesh(new THREE.CapsuleGeometry(.18,.48,5,10),coat,[0,1.15,0]),mesh(new THREE.SphereGeometry(.18,12,9),skin,[0,1.68,0]),mesh(new THREE.SphereGeometry(.19,12,7,0,Math.PI*2,0,Math.PI/2),dark,[0,1.78,0]))
  const limbs=[];[[-.2,1.35],[.2,1.35],[-.13,.72],[.13,.72]].forEach(([x,y],i)=>{const limb=new THREE.Group();limb.position.set(x,y,0);limb.add(mesh(new THREE.CylinderGeometry(i<2?.045:.06,i<2?.05:.07,i<2?.65:.75,8),i<2?coat:dark,[0,-(i<2?.28:.34),0]));root.add(limb);limbs.push(limb)})
  const pack=mesh(new THREE.BoxGeometry(.55,.7,.28),material('#46614b',.82),[0,1.22,.23]);pack.name='trekker-backpack';root.add(pack)
  const pole=mesh(new THREE.CylinderGeometry(.018,.025,1.65,8),material('#8b704c',.62),[.48,.72,-.08],[0,0,-.18]);pole.name='trekking-pole';root.add(pole)
  root.userData={limbs,pole};return root
}

export function updateTrekker(trekker,curve,progress,elapsed,reducedMotion){routeUpdate(trekker,curve,progress,.02);const swing=reducedMotion?0:Math.sin(elapsed*5.5)*.62;trekker.userData.limbs.forEach((limb,i)=>{limb.rotation.x=(i%2?swing:-swing)*(i<2?.7:1)});trekker.rotation.z=reducedMotion?0:Math.sin(elapsed*2.75)*.018}
