import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createMaterials,disposeObject3D} from './primitives'
import {createTrailhead} from './trailhead'
import {LANDMARKS,sampleMountainHeight} from './terrain'

const standingPoses=[
  {role:'guide',position:[3.2,.35,33.7],heading:-3.04},
  {role:'tourist',position:[1.8,.35,36.5],heading:-2.35},
  {role:'tourist',position:[3.2,.35,36.7],heading:2.65},
  {role:'tourist',position:[2.4,.35,38],heading:-2.7},
]

const route=new THREE.CatmullRomCurve3([
  new THREE.Vector3(...LANDMARKS.trailheadStart),
  new THREE.Vector3(...LANDMARKS.mountainEntry),
  new THREE.Vector3(...LANDMARKS.mountainStart),
])

describe('trailhead clearing',()=>{
  it('builds gravel, earth, tracks, damp patches, and natural edge detail',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(trailhead.getObjectByName(name)).toBeTruthy())
    expect(trailhead.userData.coachPose.position.toArray()).toEqual([
      -4,
      sampleMountainHeight(-4,34),
      34,
    ])
    expect(trailhead.userData.coachPose.heading).toBe(-Math.PI/2)
    expect(trailhead.userData.routeClearance).toBeGreaterThanOrEqual(1.5)
    expect(trailhead.userData.cameraClearance).toBeGreaterThanOrEqual(3)
    disposeObject3D(trailhead)
  })

  it('keeps every edge obstacle outside the walking corridor, coach turnout, and party',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    const samples=route.getSpacedPoints(80)
    trailhead.userData.routeObstacles.forEach(bounds=>{
      samples.forEach(point=>expect(bounds.distanceToPoint(point))
        .toBeGreaterThanOrEqual(trailhead.userData.routeClearance))
      expect(bounds.intersectsBox(trailhead.userData.turnoutBounds)).toBe(false)
      standingPoses.forEach(pose=>{
        const [x,y,z]=pose.position
        expect(bounds.distanceToPoint(new THREE.Vector3(x,y,z))).toBeGreaterThan(.8)
      })
    })
    disposeObject3D(trailhead)
  })

  it('preserves semantic groups on mobile with fewer decorative instances',()=>{
    const options={heightAt:sampleMountainHeight,route,standingPoses}
    const desktop=createTrailhead(createMaterials(),{...options,quality:'desktop'})
    const mobile=createTrailhead(createMaterials(),{...options,quality:'mobile'})
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(mobile.getObjectByName(name)).toBeTruthy())
    expect(desktop.userData.routeObstacles.length)
      .toBeGreaterThan(mobile.userData.routeObstacles.length)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })
})
