import * as THREE from 'three'
import { createBuilding, createDome, createMountain, createTemple, createTree, mesh } from './primitives'
import { createContactPavilion, createOperationsPavilion, createPlanMonuments } from './monuments'

const addTrees=(g,m,z,n)=>{for(let i=0;i<n;i++)g.add(createTree(m,(i%2?1:-1)*(3+(i%4)*1.6),z+(i%5)*2,(i%3)*.12+.75))}
export function createIndiaRegions(m,quality='desktop'){
  const n=quality==='mobile'?4:11,root=new THREE.Group()
  const south=new THREE.Group();south.name='south';south.add(mesh(new THREE.PlaneGeometry(20,24),m.water,[0,-.12,-5],[-Math.PI/2,0,0]),createTemple(m,7,-12),createBuilding(m,-2,-3,3,1.1,1.4,m.wood));addTrees(south,m,-9,n);root.add(south)
  const deccan=new THREE.Group();deccan.name='deccan';deccan.position.z=-28;for(let i=0;i<n;i++)deccan.add(mesh(new THREE.DodecahedronGeometry(.6+(i%3)*.25,0),m.stone,[(i%5-2)*2,.6,Math.floor(i/5)*2]));deccan.add(createTemple(m,-5,0),mesh(new THREE.PlaneGeometry(14,11),m.water,[8,-.1,-14],[-Math.PI/2,0,0]));addTrees(deccan,m,-8,n);root.add(deccan)
  const west=new THREE.Group();west.name='west-north';west.position.z=-65;west.add(createDome(m,-3,-37),createTemple(m,7,-17));for(let i=0;i<n;i++)west.add(createBuilding(m,(i%6-3)*2,-2-Math.floor(i/6)*3,1.5,1+(i%3),1.6,i%2?m.sand:m.stone));root.add(west)
  const ganges=new THREE.Group();ganges.name='ganges';ganges.position.z=-113;ganges.add(mesh(new THREE.PlaneGeometry(18,20),m.water,[5,-.1,0],[-Math.PI/2,0,0]));for(let i=0;i<n;i++)ganges.add(createBuilding(m,-5+(i%4)*2,-4+Math.floor(i/4)*2,1.8,.5+(i%3)*.45,1.6,i%2?m.sand:m.stone));root.add(ganges)
  const him=new THREE.Group();him.name='himalayas';him.position.z=-139;for(let i=0;i<(quality==='mobile'?3:8);i++)him.add(createMountain(m,(i-3.5)*4,(i%2)*-4,.8+(i%3)*.18));addTrees(him,m,6,n);root.add(him)
  const operations=createOperationsPavilion(m,quality);operations.position.set(0,0,-24);root.add(operations)
  const plans=createPlanMonuments(m,quality);plans.position.set(0,0,-72);root.add(plans)
  const contact=createContactPavilion(m,quality);contact.position.set(0,0,-140);root.add(contact)
  return root
}
