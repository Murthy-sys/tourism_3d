import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'

// Exercise the shipped mesh and skeleton in Node without asking jsdom to decode
// embedded images. Buffer views, skin weights and inverse binds remain intact.
const withoutTextures=filename=>{
const source=fs.readFileSync(path.resolve('public/models',filename))
const jsonLength=source.readUInt32LE(12)
const gltf=JSON.parse(source.subarray(20,20+jsonLength).toString())
const removeTextures=value=>{
  if(!value||typeof value!=='object') return
  Object.entries(value).forEach(([key,child])=>{
    if(/texture$/i.test(key)) delete value[key]
    else removeTextures(child)
  })
}
gltf.materials.forEach(removeTextures)
const json=Buffer.from(JSON.stringify(gltf))
const paddedLength=Math.ceil(json.length/4)*4
const remainder=source.subarray(20+jsonLength)
const modelBytes=Buffer.alloc(20+paddedLength+remainder.length,32)
source.copy(modelBytes,0,0,12)
modelBytes.writeUInt32LE(modelBytes.length,8)
modelBytes.writeUInt32LE(paddedLength,12)
modelBytes.writeUInt32LE(0x4e4f534a,16)
json.copy(modelBytes,20)
remainder.copy(modelBytes,20+paddedLength)
return modelBytes
}

const visible=object=>{
  for(let ancestor=object;ancestor;ancestor=ancestor.parent){
    if(!ancestor.visible) return false
  }
  return true
}
const skins=person=>{
  const result=[]
  person.traverse(object=>{if(object.isSkinnedMesh&&visible(object)) result.push(object)})
  return result
}
const bounds=meshes=>{
  const result=new THREE.Box3()
  meshes.forEach(object=>{
    let root=object
    while(root.parent) root=root.parent
    // Match the render pass, including SkinnedMesh's bind-matrix update.
    root.updateMatrixWorld(true)
    object.skeleton.update()
    result.union(new THREE.Box3().setFromObject(object,true))
  })
  return result
}
const bone=(person,name)=>skins(person)[0].skeleton.bones.find(candidate=>candidate.name===name)
const bonePosition=(person,name)=>bone(person,name).getWorldPosition(new THREE.Vector3())
const poseSnapshot=person=>{
  person.updateWorldMatrix(true,true)
  return skins(person)[0].skeleton.bones.map(candidate=>[
    ...candidate.getWorldPosition(new THREE.Vector3()).toArray(),
    ...candidate.getWorldQuaternion(new THREE.Quaternion()).toArray(),
  ])
}

