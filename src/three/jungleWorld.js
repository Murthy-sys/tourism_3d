import * as THREE from 'three'
import { mesh } from './primitives'

const jungleTree=(m,x,z,s=1)=>{const g=new THREE.Group(),trunk=new THREE.MeshStandardMaterial({color:'#39281d',roughness:1}),leaf=new THREE.MeshStandardMaterial({color:x%2?'#254f32':'#3b6c3a',roughness:.9});g.add(mesh(new THREE.CylinderGeometry(.18*s,.34*s,3.8*s,9),trunk,[0,1.9*s,0]));for(let i=0;i<5;i++){const a=i/5*Math.PI*2;g.add(mesh(new THREE.IcosahedronGeometry((1.1+(i%2)*.25)*s,2),leaf,[Math.cos(a)*.7*s,(4.1+(i%3)*.42)*s,Math.sin(a)*.7*s]))}for(let i=0;i<3;i++)g.add(mesh(new THREE.TorusGeometry((.5+i*.18)*s,.035*s,6,18,Math.PI*1.3),m.leaf2,[0,(3.7-i*.5)*s,0],[0,i*.7,0]));g.position.set(x,0,z);return g}
const nameGroup=name=>{const g=new THREE.Group();g.name=name;return g}

export function createJungleWorld(m,quality='desktop'){
  const world=new THREE.Group();world.name='jungle-world'
  const ground=new THREE.MeshStandardMaterial({color:'#182b1c',roughness:.95});world.add(mesh(new THREE.PlaneGeometry(44,46,14,14),ground,[0,-.18,0],[-Math.PI/2,0,0]))
  const foreground=nameGroup('jungle-foreground'),mid=nameGroup('jungle-midground'),back=nameGroup('jungle-background'),count=quality==='mobile'?10:24
  for(let i=0;i<count;i++){const side=i%2?-1:1,x=side*(4+(i%5)*1.8),z=-16+(i%8)*4.6,s=.75+(i%4)*.14;(i<6?foreground:i<15?mid:back).add(jungleTree(m,x,z,s))}world.add(foreground,mid,back)
  const track=nameGroup('forest-track'),points=[];for(let i=0;i<18;i++)points.push(new THREE.Vector3(Math.sin(i*.5)*2.1,.02,11-i*1.85));track.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),120,1.15,8,false),new THREE.MeshStandardMaterial({color:'#5b4127',roughness:1})));track.userData.curve=new THREE.CatmullRomCurve3(points);world.add(track)
  const rocks=nameGroup('jungle-rocks');for(let i=0;i<(quality==='mobile'?8:18);i++)rocks.add(mesh(new THREE.DodecahedronGeometry(.25+(i%4)*.13,1),m.stone,[(i%2?-1:1)*(2.8+(i%6)),.12,-14+(i%9)*3],[i*.2,0,i*.1]));world.add(rocks)
  const puddles=nameGroup('jungle-puddles');[-8,0,7].forEach((z,i)=>puddles.add(mesh(new THREE.CircleGeometry(.6+i*.2,24),m.water,[i%2?1.4:-1.2,.04,z],[-Math.PI/2,0,0])));world.add(puddles)
  const mist=nameGroup('jungle-mist'),mistMat=new THREE.MeshBasicMaterial({color:'#b4cdb6',transparent:true,opacity:.09,depthWrite:false});for(let i=0;i<(quality==='mobile'?3:7);i++)mist.add(mesh(new THREE.PlaneGeometry(14,4),mistMat,[(i%3-1)*7,2,-15+i*5]));world.add(mist)
  const outpost=nameGroup('ranger-outpost');outpost.position.set(-7,0,-13);outpost.add(mesh(new THREE.BoxGeometry(5,.5,3.5),m.wood,[0,.25,0]),mesh(new THREE.BoxGeometry(4,2.4,2.7),m.sand,[0,1.7,0]),mesh(new THREE.ConeGeometry(3.5,1.5,4),m.leaf,[0,3.55,0],[0,Math.PI/4,0]),mesh(new THREE.BoxGeometry(2.4,1.15,.08),m.dark,[0,1.9,1.39]));world.add(outpost)
  const light=new THREE.SpotLight('#ffd98a',34,35,.5,.75);light.position.set(-8,16,7);light.target.position.set(0,0,-8);world.add(light,light.target)
  world.userData={route:track.userData.curve,copyAnchor:new THREE.Vector3(-7,3,-13)};return world
}
