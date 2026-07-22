import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import * as hillWorld from './hillWorld'
import {createMaterials,disposeObject3D} from './primitives'

const {createHillWorld,updateHillWorld}=hillWorld
const materialSet=root=>{
  const materials=new Set()
  root.traverse(object=>(Array.isArray(object.material)?object.material:[object.material]).filter(Boolean).forEach(material=>materials.add(material)))
  return materials
}

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
    const position=terrain.geometry.attributes.position
    const mismatches=[]
    for(let i=0;i<color.count;i++){
      const actual=new THREE.Color(color.getX(i),color.getY(i),color.getZ(i)).getHexString()
      const x=position.getX(i),z=position.getZ(i)
      const slope=Math.hypot(
        world.userData.heightAt(x+.15,z)-world.userData.heightAt(x-.15,z),
        world.userData.heightAt(x,z+.15)-world.userData.heightAt(x,z-.15),
      )/.3
      const expected=hillWorld.getHillTerrainColor(slope).slice(1)
      colors.add(actual)
      if(actual!==expected)mismatches.push({actual,expected,slope})
    }
    expect(mismatches).toEqual([])
    ;['496b35','66513a','59605b'].forEach(hex=>expect(colors.has(hex)).toBe(true))

    const ridges=world.getObjectByName('hill-ridges').children
    expect(ridges).toHaveLength(3)
    expect(ridges.every(ridge=>ridge.geometry.type==='PlaneGeometry')).toBe(true)
    expect(ridges.map(ridge=>ridge.position.z)).toEqual([-38,-50,-62])
    expect(ridges[0].material.opacity).toBeGreaterThan(ridges[1].material.opacity)
    expect(ridges[1].material.opacity).toBeGreaterThan(ridges[2].material.opacity)
    disposeObject3D(world)
  })

  it('maps the exact slope thresholds to grass, earth and rock',()=>{
    expect(hillWorld.getHillTerrainColor(.8-1e-9)).toBe('#496b35')
    expect(hillWorld.getHillTerrainColor(.8)).toBe('#66513a')
    expect(hillWorld.getHillTerrainColor(1.45-1e-9)).toBe('#66513a')
    expect(hillWorld.getHillTerrainColor(1.45)).toBe('#59605b')
  })

  it('owns materials independently of the shared palette and other hill worlds',()=>{
    const materials=createMaterials()
    const first=createHillWorld(materials,'mobile')
    const second=createHillWorld(materials,'mobile')
    const shared=new Set(Object.values(materials))
    const firstMaterials=materialSet(first)
    const secondMaterials=materialSet(second)
    expect([...firstMaterials].every(material=>!shared.has(material))).toBe(true)
    expect([...secondMaterials].every(material=>!shared.has(material))).toBe(true)
    expect([...firstMaterials].every(material=>!secondMaterials.has(material))).toBe(true)
    disposeObject3D(first)
    disposeObject3D(second)
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
    expect(world.userData.landing.position.distanceTo(new THREE.Vector3(start.x-3.3,start.y-.08,start.z))).toBeLessThan(.01)
    expect(world.getObjectByName('hill-lodge').position.distanceTo(new THREE.Vector3(end.x,end.y-.08,end.z))).toBeLessThan(.01)
    expect(world.userData.copyAnchor.y).toBeGreaterThan(end.y)
    disposeObject3D(world)
  })

  it('fills the hill country with bushes, dense grass and varied ground detail',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const bushes=world.getObjectByName('hill-bushes')
    const grass=world.getObjectByName('hill-grass-clumps')
    const detail=world.getObjectByName('hill-ground-detail')
    expect(bushes?.children.length).toBeGreaterThanOrEqual(54)
    expect(grass?.children.length).toBeGreaterThanOrEqual(110)
    expect(detail?.children.length).toBeGreaterThanOrEqual(46)
    expect(new Set(detail.children.map(child=>child.userData.detailType))).toEqual(new Set(['stone','earth','flowers']))
    const routePoints=world.userData.route.getSpacedPoints(120)
    const nearTrail=grass.children.filter(clump=>routePoints.some(point=>Math.hypot(point.x-clump.position.x,point.z-clump.position.z)<4.8))
    expect(nearTrail.length).toBeGreaterThanOrEqual(100)
    ;[bushes,grass,detail].forEach(group=>group.children.forEach(child=>{
      expect(Math.abs(child.position.y-world.userData.heightAt(child.position.x,child.position.z))).toBeLessThan(.35)
    }))
    disposeObject3D(world)
  })

  it('keeps meaningful hill ground detail on mobile',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    expect(world.getObjectByName('hill-bushes')?.children.length).toBeGreaterThanOrEqual(32)
    expect(world.getObjectByName('hill-grass-clumps')?.children.length).toBeGreaterThanOrEqual(62)
    expect(world.getObjectByName('hill-ground-detail')?.children.length).toBeGreaterThanOrEqual(28)
    disposeObject3D(world)
  })

  it('grades the complete lodge foundation footprint to the terrain',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const lodge=world.getObjectByName('hill-lodge')
    const foundation=world.getObjectByName('hill-lodge-foundation')
    expect(foundation).toBeTruthy()
    world.updateMatrixWorld(true)
    const bounds=new THREE.Box3().setFromObject(foundation)
    for(const dx of [-2.55,-1.275,0,1.275,2.55]){
      for(const dz of [-1.9,-.95,0,.95,1.9]){
        const terrainY=world.userData.heightAt(lodge.position.x+dx,lodge.position.z+dz)
        expect(terrainY).toBeCloseTo(bounds.min.y,5)
        expect(terrainY).toBeLessThan(bounds.max.y)
      }
    }
    const terrain=world.getObjectByName('hill-terrain').geometry.attributes.position
    let footprintVertices=0
    for(let i=0;i<terrain.count;i++){
      const x=terrain.getX(i),z=terrain.getZ(i)
      if(Math.abs(x-lodge.position.x)>2.65||Math.abs(z-lodge.position.z)>2)continue
      footprintVertices++
      expect(terrain.getY(i)).toBeCloseTo(bounds.min.y,5)
    }
    expect(footprintVertices).toBeGreaterThan(20)
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
    updateHillWorld(world,0)
    mist.children.forEach((volume,index)=>expect(volume.position.x).toBeCloseTo(before[index].position.x,6))
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

  it('owns warm local hill-country lighting for transition blending',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    const sun=world.getObjectByName('hill-country-sun')
    const fill=world.getObjectByName('hill-country-fill')
    expect(sun?.isDirectionalLight).toBe(true)
    expect(fill?.isHemisphereLight).toBe(true)
    expect(sun.userData.baseIntensity).toBeGreaterThan(0)
    expect(sun.target.parent).toBe(world)
    expect(Math.abs(sun.target.position.x)).toBeLessThanOrEqual(32)
    expect(sun.target.position.z).toBeGreaterThanOrEqual(-36)
    expect(sun.target.position.z).toBeLessThanOrEqual(36)
    disposeObject3D(world)
  })
})
