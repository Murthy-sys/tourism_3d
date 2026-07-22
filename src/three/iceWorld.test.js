import { describe,expect,it } from 'vitest'
import { createIceWorld,updateIceWorld } from './iceWorld'
import { createMaterials,disposeObject3D } from './primitives'
describe('ice world',()=>{it('contains layered mountains, glacier, trail, camp and snow',()=>{const world=createIceWorld(createMaterials(),'desktop');['ice-foreground','ice-midground','ice-background','glacier','trek-path','base-camp','drifting-snow','contact-shelter'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy());updateIceWorld(world,1);disposeObject3D(world)})})
