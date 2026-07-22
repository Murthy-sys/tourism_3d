import * as THREE from 'three'
import { mesh } from './primitives'

const mat=(color,roughness=.35,metalness=.15,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra})
const rounded=(w,h,d,r=.16)=>new THREE.BoxGeometry(w,h,d,5,3,5).translate(0,0,0)

const addPair=(group,geometry,material,x,y,z)=>{
  ;[-1,1].forEach(side=>group.add(mesh(geometry,material,[side*x,y,z])))
}

function createWheel(){
  const wheel=new THREE.Group()
  const rubber=mat('#101116',.9,.05),chrome=mat('#d8dde0',.18,.8),hub=mat('#eee8dc',.25,.65)
  wheel.add(mesh(new THREE.CylinderGeometry(.34,.34,.18,24),rubber,[0,0,0],[0,0,Math.PI/2]))
  wheel.add(mesh(new THREE.CylinderGeometry(.22,.22,.195,20),chrome,[0,0,0],[0,0,Math.PI/2]))
  wheel.add(mesh(new THREE.CylinderGeometry(.07,.07,.205,16),hub,[0,0,0],[0,0,Math.PI/2]))
  for(let i=0;i<8;i++){const spoke=mesh(new THREE.BoxGeometry(.025,.17,.018),hub,[0,0,0]);spoke.rotation.x=i*Math.PI/4;wheel.add(spoke)}
  return wheel
}

function createTraveller(){
  const traveller=new THREE.Group();traveller.name='ambassador-traveller'
  const skin=mat('#9a563c',.72),shirt=mat('#d79a45',.65),hair=mat('#201a1b',.9),cream=mat('#f1dbc3',.8)
  traveller.add(mesh(new THREE.CapsuleGeometry(.18,.43,5,10),shirt,[0,.45,0]))
  traveller.add(mesh(new THREE.SphereGeometry(.19,16,12),skin,[0,.88,0]))
  traveller.add(mesh(new THREE.SphereGeometry(.2,14,8,0,Math.PI*2,0,Math.PI/2),hair,[0,.96,0]))
  traveller.add(mesh(new THREE.CylinderGeometry(.055,.06,.42,8),skin,[-.22,.48,.03],[0,0,-.22]))
  traveller.add(mesh(new THREE.CylinderGeometry(.055,.06,.42,8),skin,[.22,.48,.03],[0,0,.22]))
  traveller.add(mesh(new THREE.BoxGeometry(.22,.05,.08),cream,[0,.75,.17]))
  return traveller
}

export function createAmbassador(){
  const car=new THREE.Group();car.name='ambassador-vehicle'
  const paint=mat('#e8d7b5',.25,.42),paintDark=mat('#b84632',.28,.42),chrome=mat('#dce1df',.16,.88),glass=mat('#507080',.08,.28,{transparent:true,opacity:.62}),dark=mat('#181b20',.78),red=mat('#b92825',.22,.3,{emissive:'#5d0808',emissiveIntensity:.8}),lamp=mat('#fff2bd',.15,.15,{emissive:'#ffd878',emissiveIntensity:2.4})
  const body=new THREE.Group();body.name='ambassador-body'
  body.add(mesh(rounded(1.85,.54,4.05),paint,[0,.72,0]))
  body.add(mesh(rounded(1.78,.34,1.25),paint,[0,1.06,-1.25],[-.04,0,0]))
  body.add(mesh(rounded(1.72,.36,1.12),paint,[0,1.02,1.25],[.04,0,0]))
  body.add(mesh(new THREE.BoxGeometry(1.66,.08,4.02),chrome,[0,.48,0]))
  body.add(mesh(new THREE.BoxGeometry(1.67,.1,.12),chrome,[0,.6,-2.08]))
  body.add(mesh(new THREE.BoxGeometry(1.67,.1,.12),chrome,[0,.6,2.08]))
  const cabin=new THREE.Group();cabin.position.set(0,1.2,.12)
  cabin.add(mesh(new THREE.BoxGeometry(1.56,.62,1.78),paint,[0,.25,0]))
  cabin.add(mesh(new THREE.BoxGeometry(1.46,.54,.66),glass,[0,.29,-.76],[-.32,0,0]))
  cabin.add(mesh(new THREE.BoxGeometry(1.46,.54,.62),glass,[0,.29,.76],[.3,0,0]))
  addPair(cabin,new THREE.BoxGeometry(.04,.48,.86),glass,.79,.28,0)
  cabin.add(mesh(new THREE.BoxGeometry(1.62,.13,1.72),paint,[0,.63,0]))
  body.add(cabin);car.add(body)

  const grille=new THREE.Group();grille.name='ambassador-grille';grille.position.set(0,.82,-2.09)
  grille.add(mesh(new THREE.BoxGeometry(1.05,.36,.07),chrome))
  for(let i=-4;i<=4;i++)grille.add(mesh(new THREE.BoxGeometry(.035,.28,.08),dark,[i*.11,0,-.045]))
  car.add(grille)
  const headlights=new THREE.Group();headlights.name='ambassador-headlights'
  ;[-.62,.62].forEach(x=>headlights.add(mesh(new THREE.CylinderGeometry(.18,.18,.08,24),lamp,[x,.87,-2.11],[Math.PI/2,0,0])))
  car.add(headlights)
  ;[-.64,.64].forEach(x=>car.add(mesh(new THREE.BoxGeometry(.22,.16,.07),red,[x,.85,2.08])))

  addPair(car,new THREE.SphereGeometry(.085,12,8),chrome,1.02,1.33,-.55)
  addPair(car,new THREE.BoxGeometry(.055,.12,.38),chrome,.94,.98,0)
  addPair(car,new THREE.BoxGeometry(.12,.05,.45),chrome,.91,.92,.02)
  const wheels=[]
  ;[-.95,.95].forEach(x=>[-1.35,1.32].forEach(z=>{const wheel=createWheel();wheel.position.set(x,.48,z);car.add(wheel);wheels.push(wheel)}))

  const seats=mat('#6c3828',.72)
  car.add(mesh(new THREE.BoxGeometry(1.25,.35,.42),seats,[0,1.03,.48]))
  const traveller=createTraveller();traveller.position.set(-.38,.93,-.05);traveller.scale.setScalar(.78);car.add(traveller)
  const steering=new THREE.Group();steering.position.set(-.48,1.28,-.6);steering.rotation.x=Math.PI/2.5
  steering.add(mesh(new THREE.TorusGeometry(.2,.025,8,20),dark));steering.add(mesh(new THREE.CylinderGeometry(.025,.025,.28,8),dark,[0,-.12,0]));car.add(steering)
  car.scale.setScalar(.82)
  car.userData={wheels,body,traveller,headlights,lastProgress:0}
  return car
}

export function updateAmbassador(car,curve,progress,elapsed,reducedMotion){
  const p=THREE.MathUtils.clamp(progress,0,1),position=curve.getPointAt(p),tangent=curve.getTangentAt(Math.min(.999,p+.001)).normalize()
  car.position.copy(position);car.position.y=.25+(reducedMotion?0:Math.sin(elapsed*5)*.018);car.rotation.y=Math.atan2(tangent.x,tangent.z)
  const distance=Math.abs(p-car.userData.lastProgress)*curve.getLength()
  car.userData.wheels.forEach(wheel=>{wheel.rotation.x-=distance/.28})
  car.userData.lastProgress=p
}
