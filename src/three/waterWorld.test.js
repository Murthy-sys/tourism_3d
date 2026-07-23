import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createExpeditionBoat,updateBoat } from './expeditionVehicles'
import { createWaterWorld,updateWaterWorld } from './waterWorld'

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

const maximumBankWidth=bank=>{
  const positions=bank.geometry.getAttribute('position')
  let maximum=0
  for(let index=0;index<positions.count;index+=2){
    maximum=Math.max(
      maximum,
      new THREE.Vector3().fromBufferAttribute(positions,index)
        .distanceTo(new THREE.Vector3().fromBufferAttribute(positions,index+1)),
    )
  }
  return maximum
}

describe('water world',()=>{
  it('keeps the basin level and layers transparent depth, reflection, and shoreline detail',()=>{
    const water=createWaterWorld(createMaterials(),'mobile')
    const basin=water.getObjectByName('water-basin-ground')
    const surface=water.getObjectByName('reflective-water').material
    const depth=water.getObjectByName('water-depth-layer').material
    const reflection=water.getObjectByName('water-reflection-layer').material
    expect(basin.rotation.x).toBe(0)
    expect(basin.rotation.y).toBe(0)
    expect(basin.rotation.z).toBe(0)
    expect(surface.opacity).toBeLessThanOrEqual(.74)
    expect(surface.transmission).toBeGreaterThanOrEqual(.2)
    expect(surface.reflectivity).toBeGreaterThanOrEqual(.75)
    expect(depth.isMeshPhysicalMaterial).toBe(true)
    expect(depth.clearcoat).toBeGreaterThanOrEqual(.15)
    expect(depth.roughness).toBeLessThan(.65)
    expect(reflection.opacity).toBeGreaterThanOrEqual(.14)
    expect(reflection.opacity).toBeLessThanOrEqual(.2)
    expect(water.getObjectByName('water-shore-detail').children.length).toBeGreaterThanOrEqual(24)
    water.updateMatrixWorld(true)
    const basinBounds=new THREE.Box3().setFromObject(basin)
    expect(basinBounds.max.z).toBeLessThanOrEqual(LANDMARKS.mountainLanding[2]+3)
    expect(basinBounds.min.z).toBeLessThanOrEqual(LANDMARKS.forestLanding[2]-4)
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
    ;['water-depth-layer','water-reflection-layer','water-shallows','curved-river-banks','mountain-water-landing','forest-water-landing','distant-forest-silhouette']
      .forEach(name=>expect(water.getObjectByName(name)).toBeTruthy())
    expect(water.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.mountainLanding))).toBeLessThan(2)
    expect(water.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
    expect(water.userData.mountainLanding).toBe(water.getObjectByName('mountain-water-landing'))
    expect(water.userData.forestLanding).toBe(water.getObjectByName('forest-water-landing'))
    expect(water.userData.forestSightline).toBe(water.getObjectByName('distant-forest-silhouette'))
    expect(water.userData.surfaceMaterials.every(material=>material.roughness<.45)).toBe(true)
    disposeObject3D(water)
  })

  it('renders both curved banks with upward-facing normals',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    expect(averageNormalY(water.getObjectByName('left-river-bank'))).toBeGreaterThan(.5)
    expect(averageNormalY(water.getObjectByName('right-river-bank'))).toBeGreaterThan(.5)
    disposeObject3D(water)
  })

  it('keeps both bank ribbons narrow enough to avoid folding across bends',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    expect(maximumBankWidth(water.getObjectByName('left-river-bank'))).toBeLessThan(4.2)
    expect(maximumBankWidth(water.getObjectByName('right-river-bank'))).toBeLessThan(4.2)
    disposeObject3D(water)
  })

  it('builds a layered distant forest without oversized repeated crowns',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const forest=water.getObjectByName('distant-forest-silhouette')
    const sizes=[]
    forest.children.forEach(band=>band.children.forEach(crown=>{
      sizes.push(new THREE.Box3().setFromObject(crown).getSize(new THREE.Vector3()))
    }))
    expect(Math.max(...sizes.map(size=>Math.max(size.x,size.y,size.z)))).toBeLessThan(3.8)
    disposeObject3D(water)
  })

  it('uses a colored cross-water mesh whose animated normals vary in two dimensions',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const surface=water.getObjectByName('reflective-water'),geometry=surface.geometry
    expect(geometry.userData.crossSectionSegments).toBeGreaterThanOrEqual(4)
    const columns=geometry.userData.crossSectionColumns,row=Math.floor(geometry.userData.routeSegments/2)
    const colors=geometry.getAttribute('color'),edge=row*columns,center=edge+Math.floor(columns/2)
    expect(Math.abs(colors.getZ(center)-colors.getZ(edge))).toBeGreaterThan(.05)
    updateWaterWorld(water,.83)
    const normals=geometry.getAttribute('normal')
    const edgeNormal=new THREE.Vector3().fromBufferAttribute(normals,edge)
    const centerNormal=new THREE.Vector3().fromBufferAttribute(normals,center)
    expect(edgeNormal.distanceTo(centerNormal)).toBeGreaterThan(.005)
    disposeObject3D(water)
  })

  it('adds a Fresnel terrain-and-sky reflection contribution to the physical surface',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const material=water.getObjectByName('reflective-water').material
    expect(material.userData.reflectionMode).toBe('fresnel-sky-terrain')
    const shader={uniforms:{},fragmentShader:'#include <common>\n#include <opaque_fragment>'}
    material.onBeforeCompile(shader)
    expect(shader.uniforms.reflectedSkyColor.value).toBeInstanceOf(THREE.Color)
    expect(shader.uniforms.reflectedTerrainColor.value).toBeInstanceOf(THREE.Color)
    expect(shader.fragmentShader).toContain('reflectionFresnel')
    disposeObject3D(water)
  })

  it('narrows the water into the forest inlet',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    const surface=water.getObjectByName('reflective-water')
    const rows=surface.geometry.userData.routeSegments||76
    const start=rowWidth(surface,0),middle=rowWidth(surface,Math.floor(rows/2)),end=rowWidth(surface,rows)
    expect(start).toBeLessThan(11)
    expect(end).toBeLessThan(start)
    expect(end).toBeLessThan(middle)
    disposeObject3D(water)
  })

  it('builds shallows directly from the route edge without offset-curve overshoot',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    expect(water.getObjectByName('left-water-shallows').geometry.userData.edgeRibbon).toBe(true)
    expect(water.getObjectByName('right-water-shallows').geometry.userData.edgeRibbon).toBe(true)
    disposeObject3D(water)
  })

  it('backs the full curved corridor with continuous ground and rooted distant trees',()=>{
    const water=createWaterWorld(createMaterials(),'desktop')
    water.updateMatrixWorld(true)
    const basin=water.getObjectByName('water-basin-ground')
    const basinBounds=new THREE.Box3().setFromObject(basin)
    const bankBounds=new THREE.Box3()
      .expandByObject(water.getObjectByName('left-river-bank'))
      .expandByObject(water.getObjectByName('right-river-bank'))
    expect(basin.geometry.userData.continuousBasin).toBe(true)
    expect(basinBounds.min.x).toBeLessThan(bankBounds.min.x-4)
    expect(basinBounds.max.x).toBeGreaterThan(bankBounds.max.x+4)
    expect(basinBounds.min.z).toBeLessThan(bankBounds.min.z-4)
    expect(basinBounds.max.z).toBeGreaterThan(bankBounds.max.z-.01)
    const trunks=[]
    water.getObjectByName('distant-forest-silhouette').traverse(object=>{
      if(object.name==='distant-forest-trunk') trunks.push(object)
    })
    expect(trunks.length).toBeGreaterThanOrEqual(30)
    expect(water.getObjectByName('forest-sightline-ground')).toBeTruthy()
    disposeObject3D(water)
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
})
