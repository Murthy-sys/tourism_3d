import { describe,expect,it } from 'vitest'
import { createJungleWorld } from './jungleWorld'
import { createMaterials,disposeObject3D } from './primitives'
describe('jungle world',()=>{it('contains layered vegetation, track, mist and outpost',()=>{const world=createJungleWorld(createMaterials(),'desktop');['jungle-foreground','jungle-midground','jungle-background','forest-track','jungle-mist','ranger-outpost','jungle-rocks','jungle-puddles'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy());disposeObject3D(world)})})
