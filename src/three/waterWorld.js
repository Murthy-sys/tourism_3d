import * as THREE from 'three'
import { createTree,mesh } from './primitives'
const named=name=>{const g=new THREE.Group();g.name=name;return g}
export function createWaterWorld(m,quality='desktop'){
  const world=new THREE.Group();world.name='water-world'
  const waterMat=new THREE.MeshStandardMaterial({color:'#317c8d',roughness:.3,metalness:.1,transparent:true,opacity:.9});const water=mesh(new THREE.PlaneGeometry(52,48,32,32),waterMat,[0,.01,0],[-Math.PI/2,0,0]);water.name='reflective-water';world.add(water)
  const shore=named('water-shoreline');[-1,1].forEach(side=>{shore.add(mesh(new THREE.PlaneGeometry(16,48,8,8),new THREE.MeshStandardMaterial({color:'#6a7744',roughness:.92}),[side*18,-.08,0],[-Math.PI/2,0,0]));for(let i=0;i<(quality==='mobile'?5:12);i++)shore.add(createTree(m,side*(10+(i%3)*2.2),-18+i*3.4,.65+(i%3)*.1))});world.add(shore)
  const jetty=named('boat-jetty');jetty.position.set(-7,.3,-12);for(let i=0;i<8;i++)jetty.add(mesh(new THREE.BoxGeometry(1.3,.16,2.2),m.wood,[i*.9,0,0]));[-1,1].forEach(z=>{for(let i=0;i<5;i++)jetty.add(mesh(new THREE.CylinderGeometry(.05,.07,1.7,8),m.wood,[i*1.7,.65,z*.9]))});world.add(jetty)
  const rocks=named('water-rocks');for(let i=0;i<(quality==='mobile'?7:16);i++)rocks.add(mesh(new THREE.DodecahedronGeometry(.5+(i%4)*.24,1),m.stone,[(i%2?-1:1)*(7+(i%5)*1.8),.25,-15+(i%8)*4]));world.add(rocks)
  const reeds=named('water-reeds');for(let i=0;i<(quality==='mobile'?12:30);i++)reeds.add(mesh(new THREE.CylinderGeometry(.018,.025,.9+(i%3)*.18,5),m.leaf2,[(i%2?-1:1)*(8+(i%6)*.4),.45,-17+(i%12)*3]));world.add(reeds)
  const wake=named('boat-wake'),wakeMat=new THREE.MeshBasicMaterial({color:'#d8f4ed',transparent:true,opacity:.38,depthWrite:false});[-1,1].forEach(x=>wake.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(x*.8,0,2),new THREE.Vector3(x*1.8,0,5)]),30,.035,5,false),wakeMat)));world.add(wake)
  const route=new THREE.CatmullRomCurve3([new THREE.Vector3(-7,.1,13),new THREE.Vector3(-3,.1,4),new THREE.Vector3(3,.1,-5),new THREE.Vector3(0,.1,-18)]);world.userData={route,water,wake,copyAnchor:new THREE.Vector3(-7,2,-12)}
  const sun=new THREE.DirectionalLight('#ffd399',3.2);sun.position.set(-8,12,6);world.add(sun);return world
}
export function updateWaterWorld(world,elapsed,boat){const water=world.userData.water;water.position.y=.02+Math.sin(elapsed*1.4)*.018;if(boat&&world.userData.wake){world.userData.wake.position.copy(boat.position);world.userData.wake.rotation.y=boat.rotation.y}}
