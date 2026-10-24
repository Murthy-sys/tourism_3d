import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { ARRIVAL_DURATION,createArrivalController,getArrivalCameraFrame,createArrivalClouds } from './arrival'
import { sampleMountainHeight } from './terrain'

const destination={camera:[8,5,54],target:[-2,1.5,34]}

describe('cloud arrival',()=>{
  it('stays above the clouds until Start and completes exactly once',()=>{
    const arrival=createArrivalController(true)
    expect(arrival.advance(1/60)).toBe(false)
    expect(arrival.phase()).toBe('waiting')
    expect(arrival.progress()).toBe(0)
    arrival.setPhase('playing')
    let completions=0
    for(let frame=0;frame<Math.ceil(ARRIVAL_DURATION*60)+2;frame++){
      if(arrival.advance(1/60)) completions++
    }
    expect(arrival.phase()).toBe('complete')
    expect(arrival.progress()).toBe(1)
    expect(completions).toBe(1)
    arrival.setPhase('playing')
    expect(arrival.phase()).toBe('complete')
  })

  it('supports skip and reduced motion without a camera flight',()=>{
    const skip=createArrivalController(true)
    skip.setPhase('complete')
    expect(skip.progress()).toBe(1)
    const reduced=createArrivalController(true)
    reduced.setPhase('playing')
    expect(reduced.advance(0,true)).toBe(true)
    expect(reduced.progress()).toBe(1)
  })

  it('does not skip the reveal after a suspended tab resumes',()=>{
    const arrival=createArrivalController(true)
    arrival.setPhase('playing')
    arrival.advance(30)
    arrival.advance(NaN)
    expect(arrival.progress()).toBe(0)
  })

  it('lands precisely at the original vehicle composition without a final jump',()=>{
    const start=getArrivalCameraFrame(destination,0)
    expect(start.camera[1]).toBeGreaterThan(40)
    expect(getArrivalCameraFrame(destination,1)).toEqual(destination)
    const almost=getArrivalCameraFrame(destination,.999)
    expect(Math.hypot(...almost.camera.map((n,i)=>n-destination.camera[i]))).toBeLessThan(.001)
    let previous=start.camera[1]
    for(let step=1;step<=100;step++){
      const frame=getArrivalCameraFrame(destination,step/100)
      expect(frame.camera[1]).toBeLessThanOrEqual(previous)
      expect(frame.target[0]).toBe(destination.target[0])
      expect(frame.target[2]).toBe(destination.target[2])
      previous=frame.camera[1]
    }
  })

  it.each([
    ['desktop',{camera:[8.5,3.8,46],target:[-2,1.55,34.8]}],
    ['mobile',{camera:[3.5,5.1,67],target:[-2.5,1.55,34.8]}],
  ])('reveals sky then ground on one smooth %s descent above the terrain',(_quality,landing)=>{
    const start=getArrivalCameraFrame(landing,0)
    const direction=frame=>new THREE.Vector3(...frame.target).sub(new THREE.Vector3(...frame.camera)).normalize()
    expect(direction(start).y).toBeGreaterThan(.1)
    expect(direction(getArrivalCameraFrame(landing,.48)).y).toBeLessThan(-.35)
    let previous=start,previousDirection=direction(start)
    for(let step=1;step<=384;step++){
      const frame=getArrivalCameraFrame(landing,step/384)
      const camera=new THREE.Vector3(...frame.camera)
      expect(camera.y-sampleMountainHeight(camera.x,camera.z)).toBeGreaterThan(3)
      expect(camera.distanceTo(new THREE.Vector3(...previous.camera))).toBeLessThan(.5)
      expect(direction(frame).angleTo(previousDirection)).toBeLessThan(.025)
      previous=frame
      previousDirection=direction(frame)
    }
    expect(getArrivalCameraFrame(landing,1)).toEqual(landing)
  })

  it('removes cloud overdraw after arrival while preserving reusable materials',()=>{
    const clouds=createArrivalClouds(destination)
    clouds.update(0)
    expect(clouds.group.visible).toBe(true)
    const maps=new Set(clouds.group.children.map(cloud=>cloud.material.map))
    expect(maps.size).toBe(1)
    const start=getArrivalCameraFrame(destination,0)
    const forward=new THREE.Vector3(...start.target).sub(new THREE.Vector3(...start.camera)).normalize()
    const inFront=clouds.group.children.filter(cloud=>
      cloud.position.clone().sub(new THREE.Vector3(...start.camera)).dot(forward)>0)
    expect(inFront.length).toBe(clouds.group.children.length)
    const heights=clouds.group.children.map(cloud=>cloud.position.y)
    clouds.update(.4)
    // Fixed-altitude clouds are passed during the descent instead of following
    // the camera and concealing the road until the last frame.
    clouds.group.children.forEach((cloud,index)=>expect(cloud.position.y).toBe(heights[index]))
    expect(clouds.group.children[0].material.opacity).toBeLessThan(.3)
    clouds.update(1)
    expect(clouds.group.visible).toBe(false)
    clouds.group.children.forEach(cloud=>cloud.material.dispose())
    maps.forEach(map=>map.dispose())
  })
})
