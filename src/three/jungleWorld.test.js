import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createJungleWorld } from './jungleWorld'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createWaterWorld } from './waterWorld'
import { getJourneyState } from './journeyData'

const objectsNamed=(world,names)=>{
  const objects=[]
  world.traverse(object=>{if(names.has(object.name)) objects.push(object)})
  return objects
}

const materialSet=world=>{
  const materials=new Set()
  world.traverse(object=>{
    if(!object.material) return
    ;(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>materials.add(material))
  })
  return materials
}

const deckMetrics=(world,name)=>{
  world.updateMatrixWorld(true)
  const deck=world.getObjectByName(name)
  const bounds=new THREE.Box3().setFromObject(deck)
  const surfaceBounds=new THREE.Box3()
  deck.traverse(object=>{
    if(object.isMesh&&object.geometry.type==='BoxGeometry') surfaceBounds.expandByObject(object)
  })
  const center=bounds.getCenter(new THREE.Vector3())
  const direction=new THREE.Vector3(0,0,1)
    .applyQuaternion(deck.getWorldQuaternion(new THREE.Quaternion()))
    .setY(0)
    .normalize()
  return {center,surfaceY:surfaceBounds.max.y,direction}
}

const obstacleFootprint=object=>{
  const bounds=new THREE.Box3().setFromObject(object)
  const center=bounds.getCenter(new THREE.Vector3())
  const size=bounds.getSize(new THREE.Vector3())
  return {center,radius:Math.hypot(size.x,size.z)/2}
}

const distanceToSegmentXZ=(point,start,end)=>{
  const dx=end.x-start.x,dz=end.z-start.z
  const lengthSquared=dx*dx+dz*dz
  const t=Math.max(0,Math.min(1,((point.x-start.x)*dx+(point.z-start.z)*dz)/(lengthSquared||1)))
  return Math.hypot(point.x-(start.x+dx*t),point.z-(start.z+dz*t))
}

