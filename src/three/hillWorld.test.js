import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createHillWorld } from './hillWorld'
import { updateHillWorld } from './hillWorld'
import { createMaterials, disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createWaterWorld } from './waterWorld'
import { sampleRiverCrossSection,sampleRiverSurface } from './riverConfig'

describe('hill world',()=>{
  it('keeps distant ridge aprons out of the river handoff sightline',()=>{
    const hill=createHillWorld(createMaterials(),'desktop')
    const water=createWaterWorld(createMaterials(),'desktop')
    hill.updateMatrixWorld(true)
    water.updateMatrixWorld(true)
    const camera=new THREE.PerspectiveCamera(48,2100/900,.1,420)
    // Settled desktop camera at journey progress .645.
    camera.position.set(1.962748,3.80172,-73.933099)
    camera.lookAt(new THREE.Vector3(-1.878074,.788249,-87.980241))
    camera.updateMatrixWorld(true)
    const ray=new THREE.Raycaster()
    ;[[1400,650],[1200,600],[1700,830],[800,650]].forEach(([x,y])=>{
      ray.setFromCamera(new THREE.Vector2(x/2100*2-1,1-y/900*2),camera)
      expect(ray.intersectObject(hill.getObjectByName('hill-ridges'),true)).toHaveLength(0)
      const surface=ray.intersectObjects([hill,water],true)
        .find(hit=>hit.object.material.depthWrite)
      expect(['reflective-water','water-basin-ground']).toContain(surface.object.name)
    })
    const positions=water.getObjectByName('reflective-water').geometry.getAttribute('position')
    for(let index=0;index<positions.count;index+=1){
      ray.set(new THREE.Vector3(positions.getX(index),20,positions.getZ(index)),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(hill.getObjectByName('hill-ridges'),true)).toHaveLength(0)
    }
    disposeObject3D(hill)
    disposeObject3D(water)
  })

  it('uses horizontal heightfields instead of upright ridge-panel sheets',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    world.getObjectByName('hill-ridges').children.forEach(ridge=>{
      const position=ridge.geometry.getAttribute('position')
      const normals=ridge.geometry.getAttribute('normal')
      const index=ridge.geometry.getIndex()
      let maximum=0
      let averageUpwardNormal=0
      for(let normal=0;normal<normals.count;normal+=1){
        averageUpwardNormal+=Math.abs(normals.getY(normal))
      }
      for(let offset=0;offset<index.count;offset+=3){
        const triangle=[0,1,2].map(point=>
          new THREE.Vector3().fromBufferAttribute(position,index.getX(offset+point)),
        )
        maximum=Math.max(
          maximum,
          triangle[0].distanceTo(triangle[1]),
          triangle[1].distanceTo(triangle[2]),
          triangle[2].distanceTo(triangle[0]),
        )
      }
      expect(ridge.geometry.userData.surfaceKind).toBe('horizontal-heightfield')
      expect(averageUpwardNormal/normals.count).toBeGreaterThan(.55)
      expect(maximum).toBeLessThan(5)
    })
    disposeObject3D(world)
  })

  it('builds a natural mountain opening with a visible water destination',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    ;['hill-terrain','hill-ridges','hill-rock-faces','hill-vegetation','hill-mist','hill-trail','mountain-water-landing']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    expect(world.getObjectByName('distant-water-glint')).toBeUndefined()
    expect(world.userData.distantWaterAnchor.toArray()).toEqual([2,.4,-51])
    ;['glacier','drifting-snow','ice-foreground','monument']
      .forEach(name=>expect(world.getObjectByName(name)).toBeFalsy())
    expect(world.userData.route.getPoints(24).slice(0,-1).every(point=>Math.abs(point.y-world.userData.heightAt(point.x,point.z))<.3)).toBe(true)
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])('opens the %s mountain crest onto several parts of the broad river',quality=>{
    const hill=createHillWorld(createMaterials(),quality)
    hill.updateMatrixWorld(true)
    const origin=new THREE.Vector3(6,quality==='mobile'?17:13.5,quality==='mobile'?32:26.1)
    for(const target of [[-10,.02,-50],[0,.02,-50],[10,.02,-50],[0,.02,-65]]){
      const direction=new THREE.Vector3(...target).sub(origin)
      const ray=new THREE.Raycaster(origin,direction.clone().normalize(),0,direction.length()-.2)
      const opaqueHits=ray.intersectObject(hill,true).filter(hit=>hit.object.material.depthWrite!==false)
      expect(opaqueHits.map(hit=>hit.object.name)).toEqual([])
    }
    disposeObject3D(hill)
  })

  it('uses the requested terrain quality and exposes journey anchors',()=>{
    const desktop=createHillWorld(createMaterials(),'desktop')
    const mobile=createHillWorld(createMaterials(),'mobile')
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.color).toBeTruthy()
    expect(desktop.getObjectByName('hill-terrain').material.userData.surfaceDetail)
      .toBe('procedural-grass')
    expect(desktop.getObjectByName('hill-terrain').geometry.userData.colorVariation)
      .toBeGreaterThan(.08)
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

  it('uses detailed matte surfaces and leaf silhouettes without increasing terrain tessellation',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    const terrain=world.getObjectByName('hill-terrain')
    expect(terrain.material.map.isDataTexture).toBe(true)
    expect(terrain.material.bumpMap.isDataTexture).toBe(true)
    expect(terrain.material.roughnessMap).toBe(terrain.material.bumpMap)
    expect(terrain.material.metalness).toBe(0)
    expect(terrain.geometry.getAttribute('uv').count).toBe(terrain.geometry.getAttribute('position').count)
    expect(terrain.material.map.image.width).toBeLessThanOrEqual(128)
    const crown=world.getObjectByName('hill-leaf-crown')
    expect(crown.geometry.userData.organicSilhouette).toBe(true)
    expect(crown.material.alphaTest).toBeGreaterThan(0)
    expect(crown.material.transparent).toBe(false)
    disposeObject3D(world)
  })

  it('extends one continuous grounded route through every mountain landmark',()=>{
    const world=createHillWorld(createMaterials(),'desktop')
    const {route,routeProgress,heightAt}=world.userData
    expect(routeProgress).toEqual({
      trailheadStart:0,
      mountainEntry:expect.any(Number),
      mountainStart:expect.any(Number),
      mountainLanding:1,
    })
    expect(routeProgress.mountainEntry).toBeGreaterThan(0)
    expect(routeProgress.mountainStart).toBeGreaterThan(routeProgress.mountainEntry)
    expect(routeProgress.mountainStart).toBeLessThan(1)
    Object.entries(routeProgress).forEach(([name,progress])=>{
      const landmark=new THREE.Vector3(...LANDMARKS[name])
      expect(route.getPointAt(progress).distanceTo(landmark)).toBeLessThan(.08)
    })
    route.getSpacedPoints(120).slice(0,-1).forEach(point=>{
      expect(Math.abs(point.y-heightAt(point.x,point.z))).toBeLessThan(.3)
    })
    disposeObject3D(world)
  })

  it('composes the natural trailhead and expanded terrain at both quality levels',()=>{
    const desktop=createHillWorld(createMaterials(),'desktop')
    const mobile=createHillWorld(createMaterials(),'mobile')
    expect(desktop.userData.trailhead).toBe(desktop.getObjectByName('trailhead'))
    expect(desktop.getObjectByName('hill-terrain').geometry.attributes.position.count)
      .toBe((128+1)*(160+1))
    expect(mobile.getObjectByName('hill-terrain').geometry.attributes.position.count)
      .toBe((72+1)*(104+1))
    ;[
      'trailhead-gravel',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'hill-trail',
      'mountain-water-landing',
    ].forEach(name=>{
      expect(desktop.getObjectByName(name)).toBeTruthy()
      expect(mobile.getObjectByName(name)).toBeTruthy()
    })
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })

  it.each(['desktop','mobile'])(
    'keeps the %s gravel surface on an exact raised subset of the rendered terrain',
    quality=>{
      const world=createHillWorld(createMaterials(),quality)
      const terrain=world.getObjectByName('hill-terrain')
      const gravel=world.getObjectByName('trailhead-gravel-surface')
      const clearance=world.userData.trailhead.userData.turnoutSurfaceClearance
      expect(gravel).toBeTruthy()
      expect(clearance).toBeGreaterThan(.01)
      expect(clearance).toBeLessThan(.08)

      const signature=(position,index,offset=0)=>{
        const vertices=[0,1,2].map(vertex=>{
          const source=index.getX(vertex)
          return[
            position.getX(source).toFixed(5),
            (position.getY(source)-offset).toFixed(5),
            position.getZ(source).toFixed(5),
          ].join(',')
        })
        return vertices.sort().join('|')
      }
      const terrainPosition=terrain.geometry.getAttribute('position')
      const terrainIndex=terrain.geometry.getIndex()
      const terrainTriangles=new Set()
      for(let offset=0;offset<terrainIndex.count;offset+=3){
        terrainTriangles.add(signature(
          terrainPosition,
          {
            getX:vertex=>terrainIndex.getX(offset+vertex),
          },
        ))
      }
      const gravelPosition=gravel.geometry.getAttribute('position')
      const gravelIndex=gravel.geometry.getIndex()
      expect(gravelIndex.count).toBeGreaterThan(0)
      for(let offset=0;offset<gravelIndex.count;offset+=3){
        expect(terrainTriangles.has(signature(
          gravelPosition,
          {
            getX:vertex=>gravelIndex.getX(offset+vertex),
          },
          clearance,
        ))).toBe(true)
      }
      disposeObject3D(world)
    },
  )

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
    ;['hill-vegetation','hill-rock-faces'].forEach(name=>{
      world.getObjectByName(name).children.forEach(object=>{
        expect(sampleRiverSurface(object.position.x,object.position.z).edgeDistance).toBeGreaterThan(2.5)
      })
    })
    disposeObject3D(world)
  })

  it('drops the mountain terrain below the water surface past the landing',()=>{
    const world=createHillWorld(createMaterials(),'mobile')
    const position=world.getObjectByName('hill-terrain').geometry.getAttribute('position')
    const waterEdgeHeights=[]
    for(let index=0;index<position.count;index+=1){
      if(position.getZ(index)<-37) waterEdgeHeights.push(position.getY(index))
    }
    expect(Math.max(...waterEdgeHeights)).toBeLessThan(-.5)
    disposeObject3D(world)
  })

  it.each(['desktop','mobile'])('keeps the %s hill core and surround beneath the widened river bed',quality=>{
    const hill=createHillWorld(createMaterials(),quality)
    const water=createWaterWorld(createMaterials(),quality)
    hill.updateMatrixWorld(true)
    water.updateMatrixWorld(true)
    const terrain=hill.getObjectByName('hill-terrain'),surround=hill.getObjectByName('hill-terrain-surround')
    const basin=water.getObjectByName('water-basin-ground')
    const ray=new THREE.Raycaster()
    for(let z=-36;z>=-85;z-=1.3){
      const section=sampleRiverCrossSection(z)
      for(const across of [.02,.15,.35,.5,.7,.85,.98]){
        const x=THREE.MathUtils.lerp(section.leftX,section.rightX,across)
        ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0))
        const hillHits=ray.intersectObjects([terrain,surround])
        const bedHits=ray.intersectObject(basin)
        expect(hillHits.length).toBeGreaterThan(0)
        expect(bedHits.length).toBeGreaterThan(0)
        expect(hillHits[0].point.y,`basin clearance at ${x},${z}`).toBeLessThan(bedHits[0].point.y-.15)
        expect(hillHits[0].point.y,`sample clearance at ${x},${z}`).toBeLessThan(sampleRiverSurface(x,z).bedHeight-.15)
        expect(ray.intersectObject(hill.getObjectByName('hill-ridges'),true)).toHaveLength(0)
      }
    }
    disposeObject3D(hill)
    disposeObject3D(water)
  })

  it.each(['desktop','mobile'])('joins the %s foreground and lateral terrain without exposed borders',quality=>{
    const world=createHillWorld(createMaterials(),quality)
    const terrain=world.getObjectByName('hill-terrain')
    const surround=world.getObjectByName('hill-terrain-surround')
    expect(surround.material).toBe(terrain.material)
    const surroundPosition=surround.geometry.getAttribute('position')
    const surroundNormals=surround.geometry.getAttribute('normal')
    const points=new Map()
    for(let index=0;index<surroundPosition.count;index+=1){
      points.set(`${surroundPosition.getX(index)}:${surroundPosition.getZ(index)}`,{
        y:surroundPosition.getY(index),normal:new THREE.Vector3().fromBufferAttribute(surroundNormals,index),
      })
    }
    const core=terrain.geometry.getAttribute('position')
    for(let index=0;index<core.count;index+=1){
      const x=core.getX(index),z=core.getZ(index)
      if(Math.abs(x)!==42&&Math.abs(z)!==52) continue
      const point=points.get(`${x}:${z}`)
      expect(point.y).toBeCloseTo(core.getY(index),5)
      expect(point.normal.distanceTo(new THREE.Vector3().fromBufferAttribute(terrain.geometry.getAttribute('normal'),index))).toBeLessThan(1e-6)
    }
    world.updateMatrixWorld(true)
    const isMobile=quality==='mobile'
    const camera=new THREE.PerspectiveCamera(isMobile?60:48,isMobile?390/844:1440/900,.1,420)
    const target=new THREE.Vector3(...(isMobile?[-2.5,1.55,34.8]:[-2,1.55,34.8]))
    for(const height of [isMobile?5.1:3.8,80]){
      camera.position.set(isMobile?3.5:8.5,height,isMobile?67:46)
      camera.lookAt(target)
      camera.updateMatrixWorld(true)
      for(const x of [-.9,0,.9]){
        const raycaster=new THREE.Raycaster()
        raycaster.setFromCamera(new THREE.Vector2(x,-.9),camera)
        expect(raycaster.intersectObjects([terrain,surround]).length).toBeGreaterThan(0)
      }
    }
    disposeObject3D(world)
  })
})
