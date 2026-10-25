import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { createExpeditionController } from './expeditionController'
import { createMaterials } from './primitives'
import { getExpeditionState } from './journeyData'
import { getCityCameraFrame,getCityJourneyState,updateCityCoach } from './cityJourney'
import { createTourCoach } from './tourCoach'
import { disposeObject3D } from './primitives'

describe('city departure journey',()=>{
  it('holds both stops and points the coach along the continuous driving route',()=>{
    const city=getCityJourneyState(0)
    expect(city.position.toArray()).toEqual([-4,.35,150])
    expect(getCityJourneyState(.045).position.toArray()).toEqual(city.position.toArray())
    const arrival=getCityJourneyState(.105)
    expect(arrival.position.x).toBeCloseTo(-4,8)
    expect(arrival.position.z).toBeCloseTo(34,8)
    expect(arrival.heading).toBeCloseTo(-Math.PI/2,4)
    expect(getCityJourneyState(1).position.toArray()).toEqual(arrival.position.toArray())
    let previous=city
    for(let index=1;index<=6000;index++){
      const current=getCityJourneyState(.045+index*.00001)
      expect(current.position.distanceTo(previous.position)).toBeLessThan(.1)
      const direction=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),current.heading)
      const displacement=current.position.clone().sub(previous.position).setY(0)
      if(displacement.length()>1e-7) expect(direction.dot(displacement.normalize())).toBeGreaterThan(.999)
      previous=current
    }
  })

  it('frames the city first and returns to the retained trailhead composition',()=>{
    expect(getCityCameraFrame(0,'desktop')).toEqual({camera:[12,8,124],target:[-5,3,160]})
    expect(getCityCameraFrame(0,'mobile')).toEqual({camera:[13,11,112],target:[-4,3,157]})
    expect(getCityCameraFrame(.105,'desktop')).toEqual({camera:[8.5,3.8,46],target:[-2,1.55,34.8]})
    expect(getCityCameraFrame(.105,'mobile')).toEqual({camera:[3.5,5.1,67],target:[-2.5,1.55,34.8]})
  })

  it('closes its door before travel and restores exact wheel and door poses on reverse scroll',()=>{
    const coach=createTourCoach('mobile')
    const door=coach.getObjectByName('tour-coach-door-pivot')
    const snapshot=progress=>{
      updateCityCoach(coach,progress)
      coach.updateMatrixWorld(true)
      return {matrix:coach.matrixWorld.toArray(),wheels:coach.userData.wheels.map(wheel=>wheel.quaternion.toArray()),door:door.rotation.y}
    }
    try{
      const boarding=snapshot(.035)
      expect(boarding.door).toBeLessThan(-.5)
      const driving=snapshot(.072)
      expect(Math.abs(driving.door)).toBe(0)
      const parked=snapshot(.12)
      expect(parked.door).toBeLessThan(-.5)
      expect(snapshot(.072)).toEqual(driving)
      expect(snapshot(.035)).toEqual(boarding)
      expect(snapshot(.12)).toEqual(parked)
    }finally{disposeObject3D(coach)}
  })

  it.each(['mobile','desktop'])('grounds the %s coach on the rendered access road and keeps scrubbing deterministic',quality=>{
    const scene=new THREE.Scene(),materials=createMaterials()
    const controller=createExpeditionController(scene,materials,quality)
    const coach=controller.scenery.coach
    const road=controller.worlds.mountain.getObjectByName('trailhead-road-surface')
    const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0))
    let maximumCenterGap=0,maximumWheelGap=0,worstWheel=null,hitCount=0
    try{
      for(let index=1;index<100;index++){
        const progress=.045+index*.0006
        controller.update(getExpeditionState(progress),index/10,false)
        scene.updateMatrixWorld(true)
        ray.ray.origin.set(coach.position.x,60,coach.position.z)
        const centerHit=ray.intersectObject(road,false)[0]
        if(!centerHit) continue
        hitCount++
        maximumCenterGap=Math.max(maximumCenterGap,Math.abs(coach.position.y-centerHit.point.y))
        for(const contact of coach.userData.wheelContactPoints){
          const point=coach.localToWorld(contact.clone())
          ray.ray.origin.set(point.x,60,point.z)
          const hit=ray.intersectObject(road,false)[0]
          if(!hit) continue
          const gap=Math.abs(point.y-hit.point.y)
          if(gap>maximumWheelGap){
            maximumWheelGap=gap
            worstWheel={progress,contact:contact.toArray(),actual:point.toArray(),road:hit.point.y,coach:coach.position.toArray(),rotation:coach.rotation.toArray()}
          }
        }
      }
      expect(hitCount).toBeGreaterThan(50)
      // A rigid chassis spans road crests; its axle contact points own grounding.
      expect(maximumCenterGap).toBeLessThan(.35)
      expect(maximumWheelGap,`wheel gap ${maximumWheelGap}: ${JSON.stringify(worstWheel)}`).toBeLessThan(.1)
      controller.update(getExpeditionState(.072),15,false)
      const pose=()=>({position:coach.position.toArray(),rotation:coach.quaternion.toArray(),wheels:coach.userData.wheels.map(wheel=>wheel.quaternion.toArray())})
      const before=pose()
      controller.update(getExpeditionState(.12),20,false)
      controller.update(getExpeditionState(.072),60,true)
      expect(pose()).toEqual(before)
    }finally{
      controller.dispose()
      Object.values(materials).forEach(material=>material.dispose())
    }
  })
})
