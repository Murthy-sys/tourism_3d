import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest'
import {createWildlifeRig} from './wildlifeRig'
import {disposeObject3D} from './primitives'

const templates=new Map(),textures=[]
beforeAll(async()=>{
  const loader=new GLTFLoader()
  loader.register(()=>({name:'rig-test-texture-decoder',loadTexture:()=>{
    const texture=new THREE.DataTexture(new Uint8Array([121,81,49,255]),1,1)
    texture.userData.managedByWildlifeTemplate=true
    textures.push(texture)
    return Promise.resolve(texture)
  }}))
  for(const kind of ['deer','boar']){
    const bytes=fs.readFileSync(path.resolve(`public/models/forest-${kind}.glb`))
    const gltf=await loader.parseAsync(new Uint8Array(bytes).buffer,'')
    gltf.scene.traverse(object=>{if(object.geometry)object.geometry.userData.managedByWildlifeTemplate=true})
    templates.set(kind,gltf.scene)
  }
})
afterAll(()=>{
  templates.forEach(root=>root.traverse(object=>{
    object.geometry?.dispose()
    object.material?.dispose()
  }))
  textures.forEach(texture=>texture.dispose())
})
const create=kind=>{
  const source=templates.get(kind).clone(true)
  source.traverse(object=>{if(object.isMesh)object.material=object.material.clone()})
  source.userData.disposeRealisticWildlife=vi.fn()
  return{source,rig:createWildlifeRig(source,kind)}
}

