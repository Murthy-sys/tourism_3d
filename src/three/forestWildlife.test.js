import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {afterAll,beforeAll,describe,expect,it} from 'vitest'
import {createForestWildlife} from './forestWildlife'
import {createForestRoute,distanceToForestRoute,sampleForestGroundHeight} from './forestTerrain'
import {sampleFinaleWater} from './finaleConfig'
import {shiftFinaleZ} from './journeySpatial'
import {disposeObject3D} from './primitives'

const templates=new Map(),textures=[]
beforeAll(async()=>{
  const loader=new GLTFLoader()
  // Decode the shipped geometry and material bindings; jsdom has no image
  // decoder. Real embedded texture payloads are verified separately below.
  loader.register(()=>({name:'test-texture-decoder',loadTexture:()=>{
    const texture=new THREE.DataTexture(new Uint8Array([120,82,51,255]),1,1)
    texture.userData.managedByWildlifeTemplate=true
    textures.push(texture)
    return Promise.resolve(texture)
  }}))
  for(const kind of ['deer','boar']){
    const bytes=fs.readFileSync(path.resolve('public/models',`forest-${kind}.glb`))
    const asset=await loader.parseAsync(new Uint8Array(bytes).buffer,'')
    templates.set(kind,asset.scene)
  }
})
afterAll(()=>{templates.forEach(disposeObject3D);textures.forEach(texture=>texture.dispose())})
const factory=kind=>{
  const root=templates.get(kind).clone(true)
  root.traverse(object=>{if(object.isMesh) object.material=object.material.clone()})
  return root
}
const create=(quality='desktop',assetFactory=factory)=>{
  const route=createForestRoute()
  return{route,...createForestWildlife({route,quality,assetFactory,heightAt:(x,z)=>sampleForestGroundHeight(route,x,z)})}
}
const meshesIn=group=>{const meshes=[];group.traverse(object=>{if(object.isMesh)meshes.push(object)});return meshes}

describe('realistic forest wildlife',()=>{
  it.each(['desktop','mobile'])('uses the textured anatomical assets within a small render budget on %s',quality=>{
    const {group}=create(quality)
    const animals=group.userData.animals,meshes=meshesIn(group)
    expect(animals.map(animal=>animal.kind)).toEqual(['deer','deer','deer','boar'])
    expect(animals[2].scale).toBeLessThan(animals[0].scale*.75)
    expect(meshes).toHaveLength(4)
    expect(meshes.every(mesh=>mesh.isSkinnedMesh&&mesh.material.map&&mesh.material.normalMap)).toBe(true)
    expect(meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3,0)).toBeLessThan(45000)
    meshes.forEach(mesh=>{
      expect(mesh.geometry.attributes.uv.count).toBe(mesh.geometry.attributes.position.count)
      expect(mesh.geometry.attributes.skinWeight.count).toBe(mesh.geometry.attributes.position.count)
    })
    disposeObject3D(group)
  })
  it('ships licensed embedded fur maps rather than flat-colored primitive geometry',()=>{
    let total=0
    for(const kind of ['deer','boar']){
      const bytes=fs.readFileSync(path.resolve('public/models',`forest-${kind}.glb`))
      const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)))
      total+=bytes.length
      expect(gltf.images.length).toBeGreaterThanOrEqual(3)
      expect(gltf.images.every(image=>image.bufferView>=0)).toBe(true)
      expect(gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index).toBeGreaterThanOrEqual(0)
      expect(gltf.asset.extras.license).toContain('CC-BY-4.0')
    }
    expect(total).toBeLessThan(1.5*1024*1024)
  })
  it('keeps the real moving hoofs grounded beside the road and outside water',()=>{
    const {group,route,update}=create()
    for(let elapsed=0;elapsed<=120;elapsed+=2){
      update(elapsed,false)
      group.userData.animals.forEach(animal=>{
        expect(Math.hypot(animal.root.position.x-animal.anchor.x,animal.root.position.z-animal.anchor.z)).toBeLessThan(animal.radius+.01)
        animal.hoofPositions.forEach(foot=>{
          expect(distanceToForestRoute(route,foot.x,foot.z)).toBeGreaterThan(2.5)
          if(foot.z<shiftFinaleZ(-130)) expect(sampleFinaleWater(foot.x,foot.z).edgeDistance).toBeGreaterThan(1.5)
          const gap=foot.y-sampleForestGroundHeight(route,foot.x,foot.z)
          expect(gap).toBeGreaterThan(-.009)
          expect(gap).toBeLessThan(animal.rig.maximumLift*animal.scale+.025)
        })
      })
    }
    disposeObject3D(group)
  })
  it('walks visible distances and faces the direction of movement around the clearing',()=>{
    const {group,update}=create()
    const initial=group.userData.animals.map(animal=>animal.root.position.clone())
    update(10,false)
    group.userData.animals.forEach((animal,index)=>{
      expect(animal.root.position.distanceTo(initial[index])).toBeGreaterThan(.5)
    })
    let walkingSamples=0
    for(let time=2;time<50;time+=2){
      update(time,false)
      const before=group.userData.animals.map(animal=>animal.root.position.clone())
      update(time+.1,false)
      group.userData.animals.forEach((animal,index)=>{
        const displacement=animal.root.position.clone().sub(before[index]).setY(0)
        if(displacement.length()<.005) return
        const forward=new THREE.Vector3(0,0,1).applyQuaternion(animal.root.quaternion).setY(0).normalize()
        expect(forward.dot(displacement.normalize())).toBeGreaterThan(.98)
        walkingSamples++
      })
    }
    expect(walkingSamples).toBeGreaterThan(50)
    disposeObject3D(group)
  })
  it('pauses naturally without sliding or changing heading before resuming',()=>{
    const {group,update}=create()
    group.userData.animals.forEach((animal,index)=>{
      const time=22+18-index*4.7
      update(time,false)
      const position=animal.root.position.clone(),heading=animal.root.rotation.y
      expect(animal.motion.speed).toBe(0)
      update(time+2,false)
      expect(animal.root.position.distanceTo(position)).toBe(0)
      expect(animal.root.rotation.y).toBe(heading)
      update(time+6,false)
      expect(animal.motion.speed).toBeGreaterThan(0)
      expect(animal.root.position.distanceTo(position)).toBeGreaterThan(.1)
    })
    disposeObject3D(group)
  })
  it('freezes a composed reduced-motion pose and restores deterministic animation',()=>{
    const {group,update}=create()
    const matrices=()=>meshesIn(group).map(mesh=>{
      mesh.skeleton.update()
      return Array.from(mesh.skeleton.boneMatrices)
    })
    update(2,false)
    const walking=matrices()
    update(8,true)
    const still=matrices()
    expect(still).not.toEqual(walking)
    update(500,true)
    expect(matrices()).toEqual(still)
    update(2,false)
    expect(matrices()).toEqual(walking)
    disposeObject3D(group)
  })
  it('does not display primitive substitutes or pop in late downloads',()=>{
    const {group,update}=create('desktop',()=>null)
    expect(meshesIn(group)).toHaveLength(0)
    update(30,false)
    expect(meshesIn(group)).toHaveLength(0)
    expect(group.userData.animals.every(animal=>!animal.root.visible)).toBe(true)
    disposeObject3D(group)
  })
})
