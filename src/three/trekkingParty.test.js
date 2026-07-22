import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'
import { createTrekkingParty, updateTrekkingParty } from './trekkingParty'

const route=()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(0,0,0),
  new THREE.Vector3(2,0,-10),
  new THREE.Vector3(0,0,-20),
])

describe('guide-led trekking party',()=>{
  it('creates one guide and three visually varied tourists',()=>{
    const party=createTrekkingParty(createMaterials())
    expect(party.userData.members).toHaveLength(4)
    expect(party.userData.members.filter(m=>m.role==='guide')).toHaveLength(1)
    expect(party.userData.members.filter(m=>m.role==='tourist')).toHaveLength(3)
    expect(new Set(party.userData.members.map(m=>m.phase)).size).toBe(4)
    expect(new Set(party.userData.members.map(m=>m.root.getObjectByName('trekking-jacket').material.color.getHexString())).size).toBe(4)
    expect(party.getObjectByName('guide-backpack')).toBeTruthy()
    disposeObject3D(party)
  })

  it('keeps every member separated and planted on terrain',()=>{
    const party=createTrekkingParty(createMaterials())
    updateTrekkingParty(party,route(),.65,2,false,(x,z)=>x*.03-z*.01)
    const positions=party.userData.members.map(m=>m.root.position.clone())
    positions.forEach(p=>expect(p.y).toBeCloseTo(p.x*.03-p.z*.01,.2))
    for(let i=1;i<positions.length;i++)expect(positions[i].distanceTo(positions[i-1])).toBeGreaterThan(.45)
    disposeObject3D(party)
  })

  it('uses the approved phases and route offsets',()=>{
    const party=createTrekkingParty(createMaterials())
    expect(party.userData.members.map(member=>member.phase)).toEqual([0,1.37,2.91,4.42])
    const straightRoute=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-20))
    updateTrekkingParty(party,straightRoute,.65,0,true,()=>0)
    party.userData.members.forEach((member,index)=>{
      expect(member.root.position.z).toBeCloseTo([-13,-11.9,-10.8,-9.7][index],8)
    })
    disposeObject3D(party)
  })

  it('animates opposite limbs and freezes their swing for reduced motion',()=>{
    const party=createTrekkingParty(createMaterials())
    updateTrekkingParty(party,route(),.65,2,false,()=>0)
    const member=party.userData.members[0]
    expect(member.limbs[0].rotation.x).toBeCloseTo(-member.limbs[1].rotation.x)
    expect(member.limbs[2].rotation.x).toBeCloseTo(-member.limbs[3].rotation.x)
    expect(member.limbs[0].rotation.x).not.toBe(0)

    updateTrekkingParty(party,route(),.65,2,true,()=>0)
    member.limbs.forEach(limb=>expect(limb.rotation.x).toBe(0))
    disposeObject3D(party)
  })

  it('plants each pole tip on the terrain at its world coordinates',()=>{
    const party=createTrekkingParty(createMaterials())
    const heightAt=(x,z)=>x*.04-z*.015
    updateTrekkingParty(party,route(),.65,2,false,heightAt)

    party.userData.members.forEach(({pole})=>{
      const tip=pole.userData.tip.getWorldPosition(new THREE.Vector3())
      expect(tip.y).toBeCloseTo(heightAt(tip.x,tip.z),5)
    })
    disposeObject3D(party)
  })
})
