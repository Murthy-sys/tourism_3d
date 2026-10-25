import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from 'vitest'
import {createCityCrowd,updateCityCrowd} from './cityCrowd'
import {preloadRealisticTravellers,releaseRealisticTravellers} from './realisticTravellers'
import {disposeObject3D} from './primitives'

const roots=[]
const create=(quality,factory)=>{
  const crowd=createCityCrowd(quality,factory)
  roots.push(crowd.group)
  updateCityCrowd(crowd,0,true,0)
  return crowd
}
const visibleMeshes=actor=>{
  const meshes=[]
  actor.traverse(object=>{if(object.isMesh&&object.visible)meshes.push(object)})
  return meshes
}
const snapshot=crowd=>crowd.people.map(({actor})=>{
  actor.updateWorldMatrix(true,true)
  actor.userData.realisticState.skeletons.forEach(skeleton=>skeleton.update())
  return{position:actor.position.toArray(),bones:Array.from(visibleMeshes(actor)[0].skeleton.boneMatrices)}
})
let parseSpy
beforeAll(async()=>{
  const bytes=fs.readFileSync(path.resolve('public/models/traveller-compact.glb'))
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(bytes,{headers:{'Content-Type':'model/gltf-binary'}})))
  const parse=GLTFLoader.prototype.parse
  parseSpy=vi.spyOn(GLTFLoader.prototype,'parse').mockImplementation(function(data,resourcePath,onLoad,onError){
    // Keep the shipped geometry, bones and texture bindings; jsdom cannot decode
    // embedded images, so substitute only the decoder's texture pixels.
    this.register(()=>({name:'city-test-texture-decoder',loadTexture:()=>
      Promise.resolve(new THREE.DataTexture(new Uint8Array([175,138,111,255]),1,1))}))
    return parse.call(this,data,resourcePath,onLoad,onError)
  })
  await preloadRealisticTravellers('/models/traveller-compact.glb')
})
afterEach(()=>{roots.splice(0).forEach(disposeObject3D)})
afterAll(()=>{releaseRealisticTravellers();parseSpy.mockRestore();vi.unstubAllGlobals()})

describe('anatomical city pedestrians',()=>{
  it.each([['desktop',10,760000],['mobile',6,460000]])('shares textured anatomy with bounded %s detail', (quality,count,triangleBudget)=>{
    const crowd=create(quality)
    expect(crowd.people).toHaveLength(count)
    expect(crowd.people.filter(person=>person.boarding)).toHaveLength(4)
    let triangles=0,draws=0
    crowd.people.forEach(({actor,index})=>{
      expect(actor.userData.realistic).toBe(true)
      expect(actor.userData.role).toBe(index<4?(index===0?'guide':'tourist'):'commuter')
      visibleMeshes(actor).forEach(mesh=>{
        expect(mesh.isSkinnedMesh).toBe(true)
        if(/anatomical body/.test(mesh.material.name)){
          expect(mesh.material.map).toBeTruthy()
          expect(mesh.geometry.attributes.uv.count).toBe(mesh.geometry.attributes.position.count)
        }
        expect(mesh.castShadow).toBe(quality==='desktop'&&index<4)
        draws++
        triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3
      })
    })
    expect(draws).toBeLessThanOrEqual(count*10)
    expect(triangles).toBeLessThan(triangleBudget)
    const first=visibleMeshes(crowd.people[0].actor),second=visibleMeshes(crowd.people[1].actor)
    first.forEach(mesh=>{
      const other=second.find(candidate=>candidate.name===mesh.name)
      expect(mesh.geometry).toBe(other.geometry)
      expect(mesh.material.map).toBe(other.material.map)
      expect(mesh.material).not.toBe(other.material)
      expect(mesh.skeleton).not.toBe(other.skeleton)
    })
    const shirt=actor=>visibleMeshes(actor).find(mesh=>/original top/.test(mesh.material.name)).material.color.getHex()
    expect(shirt(crowd.people[4].actor)).not.toBe(shirt(crowd.people[5].actor))
  })
  it('keeps the actual shoe proxies on the pavement throughout a full walking cycle',()=>{
    const crowd=create('mobile')
    for(const time of [0,.15,.3,.45,.6,.75,.9,1.2,1.6,12]){
      updateCityCrowd(crowd,time,false,0)
      crowd.people.forEach(({actor,position})=>{
        actor.updateWorldMatrix(true,true)
        const bounds=new THREE.Box3()
        actor.userData.bootMeshes.forEach(boot=>bounds.expandByObject(boot))
        expect(bounds.min.y).toBeCloseTo(position.y,5)
        expect(position.y).toBeCloseTo(.51)
      })
    }
  })
  it('keeps boarding reversible and freezes animation for reduced motion',()=>{
    const crowd=create('mobile')
    updateCityCrowd(crowd,3,false,0)
    const walking=snapshot(crowd)
    updateCityCrowd(crowd,100,true,0)
    const still=snapshot(crowd)
    expect(still).not.toEqual(walking)
    updateCityCrowd(crowd,400,true,0)
    expect(snapshot(crowd)).toEqual(still)
    updateCityCrowd(crowd,400,true,1)
    crowd.people.slice(0,4).forEach(person=>{
      expect(person.boarded).toBe(true)
      expect(person.actor.visible).toBe(false)
      expect(person.position.x).toBeCloseTo(-3.55)
      expect(person.position.z).toBeCloseTo(146.2)
    })
    updateCityCrowd(crowd,3,false,0)
    expect(snapshot(crowd)).toEqual(walking)
    expect(crowd.people.every(person=>person.actor.visible)).toBe(true)
  })
  it('retains boarding metadata without recreating toy-shaped fallback people',()=>{
    const crowd=create('mobile',()=>null)
    expect(crowd.group.children).toHaveLength(0)
    updateCityCrowd(crowd,4,false,1)
    expect(crowd.people.slice(0,4).every(person=>person.boarded)).toBe(true)
    expect(crowd.group.children).toHaveLength(0)
  })
})
