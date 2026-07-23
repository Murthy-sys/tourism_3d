import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createWaterWorld,updateWaterWorld } from './waterWorld'
describe('water world',()=>{
  it('contains water, shoreline, jetty, rocks and wake',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    ;['reflective-water','water-shoreline','boat-jetty','water-rocks','water-reeds','boat-wake'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    updateWaterWorld(world,1)
    expect(world.getObjectByName('reflective-water').position.y).not.toBe(0)
    disposeObject3D(world)
  })

  it('creates a shaped reflective corridor with two aligned landings',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    ;['water-depth-layer','water-reflection-layer','water-shallows','curved-river-banks','mountain-water-landing','forest-water-landing','distant-forest-silhouette']
      .forEach(name=>expect(water.getObjectByName(name)).toBeTruthy())
    expect(water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(2)
    expect(water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
    expect(water.userData.mountainLanding).toBe(water.getObjectByName('mountain-water-landing'))
    expect(water.userData.forestLanding).toBe(water.getObjectByName('forest-water-landing'))
    expect(water.userData.forestSightline).toBe(water.getObjectByName('distant-forest-silhouette'))
    expect(water.userData.surfaceMaterials.every(material=>material.roughness<.45)).toBe(true)
    disposeObject3D(water)
  })
})
