import fs from 'node:fs'
import path from 'node:path'
import * as THREE from 'three'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'

// Keep the shipped vertices, pivots and materials while avoiding image decoding
// in jsdom. The binary buffer and all geometry accessors remain unchanged.
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
  const json=Buffer.from(JSON.stringify(gltf)),paddedLength=Math.ceil(json.length/4)*4
  const remainder=source.subarray(20+jsonLength)
  const result=Buffer.alloc(20+paddedLength+remainder.length,32)
  source.copy(result,0,0,12)
  result.writeUInt32LE(result.length,8)
  result.writeUInt32LE(paddedLength,12)
  result.writeUInt32LE(0x4e4f534a,16)
  json.copy(result,20)
  remainder.copy(result,20+paddedLength)
  return result
}
const fixtures=new Map(['utility-jeep.glb','tour-bus.glb','tour-bus-mobile.glb']
  .map(filename=>[filename,withoutTextures(filename)]))
const assetMeshes=root=>{
  const result=[]
  root.traverse(object=>{
    if(object.isMesh&&object.geometry.userData.managedByVehicleTemplate) result.push(object)
  })
  return result
}
const bounds=meshes=>{
  const result=new THREE.Box3()
  meshes.forEach(object=>{
    object.updateWorldMatrix(true,false)
    result.union(new THREE.Box3().setFromObject(object,true))
  })
  return result
}
const triangles=root=>assetMeshes(root).reduce((total,object)=>
  total+(object.geometry.index?.count??object.geometry.attributes.position.count)/3,0)
const snapshot=members=>members.map(member=>{
  member.updateWorldMatrix(true,true)
  return {
    position:member.getWorldPosition(new THREE.Vector3()).toArray(),
    rotation:member.getWorldQuaternion(new THREE.Quaternion()).toArray(),
    legs:member.userData.legs.map(leg=>leg.rotation.x),
    knees:member.userData.knees.map(knee=>knee.rotation.x),
    arms:member.userData.arms.map(arm=>arm.rotation.x),
    elbows:member.userData.elbows.map(elbow=>elbow.rotation.x),
  }
})

