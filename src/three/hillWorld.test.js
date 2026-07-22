import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createHillWorld,updateHillWorld} from './hillWorld'
import {createMaterials,disposeObject3D} from './primitives'

describe('hill world',()=>{
  it('creates lush non-conical hill country without ice assets',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    ;['hill-terrain','hill-ridges','hill-forest','hill-rock-faces','hill-mist','hill-trail','hill-landing','hill-lodge'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    ;['glacier','drifting-snow','ice-foreground','ice-midground','ice-background'].forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
    expect(world.userData.route.getPoints(20).every(p=>Math.abs(p.y-world.userData.heightAt(p.x,p.z))<.25)).toBe(true)
    disposeObject3D(world)
  })

  it('uses detailed slope-colored terrain and displaced ridge ribbons',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const terrain=world.getObjectByName('hill-terrain')
    expect(terrain.geometry.parameters.width).toBe(64)
    expect(terrain.geometry.parameters.height).toBe(72)
    expect(terrain.geometry.parameters.widthSegments).toBeGreaterThanOrEqual(96)
    expect(terrain.geometry.parameters.heightSegments).toBeGreaterThanOrEqual(108)
    expect(terrain.material.vertexColors).toBe(true)
    expect(terrain.material.roughness).toBeCloseTo(.92)
    expect(terrain.material.flatShading).toBe(false)

    const colors=new Set()
    const color=terrain.geometry.attributes.color
    for(let i=0;i<color.count;i++)colors.add(new THREE.Color(color.getX(i),color.getY(i),color.getZ(i)).getHexString())
    ;['496b35','66513a','59605b'].forEach(hex=>expect(colors.has(hex)).toBe(true))

    const ridges=world.getObjectByName('hill-ridges').children
    expect(ridges).toHaveLength(3)
    expect(ridges.every(ridge=>ridge.geometry.type==='PlaneGeometry')).toBe(true)
    expect(ridges.map(ridge=>ridge.position.z)).toEqual([-38,-50,-62])
    expect(ridges[0].material.opacity).toBeGreaterThan(ridges[1].material.opacity)
    expect(ridges[1].material.opacity).toBeGreaterThan(ridges[2].material.opacity)
    disposeObject3D(world)
  })

  it('places vegetation, rocks, trail endpoints and structures on the terrain',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    const terrain=world.getObjectByName('hill-terrain')
    expect(terrain.geometry.parameters.widthSegments).toBeGreaterThanOrEqual(56)
    expect(terrain.geometry.parameters.heightSegments).toBeGreaterThanOrEqual(72)

    const forest=world.getObjectByName('hill-forest')
    const rocks=world.getObjectByName('hill-rock-faces')
    expect(forest.children.length).toBeGreaterThan(20)
    expect(forest.children.every(tree=>tree.userData.slope<1.1)).toBe(true)
    expect(rocks.children.length).toBeGreaterThan(3)
    expect(rocks.children.every(rock=>rock.userData.slope>=1.1)).toBe(true)

    expect(world.userData.route.points).toHaveLength(30)
    const [start]=world.userData.route.points
    const end=world.userData.route.points.at(-1)
    expect(world.userData.landing.position.distanceTo(new THREE.Vector3(start.x,start.y-.08,start.z))).toBeLessThan(.01)
    expect(world.getObjectByName('hill-lodge').position.distanceTo(new THREE.Vector3(end.x,end.y-.08,end.z))).toBeLessThan(.01)
    expect(world.userData.copyAnchor.y).toBeGreaterThan(end.y)
    disposeObject3D(world)
  })

  it('drifts exactly eight mist volumes horizontally',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const mist=world.userData.mist
    expect(mist).toBe(world.getObjectByName('hill-mist'))
    expect(mist.children).toHaveLength(8)
    mist.children.forEach(volume=>{
      const {x,z}=volume.position
      const surrounding=[[3,0],[-3,0],[0,3],[0,-3]].map(([dx,dz])=>world.userData.heightAt(x+dx,z+dz))
      expect(world.userData.heightAt(x,z)).toBeLessThan(surrounding.reduce((sum,value)=>sum+value,0)/surrounding.length)
    })
    const before=mist.children.map(volume=>({position:volume.position.clone(),rotation:volume.rotation.clone()}))
    const terrainPosition=world.getObjectByName('hill-terrain').position.clone()
    updateHillWorld(world,12)
    mist.children.forEach((volume,index)=>{
      expect(volume.position.x).not.toBeCloseTo(before[index].position.x,6)
      expect(volume.position.y).toBeCloseTo(before[index].position.y,6)
      expect(volume.position.z).toBeCloseTo(before[index].position.z,6)
      expect(volume.rotation.toArray()).toEqual(before[index].rotation.toArray())
    })
    expect(world.getObjectByName('hill-terrain').position.equals(terrainPosition)).toBe(true)
    disposeObject3D(world)
  })
})
