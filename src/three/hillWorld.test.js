import { describe, expect, it } from 'vitest'
import { createHillWorld } from './hillWorld'
import { updateHillWorld } from './hillWorld'
import { createMaterials, disposeObject3D } from './primitives'

describe('hill world',()=>{
  it('builds a natural mountain opening with a visible water destination',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    ;['hill-terrain','hill-ridges','hill-rock-faces','hill-vegetation','hill-mist','hill-trail','mountain-water-landing','distant-water-glint']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    ;['glacier','drifting-snow','ice-foreground','monument']
      .forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
    expect(world.userData.route.getPoints(24).every(point=>Math.abs(point.y-world.userData.heightAt(point.x,point.z))<.3)).toBe(true)
    disposeObject3D(world)
  })

  it('uses the requested terrain quality and exposes journey anchors',()=>{
    const desktop=createHillWorld(createMaterials(),'desktop')
    const mobile=createHillWorld(createMaterials(),'mobile')
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.position.count).toBe((112+1)*(120+1))
    expect(mobile.getObjectByName('hill-terrain').geometry.attributes.position.count).toBe((64+1)*(76+1))
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.color).toBeTruthy()
    expect(desktop.userData.route.points).toHaveLength(32)
    expect(desktop.userData.landing).toBe(desktop.getObjectByName('mountain-water-landing'))
    expect(desktop.userData.distantWaterAnchor.isVector3).toBe(true)
    const mist=desktop.getObjectByName('hill-mist')
    const before=mist.children[0].position.x
    updateHillWorld(desktop,2)
    expect(mist.children[0].position.x).not.toBe(before)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })
})
