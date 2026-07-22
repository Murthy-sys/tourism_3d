import { describe,expect,it } from 'vitest'
import { createJungleWorld } from './jungleWorld'
import { createMaterials,disposeObject3D } from './primitives'

const treeCount=world=>['jungle-foreground','jungle-midground','jungle-background']
  .reduce((count,name)=>count+world.getObjectByName(name).children.length,0)
const meshCount=object=>{let count=0;object.traverse(child=>{if(child.isMesh)count++});return count}

describe('jungle world',()=>{
  it('contains dense layered vegetation, timber, marsh edge and landing',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    ;['jungle-foreground','jungle-midground','jungle-background','forest-track','jungle-mist','ranger-outpost','jungle-rocks','jungle-puddles','jungle-undergrowth','jungle-vines','jungle-fallen-timber','forest-marsh-edge','forest-landing'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    expect(treeCount(world)).toBeGreaterThanOrEqual(55)
    expect(meshCount(world.getObjectByName('jungle-undergrowth'))).toBeGreaterThanOrEqual(140)
    disposeObject3D(world)
  })

  it('keeps the mobile forest dense enough for a continuous canopy',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    expect(treeCount(world)).toBeGreaterThanOrEqual(32)
    expect(meshCount(world.getObjectByName('jungle-undergrowth'))).toBeGreaterThanOrEqual(70)
    disposeObject3D(world)
  })

  it('aligns the physical landing with the jeep route endpoint',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    const endpoint=world.userData.route.getPoint(1)
    expect(world.userData.landing).toBe(world.getObjectByName('forest-landing'))
    expect(world.userData.landing.position.distanceTo(endpoint)).toBeLessThanOrEqual(6)
    disposeObject3D(world)
  })
})
