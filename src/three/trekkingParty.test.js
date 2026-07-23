import { describe, expect, it } from 'vitest'
import { createTrekkingParty } from './trekkingParty'
import { updateTrekkingParty } from './trekkingParty'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'

const getBootBounds=member=>{
  const bounds=new THREE.Box3()
  member.getObjectByName('boots').userData.parts.forEach(boot=>bounds.expandByObject(boot))
  return bounds
}

describe('trekking party',()=>{
  it('creates one guide and three independently phased tourists',()=>{
    const materials=createMaterials()
    const party=createTrekkingParty(materials)
    expect(party.userData.members).toHaveLength(4)
    expect(party.userData.members.filter(member=>member.role==='guide')).toHaveLength(1)
    expect(party.userData.members.filter(member=>member.role==='tourist')).toHaveLength(3)
    expect(new Set(party.userData.members.map(member=>member.phase)).size).toBe(4)
    expect(party.getObjectByName('walking-pole-shaft').material).toBe(materials.wood)
    expect(party.getObjectByName('boot').material).toBe(materials.dark)
    disposeObject3D(party)
  })

  it('plants the actual articulated boot bottoms on the route surface',()=>{
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
    party.updateMatrixWorld(true)
    party.userData.members.forEach(member=>{
      const contactHeight=heightAt(member.position.x,member.position.z)
      const rootY=member.getWorldPosition(new THREE.Vector3()).y
      const bootBounds=getBootBounds(member)
      expect(bootBounds.min.y).toBeCloseTo(contactHeight,5)
      expect(member.userData.bootBottomOffset).toBeCloseTo(bootBounds.min.y-rootY,5)
      expect(member.userData.torso.rotation.z).toBe(0)
    })
    disposeObject3D(party)
  })

  it('keeps the guide-led party separated on the route from the journey start',()=>{
    const party=createTrekkingParty(createMaterials())
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,2,2),
      new THREE.Vector3(1,1,0),
      new THREE.Vector3(2,.5,-4),
    ])
    updateTrekkingParty(party,curve,0,0,false,()=>0)
    const positions=party.userData.members.map(member=>`${member.position.x.toFixed(4)}:${member.position.z.toFixed(4)}`)
    expect(new Set(positions).size).toBe(4)
    const expectedProgress=[.165,.11,.055,0]
    party.userData.members.forEach((member,index)=>{
      const routePoint=curve.getPointAt(expectedProgress[index])
      expect(member.position.x).toBeCloseTo(routePoint.x)
      expect(member.position.z).toBeCloseTo(routePoint.z)
    })
    disposeObject3D(party)
  })

  it('retains opposite-limb walking while reduced motion suppresses secondary sway',()=>{
    const party=createTrekkingParty(createMaterials())
    const curve=new THREE.LineCurve3(
      new THREE.Vector3(0,0,2),
      new THREE.Vector3(0,0,-4),
    )
    updateTrekkingParty(party,curve,.4,.25,true,()=>0)
    const guide=party.userData.members[0]
    const [leftArm,rightArm]=guide.userData.arms
    const [leftLeg,rightLeg]=guide.userData.legs
    expect(Math.abs(leftArm.rotation.x)).toBeGreaterThan(.01)
    expect(rightArm.rotation.x).toBeCloseTo(-leftArm.rotation.x)
    expect(leftLeg.rotation.x).toBeCloseTo(-rightLeg.rotation.x)
    expect(guide.userData.torso.rotation.z).toBe(0)
    expect(guide.userData.torso.rotation.x).toBe(0)
    expect(guide.userData.backpack.rotation.z).toBe(0)
    disposeObject3D(party)
  })
})
