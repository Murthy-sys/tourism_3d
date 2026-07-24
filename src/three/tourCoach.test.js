import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {disposeObject3D} from './primitives'
import {createTourCoach} from './tourCoach'

const names=[
  'coach-body',
  'coach-glazing',
  'coach-wheel-arches',
  'coach-wheels',
  'coach-entry',
  'coach-exterior-details',
  'tour-coach-windscreen',
  'tour-coach-door-open',
  'tour-coach-entry-step-1',
  'tour-coach-entry-step-2',
  'tour-coach-entry-step-3',
  'tour-coach-left-mirror',
  'tour-coach-right-mirror',
  'tour-coach-headlights',
  'tour-coach-tail-lights',
  'tour-coach-grille',
]

describe('premium tourist coach',()=>{
  it('builds a coherent full coach with every inspectable exterior group',()=>{
    const coach=createTourCoach('desktop')
    expect(coach.name).toBe('tour-coach')
    names.forEach(name=>expect(coach.getObjectByName(name)).toBeTruthy())
    expect(coach.userData.wheels).toHaveLength(4)
    expect(coach.userData.wheelContactPoints).toHaveLength(4)
    expect(new Set(coach.userData.wheels.map(wheel=>wheel.userData.axle))).toEqual(
      new Set(['front','rear']),
    )
    expect(new Set(coach.userData.wheels.map(wheel=>wheel.userData.side))).toEqual(
      new Set(['left','right']),
    )
    disposeObject3D(coach)
  })

  it('uses realistic long-coach proportions and plants every tire at local Y zero',()=>{
    const coach=createTourCoach('desktop')
    coach.updateMatrixWorld(true)
    expect(coach.userData.dimensions).toEqual({
      length:11.8,
      width:2.55,
      overallHeight:3.55,
      wheelRadius:.48,
    })
    expect(coach.userData.dimensions.length/coach.userData.dimensions.width)
      .toBeGreaterThan(4)
    coach.userData.wheelContactPoints.forEach(point=>expect(point.y).toBeCloseTo(0,8))
    const tireBottoms=coach.userData.wheels.map(wheel=>
      new THREE.Box3().setFromObject(wheel).min.y
    )
    tireBottoms.forEach(bottom=>expect(bottom).toBeCloseTo(0,5))
    expect(coach.userData.vehicleBounds.min.y).toBeGreaterThanOrEqual(-1e-6)
    disposeObject3D(coach)
  })

  it('keeps the passenger door open above three rising entry steps',()=>{
    const coach=createTourCoach('desktop')
    const door=coach.getObjectByName('tour-coach-door-open')
    const steps=[1,2,3].map(index=>
      coach.getObjectByName(`tour-coach-entry-step-${index}`)
    )
    expect(Math.abs(door.parent.rotation.y)).toBeGreaterThan(.5)
    const stepTops=steps.map(step=>new THREE.Box3().setFromObject(step).max.y)
    expect(stepTops[1]).toBeGreaterThan(stepTops[0])
    expect(stepTops[2]).toBeGreaterThan(stepTops[1])
    expect(coach.userData.doorClearance.isBox3).toBe(true)
    expect(coach.userData.entryApproach.isBox3).toBe(true)
    expect(coach.userData.doorClearance.intersectsBox(coach.userData.entryApproach))
      .toBe(true)
    disposeObject3D(coach)
  })

  it('keeps mobile semantics identical while desktop retains denser geometry',()=>{
    const desktop=createTourCoach('desktop')
    const mobile=createTourCoach('mobile')
    names.forEach(name=>{
      expect(desktop.getObjectByName(name)).toBeTruthy()
      expect(mobile.getObjectByName(name)).toBeTruthy()
    })
    const vertices=root=>{
      let count=0
      root.traverse(object=>{count+=object.geometry?.attributes?.position?.count||0})
      return count
    }
    expect(vertices(desktop)).toBeGreaterThan(vertices(mobile))
    expect(mobile.userData.dimensions).toEqual(desktop.userData.dimensions)
    expect(mobile.userData.footprint.min.toArray())
      .toEqual(desktop.userData.footprint.min.toArray())
    expect(mobile.userData.footprint.max.toArray())
      .toEqual(desktop.userData.footprint.max.toArray())
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })

  it('is deterministic across repeated builds',()=>{
    const signature=quality=>{
      const coach=createTourCoach(quality)
      const result=[]
      coach.traverse(object=>{
        if(object.isMesh){
          result.push([
            object.name,
            object.geometry.type,
            object.geometry.attributes.position.count,
            object.position.toArray(),
            object.rotation.toArray().slice(0,3),
          ])
        }
      })
      disposeObject3D(coach)
      return result
    }
    expect(signature('desktop')).toEqual(signature('desktop'))
  })
})