describe('realistic vehicles using the shipped GLBs',()=>{
  let adapter,vehicles,coaches,primitives,fetchMock,leases,roots
  const acquire=(quality='desktop')=>{
    leases+=1
    return adapter.preloadRealisticVehicles(quality)
  }
  const release=()=>{
    leases-=1
    adapter.releaseRealisticVehicles()
  }
  const createJeep=()=>{
    const jeep=vehicles.createExpeditionJeep(primitives.createMaterials())
    roots.push(jeep)
    return jeep
  }
  const createCoach=(quality='desktop')=>{
    const coach=coaches.createTourCoach(quality)
    roots.push(coach)
    return coach
  }
  const dispose=root=>{
    primitives.disposeObject3D(root)
    roots=roots.filter(candidate=>candidate!==root)
  }
  const respond=async url=>{
    const filename=new URL(url,'http://localhost').pathname.split('/').pop()
    const bytes=fixtures.get(filename)
    if(!bytes) throw new Error(`Unexpected vehicle fixture request: ${url}`)
    return new Response(bytes,{headers:{'Content-Type':'model/gltf-binary'}})
  }

  beforeEach(async()=>{
    vi.resetModules()
    leases=0
    roots=[]
    fetchMock=vi.fn(respond)
    vi.stubGlobal('fetch',fetchMock)
    adapter=await import('./realisticVehicles')
    vehicles=await import('./expeditionVehicles')
    coaches=await import('./tourCoach')
    primitives=await import('./primitives')
  })
  afterEach(()=>{
    roots.forEach(root=>primitives.disposeObject3D(root))
    while(leases>0) release()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('seats four distinct existing travellers inside the detailed jeep facing its front',async()=>{
    await acquire()
    const jeep=createJeep(),{members,sprungBody,vehicleSpecs}=jeep.userData
    expect(jeep.userData.realisticVehicle).toBe(true)
    expect(assetMeshes(jeep).length).toBeGreaterThan(10)
    expect(members).toHaveLength(4)
    expect(new Set(members.map(member=>member.userData.identity)).size).toBe(4)
    expect(members.filter(member=>member.role==='guide')).toHaveLength(1)
    const bodyBounds=bounds(assetMeshes(sprungBody))
    members.forEach((member,index)=>{
      expect(member.parent).toBe(sprungBody)
      expect(member.position.toArray()).toEqual(vehicleSpecs.seats[index])
      expect(bodyBounds.containsPoint(member.getWorldPosition(new THREE.Vector3()))).toBe(true)
      const forward=new THREE.Vector3(0,0,1).applyQuaternion(member.getWorldQuaternion(new THREE.Quaternion()))
      expect(forward.dot(new THREE.Vector3(0,0,-1))).toBeGreaterThan(.99999)
    })
    // Rear red lamps provide a geometric check of the authored forward axis.
    const tailLamps=assetMeshes(jeep).filter(object=>object.name==='body-red')
    expect(tailLamps).toHaveLength(1)
    expect(bounds(tailLamps).min.z).toBeGreaterThan(1)
    const route=new THREE.LineCurve3(new THREE.Vector3(0,.4,0),new THREE.Vector3(10,.4,0))
    vehicles.updateJeep(jeep,route,.2,0,true)
    expect(new THREE.Vector3(0,0,-1).applyQuaternion(jeep.quaternion).x).toBeCloseTo(1,8)
  })

  it('grounds all four real tires and rolls by their measured radius in both directions',async()=>{
    await acquire()
    const jeep=createJeep(),{wheels,wheelRadius}=jeep.userData
    const route=new THREE.LineCurve3(new THREE.Vector3(0,.4,0),new THREE.Vector3(0,.4,-20))
    expect(wheels).toHaveLength(4)
    expect(wheelRadius).toBeGreaterThan(.3)
    expect(wheelRadius).toBeLessThan(.5)
    const initial=wheels.map(wheel=>wheel.rotation.x)
    for(const progress of [0,.013,.17,.38,.62]){
      vehicles.updateJeep(jeep,route,progress,0,true)
      jeep.updateMatrixWorld(true)
      wheels.forEach((wheel,index)=>{
        expect(wheel.rotation.x).toBeCloseTo(initial[index]-progress*route.getLength()/wheelRadius,7)
        expect(new THREE.Box3().setFromObject(wheel,true).min.y).toBeCloseTo(.4-.015,2)
      })
    }
    const forward=wheels.map(wheel=>wheel.rotation.x)
    vehicles.updateJeep(jeep,route,.38,0,true)
    wheels.forEach((wheel,index)=>expect(wheel.rotation.x-forward[index]).toBeCloseTo(.24*route.getLength()/wheelRadius,7))
    vehicles.updateJeep(jeep,route,0,0,true)
    wheels.forEach((wheel,index)=>expect(wheel.rotation.x).toBeCloseTo(initial[index],7))
  })

  it('reverses doorless departure without duplicating riders or passing through the parked jeep',async()=>{
    await acquire()
    const {createWaterfallTravellers}=await import('./waterfallTravellers')
    const jeep=createJeep(),scene=new THREE.Scene()
    roots=roots.filter(root=>root!==jeep)
    roots.push(scene)
    scene.add(jeep)
    const route=new THREE.LineCurve3(new THREE.Vector3(1,.2,-128),new THREE.Vector3(1,.2,-132))
    vehicles.updateJeep(jeep,route,1,0,true)
    jeep.rotation.y=Math.PI*.63
    const travellers=createWaterfallTravellers(jeep)
    scene.add(travellers.group)
    expect(jeep.userData.doorlessEntry).toBe(true)
    expect(jeep.userData.doors).toHaveLength(0)
    expect(travellers.members).toEqual(jeep.userData.members)
    const before=snapshot(travellers.members),parents=travellers.members.map(member=>member.parent)
    expect(before[0].arms).toEqual([.15,.15])
    expect(before[0].elbows).toEqual([-2,-2])
    travellers.update(.000001,0,true)
    expect(snapshot(travellers.members)[0].arms[0]).toBeCloseTo(.15,5)
    expect(snapshot(travellers.members)[0].elbows[0]).toBeCloseTo(-2,5)
    travellers.reset()
    for(const progress of [.2,.4,.6,.8,1,.8,.6,.4,.2,0]){
      const {stages}=travellers.update(progress,0,true)
      travellers.members.forEach((member,index)=>{
        if(!['walking','watching'].includes(stages[index])) return
        const local=jeep.worldToLocal(member.getWorldPosition(new THREE.Vector3()))
        expect(Math.abs(local.x)>=1.3||Math.abs(local.z)>=2.05).toBe(true)
      })
      const present=[]
      scene.traverse(object=>{if(travellers.members.includes(object)) present.push(object)})
      expect(present).toHaveLength(4)
    }
    expect(snapshot(travellers.members)).toEqual(before)
    travellers.members.forEach((member,index)=>expect(member.parent).toBe(parents[index]))
    for(const progress of [.16,.4,.67,.9]){
      travellers.update(progress,1,false)
      const forward=snapshot(travellers.members)
      travellers.update(1,100,false)
      travellers.update(progress,300,false)
      expect(snapshot(travellers.members)).toEqual(forward)
      travellers.reset()
    }
  })

  it('builds the detailed coach at road scale with four grounded wheel groups and a generic destination',async()=>{
    await acquire()
    const coach=createCoach(),size=bounds(assetMeshes(coach)).getSize(new THREE.Vector3())
    expect(coach.userData.realisticVehicle).toBe(true)
    expect(size.z).toBeGreaterThan(11.5)
    expect(size.z).toBeLessThan(12.2)
    expect(size.y).toBeGreaterThan(3)
    expect(size.y).toBeLessThan(4.1)
    expect(coach.userData.wheels).toHaveLength(4)
    coach.userData.wheels.forEach(wheel=>{
      expect(wheel.children.length).toBeGreaterThan(1)
      expect(new THREE.Box3().setFromObject(wheel,true).min.y).toBeCloseTo(0,2)
    })
    expect(coach.userData.forward.toArray()).toEqual([0,0,-1])
    expect(coach.userData.destination).toBe('XYZ TRAVELLERS')
  })

  it('keeps vehicle draw counts bounded and ships a lighter mobile coach mesh',async()=>{
    await acquire()
    const desktop=createCoach(),jeep=createJeep()
    const desktopTriangles=triangles(desktop)
    expect(desktopTriangles).toBeGreaterThan(10000)
    for(const vehicle of [desktop,jeep]) expect(assetMeshes(vehicle).length).toBeLessThanOrEqual(35)
    dispose(desktop)
    dispose(jeep)
    release()
    await acquire('mobile')
    const mobile=createCoach('mobile')
    expect(mobile.userData.realisticVehicle).toBe(true)
    expect(assetMeshes(mobile).length).toBeLessThanOrEqual(35)
    expect(triangles(mobile)).toBeGreaterThan(10000)
    expect(triangles(mobile)).toBeLessThan(desktopTriangles*.85)
    expect(fetchMock.mock.calls.some(([url])=>url.endsWith('/tour-bus-mobile.glb'))).toBe(true)
  })

  it('coalesces scene loads while retaining shared geometry until all leases and vehicle instances end',async()=>{
    await Promise.all([acquire(),acquire()])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first=createJeep(),second=createJeep()
    const firstMesh=assetMeshes(first)[0],secondMesh=assetMeshes(second)[0]
    expect(firstMesh.geometry).toBe(secondMesh.geometry)
    expect(firstMesh.material).not.toBe(secondMesh.material)
    const secondColor=secondMesh.material.color.getHex()
    firstMesh.material.color.set('#203040')
    expect(secondMesh.material.color.getHex()).toBe(secondColor)
    const onGeometryDispose=vi.fn(),onMaterialDispose=vi.fn()
    firstMesh.geometry.addEventListener('dispose',onGeometryDispose)
    firstMesh.material.addEventListener('dispose',onMaterialDispose)
    release()
    release()
    expect(onGeometryDispose).not.toHaveBeenCalled()
    dispose(first)
    expect(onMaterialDispose).toHaveBeenCalledTimes(1)
    expect(onGeometryDispose).not.toHaveBeenCalled()
    dispose(second)
    expect(onGeometryDispose).toHaveBeenCalledTimes(1)
    await acquire()
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(createJeep().userData.realisticVehicle).toBe(true)
  })

  it('preserves the available detailed vehicle when only the other asset fails',async()=>{
    fetchMock.mockImplementation(url=>url.endsWith('/utility-jeep.glb')
      ?Promise.reject(new TypeError('Jeep unavailable')):respond(url))
    await acquire()
    expect(createJeep().userData.realisticVehicle).not.toBe(true)
    expect(createCoach().userData.realisticVehicle).toBe(true)
  })
  it('requires both detailed vehicles in strict startup mode',async()=>{
    fetchMock.mockImplementation(url=>url.endsWith('/utility-jeep.glb')
      ?Promise.reject(new TypeError('Jeep unavailable')):respond(url))
    leases++
    await expect(adapter.preloadRealisticVehicles('desktop',{strict:true})).rejects.toThrow('Jeep unavailable')
    fetchMock.mockImplementation(respond)
    leases++
    await expect(adapter.preloadRealisticVehicles('desktop',{strict:true})).resolves.toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(createJeep().userData.realisticVehicle).toBe(true)
    expect(createCoach().userData.realisticVehicle).toBe(true)
  })

  it('keeps both procedural fallbacks available after failed requests and can retry',async()=>{
    fetchMock.mockRejectedValue(new TypeError('Network unavailable'))
    await expect(acquire()).rejects.toThrow('Network unavailable')
    expect(createJeep().userData.realisticVehicle).not.toBe(true)
    expect(createCoach().userData.realisticVehicle).not.toBe(true)
    release()
    fetchMock.mockImplementation(respond)
    await acquire()
    expect(createJeep().userData.realisticVehicle).toBe(true)
    expect(createCoach().userData.realisticVehicle).toBe(true)
  })

  it('bounds stalled requests and aborts them before falling back',async()=>{
    vi.useFakeTimers()
    const signals=[]
    fetchMock.mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>{
      signals.push(signal)
      signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))
    }))
    const outcome=expect(acquire()).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(60000)
    await outcome
    expect(signals).toHaveLength(2)
    expect(signals.every(signal=>signal.aborted)).toBe(true)
    expect(createJeep().userData.realisticVehicle).not.toBe(true)
    expect(createCoach().userData.realisticVehicle).not.toBe(true)
  })

  it('cancels abandoned scene downloads without waiting for the deadline',async()=>{
    vi.useFakeTimers()
    const signals=[]
    fetchMock.mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>{
      signals.push(signal)
      signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true})
    }))
    const outcome=expect(acquire()).rejects.toThrow('Scene released')
    release()
    await outcome
    expect(signals.every(signal=>signal.aborted)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not parse a response body delivered after the startup deadline',async()=>{
    vi.useFakeTimers()
    const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js')
    const parse=vi.spyOn(GLTFLoader.prototype,'parseAsync')
    const complete=[]
    fetchMock.mockImplementation(async()=>({ok:true,arrayBuffer:()=>new Promise(resolve=>complete.push(resolve))}))
    const outcome=expect(acquire()).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(20000)
    await outcome
    complete.forEach(resolve=>resolve(new ArrayBuffer(0)))
    await Promise.resolve()
    expect(parse).not.toHaveBeenCalled()
    expect(createCoach().userData.realisticVehicle).not.toBe(true)
    parse.mockRestore()
  })
})