describe('textured wildlife skinning',()=>{
  it.each(['deer','boar'])('preserves the actual %s coat UVs and shared source mesh',kind=>{
    const {source,rig}=create(kind)
    let original
    source.traverse(object=>{if(object.isMesh)original=object})
    const mesh=rig.group.children[0],geometry=mesh.geometry
    expect(mesh.isSkinnedMesh).toBe(true)
    expect(mesh.skeleton.bones).toHaveLength(10)
    expect(mesh.material).toBe(original.material)
    expect(geometry).not.toBe(original.geometry)
    expect(geometry.userData.managedByWildlifeTemplate).toBeUndefined()
    expect(original.geometry.userData.managedByWildlifeTemplate).toBe(true)
    expect(Array.from(geometry.attributes.uv.array)).toEqual(Array.from(original.geometry.attributes.uv.array))
    expect(Array.from(geometry.index.array)).toEqual(Array.from(original.geometry.index.array))
    const weights=geometry.attributes.skinWeight
    for(let index=0;index<weights.count;index++){
      expect(weights.getX(index)+weights.getY(index)+weights.getZ(index)+weights.getW(index)).toBeCloseTo(1,6)
    }
    rig.restFeet.forEach(foot=>expect(foot.y).toBeLessThan(.02))
    const height=geometry.boundingBox.max.y
    expect(height).toBeGreaterThan(kind==='deer'?1.8:.8)
    expect(height).toBeLessThan(kind==='deer'?2.1:1.1)
    disposeObject3D(rig.group)
  })

  it.each(['deer','boar'])('grounds moving %s feet with transformed parents and no cumulative drift',kind=>{
    const {rig}=create(kind),parent=new THREE.Group()
    parent.position.set(17,3,-21)
    parent.rotation.set(.06,1.2,-.05)
    parent.scale.setScalar(.7)
    parent.add(rig.group)
    const targets=[-.018,.025,.013,-.006]
    const snapshot=()=>rig.feet.map(point=>point.toArray())
    for(const time of [0,4,17,48]){
      rig.pose(time,false)
      parent.updateWorldMatrix(true,true)
      rig.groundFeet(targets)
      rig.feet.forEach((foot,index)=>{
        expect(foot.y).toBeGreaterThanOrEqual(targets[index]-1e-6)
        expect(foot.y).toBeLessThanOrEqual(targets[index]+.014001)
      })
    }
    rig.pose(4,false);rig.groundFeet(targets)
    const first=snapshot()
    rig.pose(200,false);rig.groundFeet(targets)
    rig.pose(4,false);rig.groundFeet(targets)
    expect(snapshot()).toEqual(first)
    rig.pose(1,true);rig.groundFeet(targets)
    const still=snapshot()
    rig.pose(150,true);rig.groundFeet(targets)
    expect(snapshot()).toEqual(still)
    rig.feet.forEach((foot,index)=>expect(foot.y).toBeCloseTo(targets[index],8))
    disposeObject3D(parent)
  })

  it.each(['deer','boar'])('keeps the deformed %s hoof surfaces on the ground',kind=>{
    const {rig}=create(kind),mesh=rig.group.children[0],point=new THREE.Vector3()
    for(const time of [0,4,17]){
      rig.pose(time,false)
      rig.groundFeet([0,0,0,0])
      rig.group.updateMatrixWorld(true)
      mesh.skeleton.update()
      let lowest=Infinity
      for(let index=0;index<mesh.geometry.attributes.position.count;index++){
        if(mesh.geometry.attributes.position.getY(index)>.04)continue
        mesh.getVertexPosition(index,point)
        lowest=Math.min(lowest,point.y)
      }
      expect(lowest).toBeGreaterThan(-.006)
      expect(lowest).toBeLessThan(.015)
    }
    disposeObject3D(rig.group)
  })

  it.each(['deer','boar'])('plants the %s stance hoof while its body travels forward',kind=>{
    const {rig}=create(kind),parent=new THREE.Group()
    parent.rotation.y=1.1
    parent.scale.setScalar(.65)
    parent.add(rig.group)
    const cycle=kind==='deer'?.5:.38
    const positions=[]
    for(const distance of [cycle*.10,cycle*.15,cycle*.20]){
      rig.group.position.z=distance
      rig.pose(7,false,{distance,speed:.23})
      rig.groundFeet([0,0,0,0])
      positions.push(rig.group.localToWorld(rig.feet[0].clone()))
    }
    positions.slice(1).forEach(position=>expect(position.distanceTo(positions[0])).toBeLessThan(1e-7))
    disposeObject3D(parent)
  })

  it.each(['deer','boar'])('walks the %s with distinct lifted steps and planted support feet',kind=>{
    const {rig}=create(kind)
    const cycle=kind==='deer'?.5:.38
    const lifted=new Set(),minZ=Array(4).fill(Infinity),maxZ=Array(4).fill(-Infinity)
    for(let index=0;index<80;index++){
      rig.pose(index/30,false,{distance:index/80*cycle,speed:.23})
      rig.groundFeet([0,0,0,0])
      let support=0
      rig.feet.forEach((foot,leg)=>{
        expect(foot.y).toBeGreaterThanOrEqual(-1e-7)
        expect(foot.y).toBeLessThanOrEqual(rig.maximumLift+1e-7)
        if(foot.y<1e-7) support++
        if(foot.y>rig.maximumLift*.9) lifted.add(leg)
        minZ[leg]=Math.min(minZ[leg],foot.z)
        maxZ[leg]=Math.max(maxZ[leg],foot.z)
      })
      expect(support).toBeGreaterThanOrEqual(2)
    }
    expect(lifted.size).toBe(4)
    minZ.forEach((value,index)=>expect(maxZ[index]-value).toBeGreaterThan(cycle*.6))
    disposeObject3D(rig.group)
  })

  it.each(['deer','boar'])('keeps walking %s hoof geometry grounded and stops without residual stepping',kind=>{
    const {rig}=create(kind),mesh=rig.group.children[0],point=new THREE.Vector3()
    const cycle=kind==='deer'?.5:.38
    for(const phase of [0,.12,.34,.55,.78,.91]){
      rig.pose(3,false,{distance:cycle*phase,speed:.23})
      rig.groundFeet([0,0,0,0])
      rig.group.updateMatrixWorld(true)
      mesh.skeleton.update()
      let lowest=Infinity
      for(let index=0;index<mesh.geometry.attributes.position.count;index++){
        if(mesh.geometry.attributes.position.getY(index)>.04) continue
        mesh.getVertexPosition(index,point)
        lowest=Math.min(lowest,point.y)
      }
      expect(lowest).toBeGreaterThan(-.006)
      expect(lowest).toBeLessThan(.015)
    }
    rig.pose(10,false,{distance:3,speed:0});rig.groundFeet([0,0,0,0])
    const stopped=rig.feet.map(foot=>foot.toArray())
    rig.pose(50,false,{distance:3,speed:0});rig.groundFeet([0,0,0,0])
    expect(rig.feet.map(foot=>foot.toArray())).toEqual(stopped)
    rig.pose(50,true,{distance:13,speed:.23});rig.groundFeet([0,0,0,0])
    expect(rig.feet.map(foot=>foot.toArray())).toEqual(stopped)
    disposeObject3D(rig.group)
  })

  it('releases its skeleton, cloned geometry and source lease exactly once',()=>{
    const {source,rig}=create('deer')
    const mesh=rig.group.children[0]
    const skeleton=vi.spyOn(mesh.skeleton,'dispose'),geometry=vi.spyOn(mesh.geometry,'dispose')
    const material=vi.spyOn(mesh.material,'dispose')
    disposeObject3D(rig.group)
    rig.group.userData.disposeRealisticWildlife()
    expect(source.userData.disposeRealisticWildlife).toHaveBeenCalledOnce()
    expect(skeleton).toHaveBeenCalledOnce()
    expect(geometry).toHaveBeenCalledOnce()
    expect(material).toHaveBeenCalledOnce()
  })
})
