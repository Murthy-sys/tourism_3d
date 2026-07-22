import * as THREE from 'three'

export function createMaterials() {
  const m = (color, roughness = .82, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return { earth:m('#87513b'), sand:m('#c47a50'), stone:m('#6f4650'), ivory:m('#eee0c4'), leaf:m('#416b53'), leaf2:m('#78905b'), wood:m('#4a302b'), water:new THREE.MeshStandardMaterial({color:'#3d8090',roughness:.25,metalness:.15,transparent:true,opacity:.83}), road:m('#3b3541'), gold:m('#e9aa56',.45,.25), dark:m('#292d38') }
}
export const mesh = (geometry, material, position=[0,0,0], rotation=[0,0,0]) => { const o=new THREE.Mesh(geometry,material); o.position.set(...position); o.rotation.set(...rotation); o.castShadow=true; o.receiveShadow=true; return o }
export function createTree(materials, x=0,z=0,scale=1){ const g=new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.08,.12,1,6),materials.wood,[0,.5,0])); g.add(mesh(new THREE.IcosahedronGeometry(.55,1),materials.leaf,[0,1.25,0])); g.position.set(x,0,z); g.scale.setScalar(scale); return g }
export function createBuilding(materials,x,z,w=2,h=2,d=2,mat=materials.stone){ return mesh(new THREE.BoxGeometry(w,h,d),mat,[x,h/2,z]) }
export function createTemple(materials,x,z){ const g=new THREE.Group(); for(let i=0;i<5;i++) g.add(mesh(new THREE.BoxGeometry(2-i*.27,.5,1.5-i*.18),materials.sand,[0,.25+i*.5,0])); g.position.set(x,0,z); return g }
export function createDome(materials,x,z){ const g=new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(3,.9,2),materials.ivory,[0,.45,0])); g.add(mesh(new THREE.SphereGeometry(.85,16,8,0,Math.PI*2,0,Math.PI/2),materials.ivory,[0,.9,0])); [-1.3,1.3].forEach(px=>g.add(mesh(new THREE.CylinderGeometry(.13,.17,2,8),materials.ivory,[px,1,0]))); g.position.set(x,0,z); return g }
export function createHillForm(materials,x,z,s=1){
  const group=new THREE.Group();group.name='lush-hill-form'
  const hill=mesh(new THREE.SphereGeometry(3.2*s,22,12),materials.leaf2,[0,1.1*s,0]);hill.scale.y=.48;group.add(hill)
  const rock=mesh(new THREE.DodecahedronGeometry(.9*s,1),materials.stone,[.8*s,.75*s,-.25*s]);rock.scale.set(1.4,.7,.9);group.add(rock)
  group.add(createTree(materials,-1.1*s,.3*s,.65*s),createTree(materials,1.35*s,.2*s,.52*s))
  group.position.set(x,0,z);return group
}
const disposedResources=new WeakSet()
const disposeOnce=resource=>{if(!resource||disposedResources.has(resource))return;disposedResources.add(resource);resource.dispose()}
export function disposeObject3D(root){
  const gs=new Set(),ms=new Set(),shadowTargets=new Set()
  root.traverse(o=>{
    if(o.geometry)gs.add(o.geometry)
    ;(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean).forEach(m=>ms.add(m))
    if(o.isLight&&o.shadow){
      if(o.shadow.map)shadowTargets.add(o.shadow.map)
      if(o.shadow.mapPass)shadowTargets.add(o.shadow.mapPass)
    }
  })
  gs.forEach(disposeOnce)
  ms.forEach(disposeOnce)
  shadowTargets.forEach(disposeOnce)
}
