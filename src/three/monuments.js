import * as THREE from 'three'
import { createHillForm, createTree, mesh } from './primitives'

const person=(m,x,z,color=m.gold)=>{const g=new THREE.Group();g.add(mesh(new THREE.CapsuleGeometry(.12,.45,4,8),color,[0,.42,0]),mesh(new THREE.SphereGeometry(.13,10,8),m.sand,[0,.85,0]));g.position.set(x,0,z);return g}
const arch=(m,width=4,height=3,material=m.sand)=>{const g=new THREE.Group();g.add(mesh(new THREE.BoxGeometry(width,.28,.65),material,[0,height,0]));[-1,1].forEach(s=>g.add(mesh(new THREE.CylinderGeometry(.22,.28,height,12),material,[s*(width/2-.25),height/2,0])));return g}
const lamp=(m,x,z)=>{const g=new THREE.Group();g.add(mesh(new THREE.CylinderGeometry(.04,.06,1.8,8),m.dark,[0,.9,0]),mesh(new THREE.SphereGeometry(.14,12,8),m.gold,[0,1.8,0]));g.position.set(x,0,z);return g}

export function createOperationsPavilion(m,quality='desktop'){
  const g=new THREE.Group();g.name='tourism-operations-pavilion'
  g.add(mesh(new THREE.BoxGeometry(12,.3,7),m.stone,[0,.15,0]),mesh(new THREE.BoxGeometry(11,.32,6.2),m.ivory,[0,3.6,0]))
  ;[-5.1,-2.55,0,2.55,5.1].forEach(x=>g.add(mesh(new THREE.CylinderGeometry(.18,.26,3.5,14),m.ivory,[x,1.9,-2.85])))
  const table=new THREE.Group();table.name='route-planning-table';table.add(mesh(new THREE.BoxGeometry(3.7,.16,1.7),m.wood,[0,1.05,0]));[-1,1].forEach(x=>[-1,1].forEach(z=>table.add(mesh(new THREE.CylinderGeometry(.06,.08,1,8),m.dark,[x*1.55,.5,z*.62]))));table.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-1.4,1.17,.3),new THREE.Vector3(-.3,1.18,-.45),new THREE.Vector3(.8,1.18,.2),new THREE.Vector3(1.45,1.18,-.3)]),32,.025,5,false),m.gold));g.add(table)
  const meeting=new THREE.Group();meeting.name='guide-meeting-point';meeting.position.set(3.7,0,1.2);meeting.add(arch(m,2.4,2.3,m.sand),person(m,-.4,0),person(m,.45,.1,m.leaf2));g.add(meeting)
  const luggage=new THREE.Group();luggage.position.set(-3.8,.45,1.1);luggage.add(mesh(new THREE.BoxGeometry(.65,.8,.4),m.sand),mesh(new THREE.TorusGeometry(.18,.035,8,14,Math.PI),m.dark,[0,.5,0]));g.add(luggage)
  if(quality==='desktop'){g.add(person(m,-1.2,.6,m.leaf),person(m,1.3,.4,m.stone),lamp(m,-4.5,-2.3),lamp(m,4.5,-2.3));for(let i=0;i<3;i++)g.add(createTree(m,-6.5+i*6.5,2.8,.7))}
  const warm=new THREE.PointLight('#ffb861',quality==='desktop'?16:8,13);warm.position.set(0,2.8,0);g.add(warm)
  g.userData.anchors={copy:new THREE.Vector3(-4.5,2.4,-3.1)}
  return g
}

