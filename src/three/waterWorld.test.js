import { describe,expect,it,vi } from 'vitest'
import * as THREE from 'three'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createExpeditionBoat,updateBoat } from './expeditionVehicles'
import { createWaterWorld,updateWaterWorld } from './waterWorld'
import { createForestRoute,distanceToForestRoute,sampleForestGroundHeight,sampleLandingGroundHeight } from './forestTerrain'
import { sampleRiverCrossSection,sampleRiverSurface,RIVER_SURFACE_START_Z,RIVER_SURFACE_END_Z } from './riverConfig'
import {createExpeditionController} from './expeditionController'
import {getExpeditionState} from './journeyData'
import { getTransportCamera } from './indiaJourney'
import { createJungleWorld } from './jungleWorld'
import { mapJourneyZ } from './journeySpatial'
import { WATERFALL } from './finaleConfig'

const averageNormalY=object=>{
  const normals=object.geometry.getAttribute('normal')
  let total=0
  for(let index=0;index<normals.count;index+=1) total+=normals.getY(index)
  return total/normals.count
}

const rowWidth=(water,row)=>{
  const position=water.geometry.getAttribute('position')
  const columns=water.geometry.userData.crossSectionColumns||2
  const offset=row*columns
  return new THREE.Vector3().fromBufferAttribute(position,offset)
    .distanceTo(new THREE.Vector3().fromBufferAttribute(position,offset+columns-1))
}

