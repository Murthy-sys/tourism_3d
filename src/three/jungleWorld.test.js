import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createJungleWorld } from './jungleWorld'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
describe('jungle world',()=>{it('contains layered vegetation, track, mist and outpost',()=>{const world=createJungleWorld(createMaterials(),'desktop');['jungle-foreground','jungle-midground','jungle-background','forest-track','jungle-mist','ranger-outpost','jungle-rocks','jungle-puddles'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy());disposeObject3D(world)})})

it('creates layered dense forest around a clear jeep route',()=>{
  const world=createJungleWorld(createMaterials(),'desktop')
  ;['forest-inlet','forest-water-landing','forest-near-layer','forest-mid-layer','forest-far-layer','jungle-undergrowth','jungle-vines','jungle-mist']
    .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
  expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
  expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(180)
  expect(world.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
  expect(world.userData.routeClearance).toBeGreaterThanOrEqual(1.4)
  disposeObject3D(world)
})
