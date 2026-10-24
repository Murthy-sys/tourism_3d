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

  it.each(['desktop','mobile'])('cuts real tire and entry openings through every body panel on %s',quality=>{
    const coach=createTourCoach(quality)
    const body=coach.getObjectByName('coach-body')
    const ray=new THREE.Raycaster()
    ray.far=1
    const hits=(side,y,z)=>{
      ray.set(new THREE.Vector3(side*2,y,z),new THREE.Vector3(-side,0,0))
      return ray.intersectObject(body,true)
    }
    coach.userData.wheels.forEach(wheel=>{
      const side=Math.sign(wheel.position.x),z=wheel.position.z
      expect(hits(side,.85,z)).toHaveLength(0)
      expect(hits(side,1.04,z)).toHaveLength(0)
      expect(hits(side,1.32,z).length).toBeGreaterThan(0)
      expect(hits(side,.8,z+.8).length).toBeGreaterThan(0)
      const tireBounds=new THREE.Box3().setFromObject(wheel.getObjectByName('tour-coach-tire'))
      expect(tireBounds.max.x).toBeLessThan(1.276)
      expect(tireBounds.min.x).toBeGreaterThan(-1.276)
      expect(tireBounds.min.y).toBeCloseTo(0,6)
    })
    expect(hits(1,1.5,-3.58)).toHaveLength(0)
    const frontRight=coach.userData.wheels.find(wheel=>wheel.userData.axle==='front'&&wheel.userData.side==='right')
    const frontTire=new THREE.Box3().setFromObject(frontRight)
    expect(frontTire.min.z).toBeGreaterThan(coach.userData.doorClearance.max.z)
    disposeObject3D(coach)
  })

  it('uses uninterrupted side glazing and a physically curved, raked windscreen',()=>{
    const coach=createTourCoach('desktop')
    const pane=coach.getObjectByName('tour-coach-side-glass-left')
    const screen=coach.getObjectByName('tour-coach-windscreen')
    const ray=new THREE.Raycaster()
    for(let z=-5;z<=5;z+=.25){
      ray.set(new THREE.Vector3(-2,2.5,z),new THREE.Vector3(1,0,0))
      expect(ray.intersectObject(pane).length).toBeGreaterThan(0)
    }
    const screenZ=(x,y)=>{
      ray.set(new THREE.Vector3(x,y,-7),new THREE.Vector3(0,0,1))
      const intersections=ray.intersectObject(screen)
      expect(intersections.length).toBeGreaterThan(0)
      return intersections[0].point.z
    }
    expect(screenZ(.95,2.4)-screenZ(0,2.4)).toBeGreaterThan(.08)
    expect(screenZ(0,3.05)-screenZ(0,1.8)).toBeGreaterThan(.25)
    disposeObject3D(coach)
  })

  it.each(['desktop','mobile'])('closes the curved rear glazing corners on %s',quality=>{
    const coach=createTourCoach(quality)
    const ray=new THREE.Raycaster()
    ray.far=1.2
    ;[-1,1].forEach(side=>{
      // Sample the formerly open corner, including its narrowing raked top.
      ;[[2,5.59],[2.4,5.6],[2.8,5.52],[3.1,5.405]].forEach(([y,z])=>{
        ray.set(new THREE.Vector3(side*2,y,z),new THREE.Vector3(-side,0,0))
        const hits=ray.intersectObject(coach.getObjectByName('tour-coach-rear-window'))
        expect(hits.length).toBeGreaterThan(0)
        expect(Math.abs(hits[0].point.x)).toBeGreaterThan(1.1)
      })
    })
    disposeObject3D(coach)
  })

  it.each(['desktop','mobile'])('keeps detailed geometry consolidated and owned on %s',quality=>{
    const coach=createTourCoach(quality)
    let draws=0,triangles=0
    coach.traverse(object=>{
      if(!object.isMesh) return
      draws+=Array.isArray(object.material)?object.geometry.groups.length:1
      triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3
    })
    expect(draws).toBeLessThanOrEqual(48)
    expect(triangles).toBeLessThan(quality==='mobile'?15000:30000)
    const tireGeometries=new Set(coach.userData.wheels.map(wheel=>wheel.getObjectByName('tour-coach-tire').geometry))
    expect(tireGeometries.size).toBe(1)
    expect(coach.getObjectByName('tour-coach-shell').material.roughnessMap.userData.ownedByJourney).toBe(true)
    expect(coach.userData.vehicleBounds.max.x).toBeLessThan(1.85)
    expect(coach.userData.vehicleBounds.max.y).toBeCloseTo(3.55,5)
    expect(coach.userData.vehicleBounds.min.z).toBeGreaterThan(-6.16)
    expect(coach.userData.vehicleBounds.max.z).toBeLessThan(6.16)
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
