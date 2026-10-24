import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { createExpeditionJeep,updateJeep } from './expeditionVehicles'
import { createWaterfallTravellers } from './waterfallTravellers'
import { FINALE_GROUND_Y,WATERFALL,WATERFALL_VIEWING_POSITIONS } from './finaleConfig'
import { createMaterials,disposeObject3D } from './primitives'

const fixture=heading=>{
  const scene=new THREE.Scene()
  const jeep=createExpeditionJeep(createMaterials())
  const route=new THREE.LineCurve3(new THREE.Vector3(1,.2,-128),new THREE.Vector3(1,.2,-132))
  updateJeep(jeep,route,1,0,true)
  if(Number.isFinite(heading)) jeep.rotation.y=heading
  scene.add(jeep)
  const travellers=createWaterfallTravellers(jeep)
  scene.add(travellers.group)
  return{scene,jeep,travellers,dispose:()=>disposeObject3D(scene)}
}

const solesBottom=member=>{
  member.updateWorldMatrix(true,true)
  const bounds=new THREE.Box3()
  member.userData.legs.forEach(leg=>bounds.expandByObject(leg.userData.sole))
  return bounds.min.y
}

const visibleInScene=object=>{
  for(let ancestor=object;ancestor;ancestor=ancestor.parent){
    if(!ancestor.visible) return false
  }
  return true
}

const snapshot=members=>members.map(member=>{
  member.updateWorldMatrix(true,true)
  return{
    position:member.getWorldPosition(new THREE.Vector3()).toArray(),
    rotation:member.getWorldQuaternion(new THREE.Quaternion()).toArray(),
    legs:member.userData.legs.map(leg=>leg.rotation.x),
    knees:member.userData.knees.map(knee=>knee.rotation.x),
    torso:member.userData.torso.position.y,
  }
})