const coastalPlan=m=>{const g=new THREE.Group();g.name='southern-discovery-monument';g.add(mesh(new THREE.CylinderGeometry(3.8,4.3,.6,32),m.ivory,[0,.3,0]));for(let i=0;i<8;i++){const a=i/8*Math.PI*2;g.add(mesh(new THREE.CylinderGeometry(.13,.18,2.5,12),m.ivory,[Math.cos(a)*3,1.55,Math.sin(a)*2]))}g.add(mesh(new THREE.TorusGeometry(3,.12,10,40),m.gold,[0,2.8,0],[Math.PI/2,0,0]),mesh(new THREE.CircleGeometry(2.7,32),m.water,[0,.62,0],[-Math.PI/2,0,0]));for(let i=0;i<5;i++)g.add(createTree(m,-4+i*2,2.7+(i%2),.7));return g}
const heritagePlan=m=>{const g=new THREE.Group();g.name='heritage-india-monument';for(let level=0;level<3;level++)g.add(mesh(new THREE.BoxGeometry(8-level*1.2,.35,5-level*.7),level%2?m.stone:m.sand,[0,.18+level*.35,0]));g.add(arch(m,5.5,4,m.sand));[-2.4,2.4].forEach(x=>{g.add(mesh(new THREE.CylinderGeometry(.75,.9,3.8,12),m.stone,[x,2.1,.2]),mesh(new THREE.SphereGeometry(.78,16,8,0,Math.PI*2,0,Math.PI/2),m.gold,[x,4,.2]))});g.add(mesh(new THREE.TorusGeometry(1.4,.18,10,28,Math.PI),m.ivory,[0,2.1,-.08]));return g}
const hillPlan=m=>{const g=new THREE.Group();g.name='himalayan-adventure-monument';for(let i=0;i<4;i++)g.add(createHillForm(m,(i-1.5)*2.6,-1-(i%2)*2,.55+(i%2)*.14));g.add(mesh(new THREE.BoxGeometry(5,.45,3.2),m.stone,[0,.22,1.5]),mesh(new THREE.BoxGeometry(4,2.2,2.5),m.wood,[0,1.55,1.5]),mesh(new THREE.BoxGeometry(2.9,.18,3.4),m.dark,[-1.05,3.25,1.5],[0,0,-.48]),mesh(new THREE.BoxGeometry(2.9,.18,3.4),m.dark,[1.05,3.25,1.5],[0,0,.48]));[-1.3,0,1.3].forEach(x=>g.add(mesh(new THREE.BoxGeometry(.7,.9,.08),m.gold,[x,1.65,.2])));return g}

export function createPlanMonuments(m,quality='desktop'){
  const root=new THREE.Group();root.name='plan-monuments'
  const specs=[['southern-discovery',coastalPlan(m),-13],['heritage-india',heritagePlan(m),0],['himalayan-adventure',hillPlan(m),13]]
  specs.forEach(([id,g,x])=>{g.position.x=x;g.userData={planId:id,anchor:new THREE.Vector3(x,4,0)};root.add(g)})
  if(quality==='desktop'){[-19,-7,7,19].forEach((x,i)=>root.add(lamp(m,x,(i%2?3:-3))))}
  return root
}

export function createContactPavilion(m,quality='desktop'){
  const g=new THREE.Group();g.name='contact-pavilion'
  g.add(mesh(new THREE.CylinderGeometry(5.2,5.7,.7,24),m.stone,[0,.35,0]),mesh(new THREE.BoxGeometry(8,.35,5),m.wood,[0,3.6,0]))
  ;[-3.4,3.4].forEach(x=>[-1.8,1.8].forEach(z=>g.add(mesh(new THREE.CylinderGeometry(.16,.22,3.4,12),m.ivory,[x,1.9,z]))))
  g.add(mesh(new THREE.BoxGeometry(6.4,2.8,.08),new THREE.MeshStandardMaterial({color:'#92b6c3',transparent:true,opacity:.25,roughness:.1}),[0,2,-2.2]))
  g.add(mesh(new THREE.BoxGeometry(3.5,.25,1.1),m.wood,[0,1.05,.5]),person(m,-2,.4,m.gold))
  if(quality==='desktop'){g.add(lamp(m,-4.3,2.6),lamp(m,4.3,2.6));for(let i=0;i<5;i++)g.add(createTree(m,-7+i*3.5,5+(i%2)*2,.8))}
  const warm=new THREE.PointLight('#ffc477',quality==='desktop'?18:9,14);warm.position.set(0,2.8,0);g.add(warm)
  g.userData.anchors={copy:new THREE.Vector3(-3.5,2.7,-2.5)}
  return g
}
