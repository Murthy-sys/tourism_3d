import { describe, expect, it } from 'vitest'
import { createTrekkingParty } from './trekkingParty'
import { updateTrekkingParty } from './trekkingParty'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'

describe('trekking party',()=>{
  it('creates one guide and three independently phased tourists',()=>{
    const party=createTrekkingParty(createMaterials())
    expect(party.userData.members).toHaveLength(4)
    expect(party.userData.members.filter(member=>member.role==='guide')).toHaveLength(1)
    expect(party.userData.members.filter(member=>member.role==='tourist')).toHaveLength(3)
    expect(new Set(party.userData.members.map(member=>member.phase)).size).toBe(4)
    disposeObject3D(party)
  })

  it('plants articulated members on the route with exact spacing',()=>{
    const party=createTrekkingParty(createMaterials())
    expect(party.userData.members.map(member=>member.phase)).toEqual([0,1.37,2.91,4.42])
    expect(party.userData.members.map(member=>member.routeOffset)).toEqual([0,.055,.11,.165])
    ;['head','hair','torso','trousers','boots','backpack','straps','roll-mat','arms','legs','walking-pole']
      .forEach(name=>expect(party.userData.members[0].getObjectByName(name)).toBeTruthy())
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,8,2),
      new THREE.Vector3(2,6,-2),
      new THREE.Vector3(3,4,-6),
    ])
    const heightAt=(x,z)=>1+x*.1-z*.02
    updateTrekkingParty(party,curve,.6,1.25,true,heightAt)
    party.userData.members.forEach(member=>{
      expect(member.position.y).toBeCloseTo(heightAt(member.position.x,member.position.z))
      expect(member.userData.torso.rotation.z).toBe(0)
    })
    disposeObject3D(party)
  })
})