describe('waterfall travellers',()=>{
  it('transfers the same four riders without adding duplicate people or losing any identity',()=>{
    const {scene,jeep,travellers,dispose}=fixture()
    try{
      expect(travellers.members).toEqual(jeep.userData.members)
      for(const progress of [0,.0001,.08,.19,.35,.55,.75,1,.4,0]){
        travellers.update(progress,0,false)
        expect(travellers.members.filter(visibleInScene)).toHaveLength(4)
        const present=[]
        scene.traverse(object=>{if(travellers.members.includes(object)) present.push(object)})
        expect(present).toHaveLength(4)
        expect(new Set(present.map(member=>member.userData.identity)).size).toBe(4)
        expect(present.filter(member=>member.role==='guide')).toHaveLength(1)
      }
      expect(travellers.group.visible).toBe(false)
    }finally{dispose()}
  })

  it('begins from the exact seat pose and restores it after reverse scrolling',()=>{
    const {scene,jeep,travellers,dispose}=fixture()
    try{
      scene.updateMatrixWorld(true)
      const parents=travellers.members.map(member=>member.parent)
      const before=snapshot(travellers.members)
      const head=travellers.members[0].getObjectByName('head')
      const headBefore=head.getWorldPosition(new THREE.Vector3())
      travellers.update(.000001,0,false)
      scene.updateMatrixWorld(true)
      expect(head.getWorldPosition(new THREE.Vector3()).distanceTo(headBefore)).toBeLessThan(1e-8)
      travellers.update(1,0,false)
      expect(jeep.userData.doors.every(({object})=>Math.abs(object.rotation.y)>1)).toBe(true)
      travellers.reset()
      expect(snapshot(travellers.members)).toEqual(before)
      travellers.members.forEach((member,index)=>expect(member.parent).toBe(parents[index]))
      expect(jeep.userData.doors.every(({object})=>object.rotation.y===0)).toBe(true)
    }finally{dispose()}
  })

  it('reverses to the same stepped and walking poses independently of elapsed time',()=>{
    const {travellers,dispose}=fixture()
    try{
      for(const progress of [.16,.3,.45,.64,.81]){
        travellers.update(progress,1,false)
        const forward=snapshot(travellers.members)
        travellers.update(1,500,false)
        travellers.update(progress,900,false)
        expect(snapshot(travellers.members)).toEqual(forward)
        travellers.reset()
      }
    }finally{dispose()}
  })

  it.each([0,.5,1,Math.PI/2,Math.PI,Math.PI*1.5])('walks around the parked jeep and safely reboards at heading %d',heading=>{
    const {jeep,travellers,dispose}=fixture(heading)
    try{
      const parents=travellers.members.map(member=>member.parent)
      const before=snapshot(travellers.members)
      const forward=Array.from({length:101},(_,index)=>index/100)
      for(const progress of [...forward,...forward.slice().reverse()]){
        const {stages}=travellers.update(progress,0,true)
        travellers.members.forEach((member,index)=>{
          if(!['walking','watching'].includes(stages[index])) return
          const localPosition=jeep.worldToLocal(member.getWorldPosition(new THREE.Vector3()))
          // Include the tires and a traveller's boot width in the clearance.
          expect(Math.abs(localPosition.x)>=1.3||Math.abs(localPosition.z)>=2.05).toBe(true)
        })
      }
      expect(snapshot(travellers.members)).toEqual(before)
      travellers.members.forEach((member,index)=>expect(member.parent).toBe(parents[index]))
    }finally{dispose()}
  })

  it('plants walking feet on the clearing and finishes facing the waterfall',()=>{
    const {travellers,dispose}=fixture()
    try{
      for(const progress of [.55,.7,.85,1]){
        const {stages}=travellers.update(progress,0,false)
        travellers.members.forEach((member,index)=>{
          if(['walking','watching'].includes(stages[index])){
            expect(solesBottom(member)).toBeCloseTo(FINALE_GROUND_Y,6)
          }
        })
      }
      travellers.members.forEach((member,index)=>{
        const position=member.getWorldPosition(new THREE.Vector3())
        expect(position.x).toBeCloseTo(WATERFALL_VIEWING_POSITIONS[index][0],8)
        expect(position.z).toBeCloseTo(WATERFALL_VIEWING_POSITIONS[index][2],8)
        const forward=new THREE.Vector3(0,0,1).applyQuaternion(member.getWorldQuaternion(new THREE.Quaternion()))
        const toFalls=new THREE.Vector3(WATERFALL.center[0]-position.x,0,WATERFALL.center[2]-position.z).normalize()
        expect(forward.dot(toFalls)).toBeGreaterThan(.99999)
        expect(member.userData.seated).toBe(false)
      })
    }finally{dispose()}
  })

  it('keeps transfer boundaries continuous and suppresses gait for reduced motion',()=>{
    const {travellers,dispose}=fixture()
    try{
      for(const boundary of [.12,.32,.48,.91]){
        const progress=boundary*.79
        travellers.update(progress-.00001,0,true)
        const before=travellers.members[0].getObjectByName('head').getWorldPosition(new THREE.Vector3())
        travellers.update(progress+.00001,0,true)
        const after=travellers.members[0].getObjectByName('head').getWorldPosition(new THREE.Vector3())
        expect(before.distanceTo(after)).toBeLessThan(.002)
      }
      travellers.update(.6,0,true)
      travellers.members[0].userData.arms.forEach(arm=>expect(arm.rotation.x).toBeCloseTo(0,8))
      travellers.members[0].userData.legs.forEach(leg=>expect(leg.rotation.x).toBeCloseTo(0,8))
    }finally{dispose()}
  })

  it('adds only four contact-shadow meshes to the mobile scene',()=>{
    const jeep=createExpeditionJeep(createMaterials())
    const originalMeshes=new Set()
    jeep.traverse(object=>{if(object.isMesh) originalMeshes.add(object)})
    const travellers=createWaterfallTravellers(jeep)
    const scene=new THREE.Scene()
    scene.add(jeep,travellers.group)
    try{
      travellers.update(1,0,true)
      const added=[]
      scene.traverse(object=>{if(object.isMesh&&!originalMeshes.has(object)) added.push(object)})
      expect(added).toHaveLength(4)
      expect(added.every(object=>object.name.startsWith('waterfall-traveller-shadow-'))).toBe(true)
    }finally{disposeObject3D(scene)}
  })
})
