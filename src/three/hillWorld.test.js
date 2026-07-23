import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createHillWorld } from './hillWorld'
import { updateHillWorld } from './hillWorld'
import { createMaterials, disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'

describe('hill world',()=>{
  it('builds a natural mountain opening with a visible water destination',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    ;['hill-terrain','hill-ridges','hill-rock-faces','hill-vegetation','hill-mist','hill-trail','mountain-water-landing','distant-water-glint']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    ;['glacier','drifting-snow','ice-foreground','monument']
      .forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
    expect(world.userData.route.getPoints(24).slice(0,-1).every(point=>Math.abs(point.y-world.userData.heightAt(point.x,point.z))<.3)).toBe(true)
    disposeObject3D(world)
  })

  it('uses the requested terrain quality and exposes journey anchors',()=>{
    const desktop=createHillWorld(createMaterials(),'desktop')
    const mobile=createHillWorld(createMaterials(),'mobile')
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.position.count).toBe((112+1)*(120+1))
    expect(mobile.getObjectByName('hill-terrain').geometry.attributes.position.count).toBe((64+1)*(76+1))
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.color).toBeTruthy()
    expect(desktop.getObjectByName('hill-terrain').material.userData.surfaceDetail)
      .toBe('multiscale-color-noise')
    expect(desktop.getObjectByName('hill-terrain').geometry.userData.colorVariation)
      .toBeGreaterThan(.08)
    expect(desktop.userData.route.points).toHaveLength(32)
    expect(desktop.userData.landing).toBe(desktop.getObjectByName('mountain-water-landing'))
    expect(desktop.userData.distantWaterAnchor.isVector3).toBe(true)
    const mist=desktop.getObjectByName('hill-mist')
    expect(mist.children.every(pocket=>
      pocket.material.transparent&&
      pocket.material.opacity<=.025&&
      pocket.geometry.parameters.width<=12
    )).toBe(true)
    const before=mist.children[0].position.x
    updateHillWorld(desktop,2)
    expect(mist.children[0].position.x).not.toBe(before)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })

  it('aligns the route and landing root to the full 3D mountain landmark',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const landmark=new THREE.Vector3(...LANDMARKS.mountainLanding)
    expect(world.userData.route.getPointAt(1).distanceTo(landmark)).toBeLessThan(1e-6)
    expect(world.userData.landing.getWorldPosition(new THREE.Vector3()).distanceTo(landmark)).toBeLessThan(1e-6)
    disposeObject3D(world)
  })

  it('keeps foreground rocks subordinate to the trekking party and landscape',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const sizes=[]
    world.traverse(object=>{
      if(object.name==='rock-outcrop'){
        const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3())
        sizes.push(Math.max(size.x,size.y,size.z))
      }
    })
    expect(Math.max(...sizes)).toBeLessThan(2.8)
    disposeObject3D(world)
  })
})