describe('water world',()=>{
  it('keeps a level basin with restrained freshwater reflections and shoreline detail',()=>{
    const water=createWaterWorld(createMaterials(),'mobile')
    const basin=water.getObjectByName('water-basin-ground')
    const surface=water.getObjectByName('reflective-water').material
    expect(basin.rotation.x).toBe(0)
    expect(basin.rotation.y).toBe(0)
    expect(basin.rotation.z).toBe(0)
    expect(surface.opacity).toBeGreaterThan(.8)
    expect(surface.transmission).toBe(0)
    expect(surface.ior).toBeCloseTo(1.333,3)
    expect(surface.roughness).toBeGreaterThan(.1)
    expect(surface.roughness).toBeLessThan(.3)
    expect(surface.clearcoat).toBeLessThan(.4)
    expect(surface.metalness).toBe(0)
    expect(water.getObjectByName('water-depth-layer')).toBeUndefined()
    expect(water.getObjectByName('water-reflection-layer')).toBeUndefined()
    expect(water.getObjectByName('water-shallows')).toBeUndefined()
    const gravel=water.getObjectByName('water-shore-detail').children
    expect(gravel.every(object=>object.isInstancedMesh)).toBe(true)
    expect(gravel.reduce((sum,object)=>sum+object.count,0)).toBeGreaterThanOrEqual(80)
    water.updateMatrixWorld(true)
    const basinBounds=new THREE.Box3().setFromObject(basin)
    expect(basinBounds.max.z).toBe(RIVER_SURFACE_START_Z+2)
    expect(basinBounds.min.z).toBeCloseTo(LANDMARKS.forestLanding[2],5)
    disposeObject3D(water)
  })

  it('contains water, shoreline, jetty, rocks and reeds',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    ;['reflective-water','water-shoreline','boat-jetty','water-rocks','water-reeds'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    updateWaterWorld(world,1)
    expect(world.getObjectByName('reflective-water').position.y).not.toBe(0)
    disposeObject3D(world)
  })

  it('creates a shaped reflective corridor with two aligned landings',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    ;['water-basin-ground','reflective-water','curved-river-banks','mountain-water-landing','forest-water-landing','distant-forest-silhouette']
      .forEach(name=>expect(water.getObjectByName(name)).toBeTruthy())
    expect(water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(2)
    expect(water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
    expect(water.userData.mountainLanding).toBe(water.getObjectByName('mountain-water-landing'))
    expect(water.userData.forestLanding).toBe(water.getObjectByName('forest-water-landing'))
    expect(water.userData.forestSightline).toBe(water.getObjectByName('distant-forest-silhouette'))
    expect(water.userData.surfaceMaterials.every(material=>material.roughness<.45)).toBe(true)
    expect(water.userData.route.getLength()).toBeGreaterThan(104)
    expect(water.scale.toArray()).toEqual([1,1,1])
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('roots natural-size %s woodland along the extended river using six instanced draws',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    const woodland=water.getObjectByName('river-bank-woodland')
    expect(woodland.children).toHaveLength(6)
    expect(woodland.children.every(object=>object.isInstancedMesh)).toBe(true)
    const placements=woodland.userData.placements
    const depths=placements.map(({z})=>z)
    expect(Math.max(...depths)-Math.min(...depths)).toBeGreaterThan(70)
    placements.forEach(({x,z,scale})=>{
      expect(sampleRiverSurface(x,z).edgeDistance).toBeGreaterThanOrEqual(4)
      expect(scale).toBeGreaterThanOrEqual(.65)
      expect(scale).toBeLessThan(1.2)
    })
    disposeObject3D(water)
  })

  it('uses one upward-facing continuous basin for both sculpted banks',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    expect(averageNormalY(water.getObjectByName('water-basin-ground'))).toBeGreaterThan(.7)
    expect(averageNormalY(water.getObjectByName('reflective-water'))).toBeGreaterThan(.99)
    ;['left-river-bank','right-river-bank'].forEach(name=>{
      expect(water.getObjectByName(name).userData.surfaceOwner).toBe('water-basin-ground')
      expect(water.getObjectByName(name).children).toHaveLength(0)
    })
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('keeps the winding %s channel navigable without folded triangles at its bends',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    const geometry=water.userData.water.geometry,position=geometry.getAttribute('position')
    const columns=geometry.userData.crossSectionColumns
    for(let row=0;row<=geometry.userData.routeSegments;row++){
      const z=position.getZ(row*columns)
      const width=rowWidth(water.userData.water,row)
      if(z<=mapJourneyZ(-44)&&z>=mapJourneyZ(-75)){
        expect(width).toBeGreaterThan(12)
        expect(width).toBeLessThan(19)
      }
      for(let column=1;column<columns;column++){
        expect(position.getX(row*columns+column)).toBeGreaterThan(position.getX(row*columns+column-1))
        expect(position.getZ(row*columns+column)).toBe(z)
      }
    }
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3()
    for(let index=0;index<geometry.index.count;index+=3){
      a.fromBufferAttribute(position,geometry.index.getX(index))
      b.fromBufferAttribute(position,geometry.index.getX(index+1)).sub(a)
      c.fromBufferAttribute(position,geometry.index.getX(index+2)).sub(a)
      expect(b.cross(c).y).toBeGreaterThan(.001)
    }
    disposeObject3D(water)
  })

  it('builds a layered distant forest without oversized repeated crowns',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const forest=water.getObjectByName('distant-forest-silhouette')
    const sizes=[]
    forest.traverse(crown=>{
      if(crown.name==='distant-forest-crown') sizes.push(new THREE.Box3().setFromObject(crown).getSize(new THREE.Vector3()))
    })
    expect(sizes).toHaveLength(45)
    expect(Math.max(...sizes.map(size=>Math.max(size.x,size.y,size.z)))).toBeLessThan(3.8)
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('roots the %s forest reveal outside the jeep route and camera corridor',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    water.updateMatrixWorld(true)
    const route=createForestRoute()
    const trees=[]
    water.userData.forestSightline.traverse(object=>{
      if(object.name.startsWith('forest-proxy-tree-')) trees.push(object)
    })
    expect(trees).toHaveLength(quality==='mobile'?27:45)
    expect(water.userData.forestSightline.visible).toBe(true)
    const routePoints=route.getSpacedPoints(40)
    trees.forEach(tree=>{
      const bounds=new THREE.Box3().setFromObject(tree)
      const center=bounds.getCenter(new THREE.Vector3())
      const size=bounds.getSize(new THREE.Vector3())
      const radius=Math.hypot(size.x,size.z)/2
      expect(distanceToForestRoute(route,center.x,center.z)-radius).toBeGreaterThanOrEqual(6)
      routePoints.forEach(point=>{
        const frame=getTransportCamera(quality,'jeep',point.toArray())
        const from=new THREE.Vector3(...frame.camera)
        const direction=point.clone().sub(from).setY(0)
        const t=THREE.MathUtils.clamp(center.clone().sub(from).setY(0).dot(direction)/direction.lengthSq(),0,1)
        const nearest=from.clone().addScaledVector(direction,t)
        expect(Math.hypot(center.x-nearest.x,center.z-nearest.z)-radius).toBeGreaterThanOrEqual(6)
      })
      const trunkBounds=new THREE.Box3().setFromObject(tree.getObjectByName('distant-forest-trunk'))
      const crownBounds=new THREE.Box3().setFromObject(tree.getObjectByName('distant-forest-crown'))
      expect(trunkBounds.intersectsBox(crownBounds)).toBe(true)
      expect(trunkBounds.min.y).toBeCloseTo(sampleForestGroundHeight(route,tree.position.x,tree.position.z)-.09,5)
    })
    disposeObject3D(water)
  })

  it('uses a colored cross-water mesh whose animated normals vary in two dimensions',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const surface=water.getObjectByName('reflective-water'),geometry=surface.geometry
    expect(geometry.userData.crossSectionSegments).toBeGreaterThanOrEqual(4)
    const columns=geometry.userData.crossSectionColumns,row=Math.floor(geometry.userData.routeSegments/2)
    const colors=geometry.getAttribute('color'),edge=row*columns,center=edge+Math.floor(columns/2)
    expect(Math.abs(colors.getZ(center)-colors.getZ(edge))).toBeGreaterThan(.035)
    for(let index=0;index<colors.count;index++){
      expect(colors.getZ(index)).toBeGreaterThan(colors.getX(index))
      expect(colors.getY(index)).toBeGreaterThan(colors.getX(index))
      expect(Math.abs(colors.getZ(index)-colors.getY(index))).toBeLessThan(.08)
    }
    const rebuildNormals=vi.spyOn(geometry,'computeVertexNormals')
    updateWaterWorld(water,.83)
    expect(rebuildNormals).not.toHaveBeenCalled()
    const normals=geometry.getAttribute('normal')
    const edgeNormal=new THREE.Vector3().fromBufferAttribute(normals,edge)
    const acrossWater=Array.from({length:columns},(_,column)=>
      edgeNormal.distanceTo(new THREE.Vector3().fromBufferAttribute(normals,edge+column)),
    )
    expect(Math.max(...acrossWater)).toBeGreaterThan(.005)
    const heights=[]
    for(let index=0;index<geometry.getAttribute('position').count;index+=1){
      heights.push(geometry.getAttribute('position').getY(index))
    }
    expect(Math.max(...heights)-Math.min(...heights)).toBeGreaterThan(.05)
    expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(.13)
    for(let index=0;index<normals.count;index++){
      const normal=new THREE.Vector3().fromBufferAttribute(normals,index)
      expect(normal.length()).toBeCloseTo(1,5)
      expect(normal.y).toBeGreaterThan(.9)
    }
    disposeObject3D(water)
  })

  it('advects the current on the same blue surface while preserving planar reflection hooks',()=>{
    const world=createWaterWorld(createMaterials(),'mobile')
    const material=world.userData.water.material
    const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <opaque_fragment>'}
    material.onBeforeCompile(shader,{})
    expect(shader.uniforms.riverCurrentTime).toBe(material.userData.currentTime)
    expect(shader.uniforms.riverReflection).toBeTruthy()
    expect(shader.fragmentShader).toContain('currentNoise')
    expect(shader.fragmentShader).toContain('reflectedLandscape')
    updateWaterWorld(world,3.2)
    expect(shader.uniforms.riverCurrentTime.value).toBe(3.2)
    expect(material.customProgramCacheKey()).toContain('river-current-v1|natural-water-planar')
    expect(world.getObjectByName('water-reflection-layer')).toBeUndefined()
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])('keeps the %s river to waterfall sightline clear through the forest',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    const forest=createJungleWorld(createMaterials(),quality)
    water.updateMatrixWorld(true)
    forest.updateMatrixWorld(true)
    for(const routeProgress of [.35,.6,.9]){
      const point=water.userData.route.getPointAt(routeProgress)
      const frame=getTransportCamera(quality,'boat',point.toArray())
      const origin=new THREE.Vector3(...frame.camera)
      for(const height of [6,12,15.5]){
        const direction=new THREE.Vector3(WATERFALL.center[0],height,WATERFALL.center[2]).sub(origin)
        const ray=new THREE.Raycaster(origin,direction.clone().normalize(),0,direction.length()-.2)
        const opaqueHits=ray.intersectObjects([water.userData.forestSightline,forest],true)
          .filter(hit=>hit.object.material.depthWrite!==false)
        expect(opaqueHits.map(hit=>hit.object.name)).toEqual([])
      }
    }
    disposeObject3D(water)
    disposeObject3D(forest)
  })

  it('uses physical environment reflection and flowing fine ripples without a transmission render pass',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const material=water.getObjectByName('reflective-water').material
    expect(material.userData.reflectionMode).toBe('planar-fresnel')
    expect(material.userData.reflectionResolution).toBe(384)
    expect(material.envMapIntensity).toBeGreaterThan(0)
    expect(material.normalMap.isDataTexture).toBe(true)
    expect(material.normalMap.generateMipmaps).toBe(true)
    const before=material.normalMap.offset.clone()
    updateWaterWorld(water,2)
    expect(material.normalMap.offset.equals(before)).toBe(false)
    expect(material.transmission).toBe(0)
    disposeObject3D(water)
  })

  it('continues both ends around bends beyond the jetties instead of capping a pond at each dock',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const surface=water.getObjectByName('reflective-water')
    const rows=surface.geometry.userData.routeSegments
    const start=rowWidth(surface,0),middle=rowWidth(surface,Math.floor(rows/2)),end=rowWidth(surface,rows)
    expect(middle).toBeGreaterThan(start*1.4)
    expect(middle).toBeGreaterThan(end*1.15)
    expect(end).toBeGreaterThan(6)
    const bounds=new THREE.Box3().setFromObject(surface)
    expect(bounds.max.z-LANDMARKS.mountainLanding[2]).toBeGreaterThanOrEqual(20)
    expect(LANDMARKS.forestLanding[2]-bounds.min.z).toBeGreaterThanOrEqual(22)
    expect(sampleRiverCrossSection(bounds.max.z).centerX).toBeLessThan(-20)
    expect(sampleRiverCrossSection(bounds.min.z).centerX).toBeLessThan(-20)
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('resolves the %s incoming shoreline without exposed bed strips or coarse steps',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    water.updateMatrixWorld(true)
    const surface=water.getObjectByName('reflective-water')
    const basin=water.getObjectByName('water-basin-ground')
    const positions=basin.geometry.getAttribute('position')
    const rows=new Map()
    for(let index=0;index<positions.count;index+=1){
      const x=positions.getX(index),z=positions.getZ(index)
      if(z<mapJourneyZ(-85.8)||z>mapJourneyZ(-76.2)||Math.abs(x)>8) continue
      if(!rows.has(z)) rows.set(z,[])
      rows.get(z).push(x)
    }
    const depths=[...rows.keys()].sort((a,b)=>a-b)
    expect(depths.length).toBeGreaterThan(30)
    depths.slice(1).forEach((z,index)=>expect(z-depths[index]).toBeLessThan(.3))
    rows.forEach(xs=>{
      xs.sort((a,b)=>a-b)
      xs.slice(1).forEach((x,index)=>expect(x-xs[index]).toBeLessThan(.86))
    })
    const route=createForestRoute()
    const ray=new THREE.Raycaster()
    for(let z=mapJourneyZ(-76.4);z>mapJourneyZ(-85.6);z-=.43){
      const center=THREE.MathUtils.lerp(LANDMARKS.forestLanding[0],4.2,(z-LANDMARKS.forestLanding[2])/28)
      for(const offset of [-4.8,-3.4,3.4,4.8]){
        const x=center+offset
        ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0))
        expect(Math.abs(ray.intersectObject(basin)[0].point.y-sampleLandingGroundHeight(route,x,z))).toBeLessThan(.04)
      }
    }
    disposeObject3D(water)
  })

  it('joins wet bed, exposed bars and dry banks without a floating shoreline sheet',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const basin=water.getObjectByName('water-basin-ground')
    water.updateMatrixWorld(true)
    const ray=new THREE.Raycaster()
    for(let z=mapJourneyZ(-43);z>=mapJourneyZ(-75);z-=3.7){
      const section=sampleRiverCrossSection(z)
      for(const side of [-1,1]){
        const bank=side<0?section.leftX:section.rightX
        const heights=[-3,-.5,0,.5,2].map(offset=>{
          const x=bank+side*offset
          ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0))
          const hits=ray.intersectObject(basin)
          expect(hits.length).toBeGreaterThan(0)
          expect(Math.abs(hits[0].point.y-sampleRiverSurface(x,z).bedHeight)).toBeLessThan(.12)
          return hits[0].point.y
        })
        expect(heights[0]).toBeLessThan(-.3)
        expect(heights.at(-1)).toBeGreaterThan(.1)
      }
    }
    const barSection=sampleRiverCrossSection(mapJourneyZ(-59.5))
    ray.set(new THREE.Vector3(barSection.leftX+1.6,20,mapJourneyZ(-59.5)),new THREE.Vector3(0,-1,0))
    expect(ray.intersectObject(basin)[0].point.y).toBeGreaterThan(.04)
    for(let progress=.12;progress<=.88;progress+=.08){
      const point=water.userData.route.getPointAt(progress)
      ray.set(new THREE.Vector3(point.x,20,point.z),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(basin)[0].point.y).toBeLessThan(-.4)
    }
    expect(water.getObjectByName('water-bank-shadows')).toBeUndefined()
    disposeObject3D(water)
  })

  it('backs the full curved corridor with continuous ground and rooted distant trees',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    water.updateMatrixWorld(true)
    const basin=water.getObjectByName('water-basin-ground')
    const basinBounds=new THREE.Box3().setFromObject(basin)
    expect(basin.geometry.userData.continuousBasin).toBe(true)
    for(let z=mapJourneyZ(-35);z>=mapJourneyZ(-85);z-=2){
      const section=sampleRiverCrossSection(z)
      expect(basinBounds.min.x).toBeLessThan(section.leftX-10)
      expect(basinBounds.max.x).toBeGreaterThan(section.rightX+10)
    }
    const trunks=[]
    water.getObjectByName('distant-forest-silhouette').traverse(object=>{
      if(object.name==='distant-forest-trunk') trunks.push(object)
    })
    expect(trunks.length).toBeGreaterThanOrEqual(30)
    expect(water.getObjectByName('forest-sightline-ground')).toBeUndefined()
    expect(water.userData.forestSightline.userData.groundOwner).toBe('forest-ground')
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('joins the %s river and forest along one matching terrain edge',quality=>{
    const water=createWaterWorld(createMaterials(),quality)
    const forest=createJungleWorld(createMaterials(),quality)
    water.updateMatrixWorld(true)
    forest.updateMatrixWorld(true)
    const basin=water.getObjectByName('water-basin-ground')
    const ground=forest.getObjectByName('forest-ground')
    const seamZ=LANDMARKS.forestLanding[2]
    const seamVertices=object=>{
      const positions=object.geometry.getAttribute('position')
      const colors=object.geometry.getAttribute('color')
      const uvs=object.geometry.getAttribute('uv')
      const normals=object.geometry.getAttribute('normal')
      const vertices=[]
      for(let index=0;index<positions.count;index+=1){
        if(Math.abs(positions.getZ(index)-seamZ)<1e-5){
          vertices.push({position:new THREE.Vector3().fromBufferAttribute(positions,index),color:new THREE.Vector3().fromBufferAttribute(colors,index),uv:new THREE.Vector2().fromBufferAttribute(uvs,index),normal:new THREE.Vector3().fromBufferAttribute(normals,index)})
        }
      }
      return vertices.sort((a,b)=>a.position.x-b.position.x)
    }
    const riverEdge=seamVertices(basin),forestEdge=seamVertices(ground)
    expect(riverEdge.length).toBeGreaterThan(70)
    expect(riverEdge).toHaveLength(forestEdge.length)
    riverEdge.forEach((vertex,index)=>{
      expect(vertex.position.distanceTo(forestEdge[index].position)).toBeLessThan(1e-5)
      expect(vertex.color.distanceTo(forestEdge[index].color)).toBeLessThan(1e-5)
      expect(vertex.uv.distanceTo(forestEdge[index].uv)).toBeLessThan(1e-5)
      expect(vertex.normal.distanceTo(forestEdge[index].normal)).toBeLessThan(1e-5)
    })
    expect(new THREE.Box3().setFromObject(basin).min.z).toBeCloseTo(seamZ,5)
    expect(new THREE.Box3().setFromObject(ground).max.z).toBeCloseTo(seamZ,5)
    const ray=new THREE.Raycaster()
    ;[-20,-8,-2,4,20].forEach(x=>{
      const heights=[-.01,.01].map(offset=>{
        ray.set(new THREE.Vector3(x,20,seamZ+offset),new THREE.Vector3(0,-1,0))
        const hits=ray.intersectObjects([basin,ground])
        expect(new Set(hits.map(hit=>hit.object)).size).toBe(1)
        expect(Math.max(...hits.map(hit=>hit.point.y))-Math.min(...hits.map(hit=>hit.point.y))).toBeLessThan(1e-6)
        return hits[0].point.y
      })
      expect(Math.abs(heights[0]-heights[1])).toBeLessThan(.04)
    })
    expect(forest.getObjectByName('forest-inlet-water')).toBeUndefined()
    expect(forest.getObjectByName('wet-inlet-bank')).toBeUndefined()
    ;[.82,.88,.94].forEach(progress=>{
      const point=water.userData.route.getPointAt(progress)
      expect(sampleLandingGroundHeight(forest.userData.route,point.x,point.z)).toBeLessThan(-.08)
      ray.set(new THREE.Vector3(point.x,20,point.z),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(basin)[0].point.y).toBeLessThan(-.05)
    })
    expect(new THREE.Box3().setFromObject(water.getObjectByName('reflective-water')).min.z).toBeCloseTo(RIVER_SURFACE_END_Z,5)
    disposeObject3D(water)
    disposeObject3D(forest)
  })

  it('centers the visible landing decks on their shared terrain landmarks',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    water.updateMatrixWorld(true)
    ;[
      ['boat-jetty',LANDMARKS.mountainLanding],
      ['forest-jetty',LANDMARKS.forestLanding],
    ].forEach(([name,coordinates])=>{
      const center=new THREE.Box3().setFromObject(water.getObjectByName(name)).getCenter(new THREE.Vector3())
      const landmark=new THREE.Vector3(...coordinates)
      expect(new THREE.Vector2(center.x,center.z).distanceTo(new THREE.Vector2(landmark.x,landmark.z))).toBeLessThan(.2)
    })
    disposeObject3D(water)
  })

  it('hands wake ownership to the boat and keeps animated materials independent',()=>{
    const materials=createMaterials(),water=createWaterWorld(materials,'desktop'),boat=createExpeditionBoat(materials)
    water.add(boat)
    const attachedWakes=[]
    water.traverse(object=>{if(object.name==='boat-wake') attachedWakes.push(object)})
    expect(attachedWakes).toEqual([boat.getObjectByName('boat-wake')])
    updateBoat(boat,water.userData.route,.45,.6,false)
    updateWaterWorld(water,.6,boat)
    const wakes=[]
    water.traverse(object=>{if(object.name==='boat-wake') wakes.push(object)})
    expect(wakes).toEqual([boat.getObjectByName('boat-wake')])
    expect(water.userData.wake).toBe(wakes[0])
    const foam=water.getObjectByName('water-foam-accents')
    expect(new Set(foam.children.map(child=>child.material)).size).toBe(foam.children.length)
    expect(new Set(wakes[0].children.map(child=>child.material)).size).toBe(wakes[0].children.length)
    disposeObject3D(water)
  })

  it.each(['mobile','desktop'])('keeps the full %s boat hull over rendered water at both jetties and during departure',quality=>{
    const scene=new THREE.Scene()
    const controller=createExpeditionController(scene,createMaterials(),quality)
    const {water,mountain,forest}=controller.worlds
    const bed=[
      water.getObjectByName('water-basin-ground'),
      mountain.getObjectByName('hill-terrain'),
      mountain.getObjectByName('hill-terrain-surround'),
      forest.getObjectByName('forest-ground'),
    ]
    const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0)
    try{
      for(const progress of [.28,.42,.425,.43,.44,.6,.68]){
        controller.update(getExpeditionState(progress),0,true,0)
        scene.updateMatrixWorld(true)
        const hull=new THREE.Box3().setFromObject(controller.transports.boat.getObjectByName('boat-hull'))
        const dock=water.getObjectByName(progress<.6?'boat-jetty':'forest-jetty')
        expect(hull.intersectsBox(new THREE.Box3().setFromObject(dock)),`dock collision at ${progress}`).toBe(false)
        const gangway=forest.getObjectByName('forest-landing-gangway')
        expect(hull.intersectsBox(new THREE.Box3().setFromObject(gangway)),`gangway collision at ${progress}`).toBe(false)
        for(const x of [hull.min.x,(hull.min.x+hull.max.x)/2,hull.max.x]){
          for(const z of [hull.min.z,(hull.min.z+hull.max.z)/2,hull.max.z]){
            expect(sampleRiverSurface(x,z).inside,`dry hull at ${progress}: ${x},${z}`).toBe(true)
            ray.set(new THREE.Vector3(x,10,z),down)
            const waterHit=ray.intersectObject(water.userData.water)[0]
            const groundHit=ray.intersectObjects(bed)[0]
            expect(waterHit,`missing rendered water at ${progress}: ${x},${z}`).toBeTruthy()
            expect(groundHit,`missing river bed at ${progress}: ${x},${z}`).toBeTruthy()
            expect(groundHit.point.y,`ground intersects hull at ${progress}: ${x},${z}`).toBeLessThan(hull.min.y-.05)
            expect(waterHit.point.y).toBeGreaterThan(hull.min.y)
          }
        }
      }
      const jeep=controller.transports.jeep
      expect(sampleRiverSurface(jeep.position.x,jeep.position.z).inside).toBe(false)
      expect(sampleForestGroundHeight(forest.userData.route,jeep.position.x,jeep.position.z)).toBeGreaterThan(.01)
      const dryPath=mountain.userData.route.getSpacedPoints(100).filter(point=>point.z>-32.4&&point.z<-15)
      dryPath.forEach(point=>expect(sampleRiverSurface(point.x,point.z).inside).toBe(false))
    }finally{
      controller.dispose()
    }
  })
})
