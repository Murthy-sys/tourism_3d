import { describe,expect,it } from 'vitest'
import { createMaterials,disposeObject3D } from './primitives'
import { createWaterWorld,updateWaterWorld } from './waterWorld'
describe('water world',()=>{it('contains water, shoreline, jetty, rocks and wake',()=>{const world=createWaterWorld(createMaterials(),'desktop');['reflective-water','water-shoreline','boat-jetty','water-rocks','water-reeds','boat-wake'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy());updateWaterWorld(world,1);expect(world.getObjectByName('reflective-water').position.y).not.toBe(0);disposeObject3D(world)})})