describe('jungle world',()=>{
  it('contains layered vegetation, track, mist and outpost',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    ;['jungle-foreground','jungle-midground','jungle-background','forest-track','jungle-mist','ranger-outpost','jungle-rocks','jungle-puddles']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    disposeObject3D(world)
  })

  it('creates layered dense forest around a clear jeep route',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    ;['forest-inlet','forest-water-landing','forest-near-layer','forest-mid-layer','forest-far-layer','jungle-undergrowth','jungle-vines','jungle-mist']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
    expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(180)
    expect(world.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
    expect(world.userData.routeClearance).toBeGreaterThanOrEqual(1.4)
    expect(world.userData.materialDetail).toEqual({leafVariants:6,barkVariants:2})
    disposeObject3D(world)
  })

  it('centers the rendered landing deck on the shared water handoff surface',()=>{
    const jungle=createJungleWorld(createMaterials(),'desktop')
    const water=createWaterWorld(createMaterials(),'desktop')
    const jungleDeck=deckMetrics(jungle,'forest-landing-deck')
    const waterDeck=deckMetrics(water,'forest-jetty')
    const landmark=new THREE.Vector3(...LANDMARKS.forestLanding)
    expect(new THREE.Vector2(jungleDeck.center.x,jungleDeck.center.z)
      .distanceTo(new THREE.Vector2(landmark.x,landmark.z))).toBeLessThan(.2)
    expect(jungleDeck.surfaceY).toBeCloseTo(waterDeck.surfaceY,5)
    expect(jungleDeck.direction.distanceTo(waterDeck.direction)).toBeLessThan(.01)
    disposeObject3D(jungle)
    disposeObject3D(water)
  })

  it('keeps every registered obstacle bound clear of dense route samples',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    world.updateMatrixWorld(true)
    const obstacleNames=new Set(['tree-trunk','jungle-rock','inlet-stone','fallen-log'])
    const renderedObstacles=objectsNamed(world,obstacleNames)
    expect(world.userData.routeObstacles.map(object=>object.uuid).sort())
      .toEqual(renderedObstacles.map(object=>object.uuid).sort())
    const routePoints=world.userData.route.getSpacedPoints(1200)
    const clearances=world.userData.routeObstacles.map(object=>{
      const {center,radius}=obstacleFootprint(object)
      return routePoints.reduce(
        (minimum,point)=>Math.min(minimum,Math.hypot(center.x-point.x,center.z-point.z)-radius),
        Infinity,
      )
    })
    expect(Math.min(...clearances)).toBeGreaterThanOrEqual(1.4)
    expect(world.userData.routeClearance).toBeCloseTo(Math.min(...clearances),2)
    disposeObject3D(world)
  })

  it('preserves mobile canopy floors and the exact shared route end',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    expect(world.userData.counts.trees).toBeGreaterThanOrEqual(55)
    expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(110)
    expect(world.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestEnd))).toBeLessThan(1e-6)
    disposeObject3D(world)
  })

  it('uses deterministic hashed placement instead of repeated rows',()=>{
    const first=createJungleWorld(createMaterials(),'desktop')
    const second=createJungleWorld(createMaterials(),'desktop')
    const positions=world=>objectsNamed(world,new Set(['tree-trunk']))
      .map(trunk=>trunk.getWorldPosition(new THREE.Vector3()).toArray())
    const firstPositions=positions(first)
    expect(firstPositions).toEqual(positions(second))
    expect(new Set(firstPositions.map(([, ,z])=>z.toFixed(3))).size).toBeGreaterThan(80)
    expect(new Set(firstPositions.map(([x])=>x.toFixed(3))).size).toBeGreaterThan(80)
    disposeObject3D(first)
    disposeObject3D(second)
  })

  it('retains all six crown silhouettes at mobile quality',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    const silhouettes=new Set()
    world.traverse(object=>{if(object.name.startsWith('crown-silhouette-')) silhouettes.add(object.name)})
    expect(silhouettes).toEqual(new Set([
      'crown-silhouette-1',
      'crown-silhouette-2',
      'crown-silhouette-3',
      'crown-silhouette-4',
      'crown-silhouette-5',
      'crown-silhouette-6',
    ]))
    disposeObject3D(world)
  })

  it('uses layered human-scale trees instead of view-blocking giant canopies',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    const heights=[]
    world.traverse(object=>{
      if(object.name.startsWith('jungle-tree-')){
        heights.push(new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y)
      }
    })
    expect(Math.max(...heights)).toBeLessThan(5.5)
    disposeObject3D(world)
  })

  it('keeps full tree crowns outside the protected camera-to-jeep sight corridor',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    world.updateMatrixWorld(true)
    const state=getJourneyState(.84)
    const camera=new THREE.Vector3(...state.cameraPosition)
    const jeep=world.userData.route.getPointAt(.5)
    const clearances=[]
    const cameraClearances=[]
    world.traverse(object=>{
      if(!object.name.startsWith('jungle-tree-')) return
      const bounds=new THREE.Box3().setFromObject(object)
      const center=bounds.getCenter(new THREE.Vector3())
      const size=bounds.getSize(new THREE.Vector3())
      const radius=Math.hypot(size.x,size.z)/2
      clearances.push(distanceToSegmentXZ(center,camera,jeep)-radius)
      cameraClearances.push(Math.hypot(center.x-camera.x,center.z-camera.z)-radius)
    })
    expect(Math.min(...clearances)).toBeGreaterThanOrEqual(1.1)
    expect(Math.min(...cameraClearances)).toBeGreaterThanOrEqual(7.5)
    expect(world.userData.sightlineClearance).toBeGreaterThanOrEqual(1.1)
    disposeObject3D(world)
  })

  it('keeps mobile undergrowth outside the protected camera approach bubble',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const jeep=world.userData.route.getPointAt(.5)
    const camera=jeep.clone().add(new THREE.Vector3(4,3.2,9))
    const clearances=[]
    world.getObjectByName('jungle-undergrowth').children.forEach(plant=>{
      const {center,radius}=obstacleFootprint(plant)
      clearances.push(Math.hypot(center.x-camera.x,center.z-camera.z)-radius)
    })
    expect(Math.min(...clearances)).toBeGreaterThanOrEqual(8.2)
    disposeObject3D(world)
  })

  it('keeps every sun shaft outside the forest camera approach bubble',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    world.updateMatrixWorld(true)
    const camera=new THREE.Vector3(...getJourneyState(.84).cameraPosition)
    const shafts=[]
    world.traverse(object=>{
      if(object.name.startsWith('jungle-sun-shaft-')) shafts.push(object)
    })
    expect(shafts).toHaveLength(4)
    shafts.forEach(shaft=>{
      const bounds=new THREE.Box3().setFromObject(shaft)
      const center=bounds.getCenter(new THREE.Vector3())
      const size=bounds.getSize(new THREE.Vector3())
      expect(Math.hypot(center.x-camera.x,center.z-camera.z)-Math.max(size.x,size.z)/2)
        .toBeGreaterThanOrEqual(4.5)
    })
    disposeObject3D(world)
  })

  it('fades mist at every plane edge instead of drawing rectangular veils',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    const mist=world.getObjectByName('jungle-mist')
    expect(mist.children.length).toBeGreaterThan(0)
    expect(mist.children.every(veil=>
      veil.material.transparent&&
      veil.material.opacity<=.02&&
      veil.geometry.parameters.width<=10
    )).toBe(true)
    disposeObject3D(world)
  })

  it('owns materials independently from the input palette and other jungle worlds',()=>{
    const sharedMaterials=createMaterials()
    const first=createJungleWorld(sharedMaterials,'mobile')
    const second=createJungleWorld(sharedMaterials,'mobile')
    const input=new Set(Object.values(sharedMaterials))
    const firstMaterials=materialSet(first)
    const secondMaterials=materialSet(second)
    expect([...firstMaterials].every(material=>!input.has(material))).toBe(true)
    expect([...firstMaterials].every(material=>!secondMaterials.has(material))).toBe(true)
    disposeObject3D(first)
    disposeObject3D(second)
    Object.values(sharedMaterials).forEach(material=>material.dispose())
  })
})
