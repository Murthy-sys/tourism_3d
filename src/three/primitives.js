import * as THREE from 'three'

export function createMaterials() {
  const m = (color, roughness = .82, metalness = .02) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
  return { earth:m('#87513b'), sand:m('#c47a50'), stone:m('#6f4650'), ivory:m('#eee0c4'), leaf:m('#416b53'), leaf2:m('#78905b'), wood:m('#4a302b'), water:new THREE.MeshStandardMaterial({color:'#3d8090',roughness:.25,metalness:.15,transparent:true,opacity:.83}), road:m('#3b3541'), gold:m('#e9aa56',.45,.25), snow:m('#e8eff0'), dark:m('#292d38') }
}
export const mesh = (geometry, material, position=[0,0,0], rotation=[0,0,0]) => { const o=new THREE.Mesh(geometry,material); o.position.set(...position); o.rotation.set(...rotation); o.castShadow=true; o.receiveShadow=true; return o }
export function createTree(materials, x=0,z=0,scale=1){ const g=new THREE.Group(); g.add(mesh(new THREE.CylinderGeometry(.08,.12,1,6),materials.wood,[0,.5,0])); g.add(mesh(new THREE.IcosahedronGeometry(.55,1),materials.leaf,[0,1.25,0])); g.position.set(x,0,z); g.scale.setScalar(scale); return g }
export function createBuilding(materials,x,z,w=2,h=2,d=2,mat=materials.stone){ return mesh(new THREE.BoxGeometry(w,h,d),mat,[x,h/2,z]) }
export function createTemple(materials,x,z){ const g=new THREE.Group(); for(let i=0;i<5;i++) g.add(mesh(new THREE.BoxGeometry(2-i*.27,.5,1.5-i*.18),materials.sand,[0,.25+i*.5,0])); g.position.set(x,0,z); return g }
export function createDome(materials,x,z){ const g=new THREE.Group(); g.add(mesh(new THREE.BoxGeometry(3,.9,2),materials.ivory,[0,.45,0])); g.add(mesh(new THREE.SphereGeometry(.85,16,8,0,Math.PI*2,0,Math.PI/2),materials.ivory,[0,.9,0])); [-1.3,1.3].forEach(px=>g.add(mesh(new THREE.CylinderGeometry(.13,.17,2,8),materials.ivory,[px,1,0]))); g.position.set(x,0,z); return g }
export function createMountain(materials,x,z,s=1){ const g=new THREE.Group(); g.add(mesh(new THREE.ConeGeometry(3*s,6*s,7),materials.dark,[0,3*s,0])); g.add(mesh(new THREE.ConeGeometry(1.4*s,2*s,7),materials.snow,[0,5*s,0])); g.position.set(x,0,z); return g }
export function disposeObject3D(root){
  const geometries=new Set(),materials=new Set(),textures=new Set()
  root.traverse(object=>{
    object.userData.disposeRealisticTraveller?.()
    object.userData.disposeRealisticVehicle?.()
    object.userData.disposeRealisticWildlife?.()
    object.userData.disposeNaturalWater?.()
    if(object.isInstancedMesh) object.dispose()
    if(object.geometry&&!object.geometry.userData.managedByTravellerTemplate&&!object.geometry.userData.managedByVehicleTemplate&&!object.geometry.userData.managedByWildlifeTemplate) geometries.add(object.geometry)
    const values=Array.isArray(object.material)?object.material:[object.material]
    values.filter(Boolean).forEach(material=>materials.add(material))
  })
  materials.forEach(material=>Object.values(material).forEach(value=>{
    if(value?.isTexture&&!value.userData.managedByTravellerTemplate&&!value.userData.managedByVehicleTemplate&&!value.userData.managedByWildlifeTemplate&&!value.userData.managedByNatureAssets&&(value.userData.ownedByEnvironment||value.userData.ownedByCharacter||value.userData.ownedByJourney)){
      textures.add(value)
    }
  }))
  geometries.forEach(geometry=>geometry.dispose())
  textures.forEach(texture=>texture.dispose())
  materials.forEach(material=>material.dispose())
}