describe.each(['traveller.glb','traveller-compact.glb'])('realistic travellers using %s',filename=>{
  const modelBytes=withoutTextures(filename)
  let adapter,people,primitives,fetchMock,leases,roots
  const acquire=()=>{
    leases+=1
    return adapter.preloadRealisticTravellers()
  }
  const release=()=>{
    leases-=1
    adapter.releaseRealisticTravellers()
  }
  const create=(index=0,options)=>{
    const person=people.createExpeditionPerson(index,options)
    roots.push(person)
    adapter.syncExpeditionPerson(person)
    return person
  }
  const dispose=root=>{
    primitives.disposeObject3D(root)
    roots=roots.filter(candidate=>candidate!==root)
  }

  beforeEach(async()=>{
    vi.resetModules()
    leases=0
    roots=[]
    fetchMock=vi.fn(async()=>new Response(modelBytes,{
      headers:{'Content-Type':'model/gltf-binary','Content-Length':String(modelBytes.length)},
    }))
    vi.stubGlobal('fetch',fetchMock)
    adapter=await import('./realisticTravellers')
    people=await import('./expeditionPeople')
    primitives=await import('./primitives')
  })

  afterEach(()=>{
    roots.forEach(root=>primitives.disposeObject3D(root))
    while(leases>0) release()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uses independent real skeletons with shared geometry and distinct clothing materials',async()=>{
    await acquire()
    const first=create(0),second=create(1)
    const firstSkins=skins(first),secondSkins=skins(second)
    expect(firstSkins.length).toBeGreaterThan(4)
    expect(firstSkins[0].skeleton.bones.length).toBeGreaterThanOrEqual(50)
    expect(firstSkins[0].skeleton).not.toBe(secondSkins[0].skeleton)
    const firstBones=new Set(firstSkins[0].skeleton.bones)
    secondSkins[0].skeleton.bones.forEach(candidate=>expect(firstBones.has(candidate)).toBe(false))
    firstSkins.forEach(mesh=>{
      const counterpart=secondSkins.find(candidate=>candidate.name===mesh.name)
      expect(counterpart).toBeDefined()
      expect(mesh.geometry).toBe(counterpart.geometry)
      expect(mesh.material).not.toBe(counterpart.material)
    })
    const top=collection=>collection.find(mesh=>/original top/i.test(mesh.material.name))
    expect(top(firstSkins).material.color.getHex()).not.toBe(top(secondSkins).material.color.getHex())
    first.traverse(object=>{
      if(object.isMesh&&visible(object)) expect(object.geometry.type).not.toBe('CapsuleGeometry')
    })
    expect(first.userData.legs).toHaveLength(2)
    expect(first.userData.knees).toHaveLength(2)
    expect(first.userData.arms).toHaveLength(2)
    expect(first.userData.elbows).toHaveLength(2)
  })

  it('stands at adult scale with straight legs and arms lowered beside the torso',async()=>{
    await acquire()
    const person=create()
    const size=bounds(skins(person)).getSize(new THREE.Vector3())
    expect(size.y).toBeGreaterThan(1.68)
    expect(size.y).toBeLessThan(1.94)
    for(const side of ['l','r']){
      const hip=bonePosition(person,`thigh_${side}`)
      const knee=bonePosition(person,`calf_${side}`)
      const ankle=bonePosition(person,`foot_${side}`)
      expect(knee.y).toBeLessThan(hip.y-.3)
      expect(ankle.y).toBeLessThan(knee.y-.3)
      expect(Math.abs(knee.x-hip.x)).toBeLessThan(.08)
      const shoulder=bonePosition(person,`upperarm_${side}`)
      const wrist=bonePosition(person,`hand_${side}`)
      expect(wrist.y).toBeLessThan(shoulder.y-.35)
      expect(Math.abs(wrist.x-shoulder.x)).toBeLessThan(.2)
    }
  })

  it('bends seated knees and moves each attached foot with its calf',async()=>{
    await acquire()
    const person=create(0,{seated:true})
    for(const side of ['l','r']){
      const hip=bonePosition(person,`thigh_${side}`)
      const knee=bonePosition(person,`calf_${side}`)
      const ankle=bonePosition(person,`foot_${side}`)
      expect(bone(person,`foot_${side}`).parent).toBe(bone(person,`calf_${side}`))
      expect(Math.abs(hip.clone().sub(knee).normalize().dot(ankle.clone().sub(knee).normalize()))).toBeLessThan(.25)
      expect(knee.z).toBeGreaterThan(hip.z+.25)
    }
    const ankles=['l','r'].map(side=>bonePosition(person,`foot_${side}`))
    person.userData.knees.forEach(knee=>{knee.rotation.x=0})
    adapter.syncExpeditionPerson(person)
    ;['l','r'].forEach((side,index)=>{
      expect(bonePosition(person,`foot_${side}`).distanceTo(ankles[index])).toBeGreaterThan(.25)
    })
  })

  it('restores the same skinned pose after standing, walking and seated reversals',async()=>{
    await acquire()
    const person=create()
    const before=poseSnapshot(person)
    const controls=[...person.userData.arms,...person.userData.elbows,...person.userData.legs,...person.userData.knees]
    const original=controls.map(control=>control.rotation.clone())
    for(const swing of [.5,-.4,1.48,-1.48]){
      person.userData.legs.forEach((leg,index)=>{leg.rotation.x=index?swing:-swing})
      person.userData.knees.forEach(knee=>{knee.rotation.x=Math.abs(swing)})
      person.userData.arms.forEach((arm,index)=>{arm.rotation.x=index?-swing:swing})
      adapter.syncExpeditionPerson(person)
    }
    controls.forEach((control,index)=>control.rotation.copy(original[index]))
    adapter.syncExpeditionPerson(person)
    poseSnapshot(person).forEach((values,index)=>values.forEach((value,axis)=>expect(value).toBeCloseTo(before[index][axis],7)))
  })

  it('grounds the real skinned shoes throughout the existing walking cycle',async()=>{
    await acquire()
    const {createTrekkingParty,updateTrekkingParty}=await import('./trekkingParty')
    const party=createTrekkingParty(primitives.createMaterials())
    roots.push(party)
    const curve=new THREE.LineCurve3(new THREE.Vector3(0,.37,0),new THREE.Vector3(0,.37,20))
    const gaps=[]
    for(const elapsed of [0,.38,.81]){
      updateTrekkingParty(party,curve,.4,elapsed,false,()=>.37)
      party.userData.members.forEach(member=>{
        const shoes=skins(member).filter(mesh=>/shoes/i.test(mesh.name))
        expect(shoes.length).toBeGreaterThan(0)
        gaps.push(bounds(shoes).min.y-.37)
      })
    }
    // The inexpensive sole proxies conservatively bound the curved shoe mesh.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(-.005)
    expect(Math.max(...gaps)).toBeLessThan(.02)
  })

  it('preserves the real travellers facing and walking direction after scene preparation',async()=>{
    await acquire()
    const {createTrekkingParty,updateTrekkingParty}=await import('./trekkingParty')
    const {captureSceneTransforms,restoreSceneTransforms}=await import('./scenePreparation')
    const party=createTrekkingParty(primitives.createMaterials())
    roots.push(party)
    const curve=new THREE.LineCurve3(new THREE.Vector3(3.2,.35,34),new THREE.Vector3(0,3,12))
    const update=({progress,departureWeight})=>{
      updateTrekkingParty(party,curve,progress,.38,false,()=>.35,{departureWeight})
      party.updateMatrixWorld(true)
    }
    const faceDirection=member=>{
      const eye=member.getObjectByName('eyelashes01')
      return bounds([eye]).getCenter(new THREE.Vector3())
        .sub(bonePosition(member,'head')).setY(0).normalize()
    }
    const states=[
      {progress:0,departureWeight:0},
      {progress:.12,departureWeight:.3},
      {progress:.3,departureWeight:1},
      {progress:.7,departureWeight:1},
    ]
    update(states[0])
    const initial=captureSceneTransforms(party)
    const expected=states.map(state=>{
      update(state)
      return party.userData.members.map(faceDirection)
    })
    for(let attempt=0;attempt<2;attempt++){
      for(const progress of [0,.2,.35,.5,.8,1]) update({progress,departureWeight:1})
      restoreSceneTransforms(initial)
      states.forEach((state,stateIndex)=>{
        update(state)
        party.userData.members.forEach((member,index)=>{
          const direction=faceDirection(member)
          expect(direction.distanceTo(expected[stateIndex][index])).toBeLessThan(1e-6)
          if(state.departureWeight===1){
            const travel=curve.getTangentAt(state.progress).setY(0).normalize()
            expect(direction.dot(travel)).toBeGreaterThan(.999)
          }
        })
      })
    }
  })

  it('coalesces concurrent leases and retains shared geometry until the last live traveller is disposed',async()=>{
    await Promise.all([acquire(),acquire()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const person=create()
    const geometry=skins(person)[0].geometry
    const onDispose=vi.fn()
    geometry.addEventListener('dispose',onDispose)
    release()
    expect(onDispose).not.toHaveBeenCalled()
    release()
    expect(onDispose).not.toHaveBeenCalled()
    dispose(person)
    expect(onDispose).toHaveBeenCalledTimes(1)
    await acquire()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(skins(create()).length).toBeGreaterThan(4)
  })

  it('keeps the procedural fallback available when the model request fails',async()=>{
    fetchMock.mockRejectedValueOnce(new TypeError('Network unavailable'))
    await expect(acquire()).rejects.toThrow('Network unavailable')
    const person=create()
    expect(skins(person)).toHaveLength(0)
    const capsules=[]
    person.traverse(object=>{
      if(object.geometry?.type==='CapsuleGeometry'&&visible(object)) capsules.push(object)
    })
    expect(capsules.length).toBeGreaterThan(0)
    release()
    await acquire()
    expect(skins(create()).length).toBeGreaterThan(4)
  })

  it('aborts a stalled request within a finite deadline and leaves the fallback usable',async()=>{
    vi.useFakeTimers()
    let requestSignal
    fetchMock.mockImplementationOnce((_url,{signal})=>{
      requestSignal=signal
      return new Promise((_resolve,reject)=>{
        signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})
      })
    })
    const result=expect(acquire()).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(60000)
    await result
    expect(requestSignal.aborted).toBe(true)
    expect(skins(create())).toHaveLength(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('cancels the model when the final waiting scene releases its lease',async()=>{
    vi.useFakeTimers()
    let signal
    fetchMock.mockImplementationOnce((_url,options)=>{
      signal=options.signal
      return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))
    })
    const outcome=expect(acquire()).rejects.toThrow('Scene released')
    release()
    await outcome
    expect(signal.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not parse late bytes after selecting the procedural fallback',async()=>{
    vi.useFakeTimers()
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js')
    const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync')
    let complete
    fetchMock.mockImplementationOnce(async()=>({ok:true,arrayBuffer:()=>new Promise(resolve=>{complete=resolve})}))
    const outcome=expect(acquire()).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(20000)
    await outcome
    complete(new ArrayBuffer(0))
    await Promise.resolve()
    expect(parse).not.toHaveBeenCalled()
    expect(skins(create())).toHaveLength(0)
    parse.mockRestore()
  })
})
