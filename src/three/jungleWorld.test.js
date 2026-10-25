import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createJungleWorld } from './jungleWorld'
import { createMaterials,disposeObject3D } from './primitives'
import { LANDMARKS } from './terrain'
import { createWaterWorld } from './waterWorld'
import { createExpeditionJeep,updateJeep } from './expeditionVehicles'
import { getJourneyState } from './journeyData'
import { FINALE_CAMERAS,WATERFALL,WATERFALL_OUTFLOW,WATERFALL_VIEWING_POSITIONS,getFinaleGroundHeight,sampleFinaleWater } from './finaleConfig'
import { mapJourneyZ,shiftFinaleZ } from './journeySpatial'
import { distanceToForestRoute,sampleLandingGroundHeight } from './forestTerrain'
import {sampleRiverSurface} from './riverConfig'
import {
  getMobileTransportCamera,
  getResolvedCameraFrame,
  getTransportCamera,
} from './indiaJourney'

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
  it.each(['mobile','desktop'])('connects the %s forest jetty to dry road with a grounded timber gangway',quality=>{
    const world=createJungleWorld(createMaterials(),quality)
    const water=createWaterWorld(createMaterials(),quality)
    world.updateMatrixWorld(true)
    water.updateMatrixWorld(true)
    const road=world.getObjectByName('jeep-track-surface')
    const position=road.geometry.getAttribute('position'),indices=road.geometry.getIndex()
    for(let index=0;index<indices.count;index++){
      const vertex=indices.getX(index)
      expect(sampleRiverSurface(position.getX(vertex),position.getZ(vertex)).edgeDistance).toBeGreaterThan(.34)
    }
    const gangway=world.getObjectByName('forest-landing-gangway')
    const bounds=new THREE.Box3().setFromObject(gangway)
    const jetty=new THREE.Box3().setFromObject(water.getObjectByName('forest-jetty'))
    expect(bounds.intersectsBox(jetty)).toBe(true)
    const planks=gangway.children.filter(object=>object.name==='forest-gangway-plank')
    expect(planks.length).toBeGreaterThan(6)
    const dryEnd=planks.at(-1).position
    expect(sampleRiverSurface(dryEnd.x,dryEnd.z).edgeDistance).toBeGreaterThan(.35)
    const ray=new THREE.Raycaster(new THREE.Vector3(dryEnd.x,10,dryEnd.z),new THREE.Vector3(0,-1,0))
    expect(ray.intersectObject(road)).not.toHaveLength(0)
    const supports=gangway.children.filter(object=>object.name==='forest-gangway-support')
    expect(supports).toHaveLength(4)
    supports.forEach(support=>{
      const foot=new THREE.Box3().setFromObject(support).min.y
      expect(foot).toBeLessThan(sampleLandingGroundHeight(world.userData.route,support.position.x,support.position.z))
    })
    disposeObject3D(world)
    disposeObject3D(water)
  })
  it('contains layered vegetation, track, mist and outpost',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    ;['jungle-foreground','jungle-midground','jungle-background','forest-track','jungle-mist','ranger-outpost','jungle-rocks','jungle-puddles']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    expect(world.getObjectByName('jungle-mist').visible).toBe(true)
    expect(world.getObjectByName('jungle-sun-shafts').visible).toBe(true)
    disposeObject3D(world)
  })

  it('creates layered dense forest around a clear jeep route',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    ;['forest-inlet','forest-water-landing','forest-near-layer','forest-mid-layer','forest-far-layer','jungle-undergrowth','jungle-vines','jungle-mist']
      .forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
    expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(180)
    expect(world.userData.route.getPointAt(0).distanceTo(new THREE.Vector3(...LANDMARKS.forestLanding))).toBeLessThan(2)
    expect(world.userData.route.getLength()).toBeGreaterThan(92)
    expect(world.scale.toArray()).toEqual([1,1,1])
    expect(world.userData.routeClearance).toBeGreaterThanOrEqual(1.4)
    expect(world.userData.materialDetail).toEqual({leafVariants:6,barkVariants:2})
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])('keeps the denser %s understory rooted outside the track and water',quality=>{
    const world=createJungleWorld(createMaterials(),quality)
    const groves=world.getObjectByName('forest-lush-understory')
    expect(groves.children.every(object=>object.isInstancedMesh)).toBe(true)
    expect(groves.children).toHaveLength(6)
    expect(groves.userData.placements.length).toBeGreaterThanOrEqual(150)
    groves.userData.placements.forEach(({x,z,radius})=>{
      expect(distanceToForestRoute(world.userData.route,x,z)-radius).toBeGreaterThanOrEqual(1.4)
      if(z-radius<shiftFinaleZ(-130)) expect(sampleFinaleWater(x,z).edgeDistance).toBeGreaterThan(radius+.6)
    })
    const matrix=new THREE.Matrix4(),point=new THREE.Vector3()
    groves.children.forEach(shrubs=>{
      for(let index=0;index<shrubs.count;index++){
        shrubs.getMatrixAt(index,matrix)
        point.set(0,shrubs.geometry.boundingBox.min.y,0).applyMatrix4(matrix)
        expect(point.y-world.userData.heightAt(point.x,point.z)).toBeCloseTo(-.06,4)
      }
    })
    disposeObject3D(world)
  })

  it('starts opaque forest ground at the shared landing instead of under the river',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const bounds=new THREE.Box3().setFromObject(world.getObjectByName('forest-ground'))
    expect(bounds.max.z).toBeLessThanOrEqual(LANDMARKS.forestLanding[2]+.01)
    expect(bounds.min.z).toBeLessThan(LANDMARKS.forestEnd[2]-8)
    disposeObject3D(world)
  })

  it('centers the rendered landing deck on the shared water handoff surface',()=>{
    const jungle=createJungleWorld(createMaterials(),'desktop')
    const water=createWaterWorld(createMaterials(),'desktop')
    jungle.updateMatrixWorld(true)
    const jungleAnchor=jungle.getObjectByName('forest-landing-deck')
    const jungleCenter=jungleAnchor.getWorldPosition(new THREE.Vector3())
    const jungleDirection=new THREE.Vector3(0,0,1)
      .applyQuaternion(jungleAnchor.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize()
    const waterDeck=deckMetrics(water,'forest-jetty')
    const landmark=new THREE.Vector3(...LANDMARKS.forestLanding)
    expect(new THREE.Vector2(jungleCenter.x,jungleCenter.z)
      .distanceTo(new THREE.Vector2(landmark.x,landmark.z))).toBeLessThan(.2)
    expect(jungleCenter.y+.08).toBeCloseTo(waterDeck.surfaceY,5)
    expect(jungleDirection.distanceTo(waterDeck.direction)).toBeLessThan(.01)
    expect(jungleAnchor.children).toHaveLength(0)
    expect(jungleAnchor.userData.surfaceOwner).toBe('forest-jetty')
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
    expect(world.userData.counts.trees).toBeGreaterThanOrEqual(90)
    expect(world.userData.counts.undergrowth).toBeGreaterThanOrEqual(170)
    expect(world.getObjectByName('forest-mid-layer').children.length).toBeGreaterThanOrEqual(36)
    expect(world.getObjectByName('forest-far-layer').children.length).toBeGreaterThanOrEqual(26)
    expect(world.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestEnd))).toBeLessThan(1e-6)
    disposeObject3D(world)
  })

  it('supports all four parked jeep wheels beyond the final route center',()=>{
    const materials=createMaterials()
    const world=createJungleWorld(materials,'mobile')
    const jeep=createExpeditionJeep(materials)
    const road=world.getObjectByName('jeep-track-surface')
    updateJeep(jeep,world.userData.route,1,0,true)
    world.updateMatrixWorld(true)
    jeep.updateMatrixWorld(true)
    const ray=new THREE.Raycaster()
    const center=new THREE.Vector3()
    jeep.userData.wheels.forEach(wheel=>{
      wheel.getWorldPosition(center)
      ray.set(new THREE.Vector3(center.x,10,center.z),new THREE.Vector3(0,-1,0))
      const surface=ray.intersectObject(road)[0]
      expect(surface).toBeTruthy()
      expect(Math.abs(new THREE.Box3().setFromObject(wheel,true).min.y-surface.point.y)).toBeLessThan(.01)
    })
    expect(world.userData.route.getPointAt(1).distanceTo(new THREE.Vector3(...LANDMARKS.forestEnd))).toBeLessThan(1e-8)
    disposeObject3D(jeep)
    disposeObject3D(world)
    Object.values(materials).forEach(material=>material.dispose())
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

  it('builds tall branched trees with shared, clustered canopy geometry',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    const heights=[]
    world.traverse(object=>{
      if(object.name.startsWith('jungle-tree-')){
        heights.push(new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()).y)
      }
    })
    expect(Math.max(...heights)).toBeGreaterThan(10)
    expect(Math.max(...heights)).toBeLessThan(18)
    const trunks=objectsNamed(world,new Set(['tree-trunk']))
    const crowns=objectsNamed(world,new Set(['individual-canopy-leaves']))
    expect(new Set(trunks.map(trunk=>trunk.geometry)).size).toBe(6)
    expect(new Set(crowns.map(crown=>crown.geometry)).size).toBe(6)
    expect(trunks.every(trunk=>trunk.geometry.userData.branchCount>=14)).toBe(true)
    expect(crowns.every(crown=>crown.geometry.userData.distribution==='overlapping-inner-and-outer-shoots')).toBe(true)
    expect(new Set(crowns.map(crown=>crown.geometry.userData.clusters)).size).toBeGreaterThan(1)
    const backdrop=world.getObjectByName('forest-dense-backdrop')
    expect(backdrop.children).toHaveLength(12)
    expect(backdrop.children.every(object=>object.isInstancedMesh)).toBe(true)
    expect(world.userData.counts.trees).toBeGreaterThanOrEqual(200)
    disposeObject3D(world)
  })

  it('mixes tree ages and trunk proportions while reusing six growth forms',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    const trees=world.getObjectByName('forest-near-layer').children
    const ages=trees.map(tree=>tree.userData.ageScale)
    expect(Math.max(...ages)/Math.min(...ages)).toBeGreaterThan(1.6)
    expect(trees.every(tree=>tree.scale.x!==tree.scale.z)).toBe(true)
    expect(new Set(trees.map(tree=>tree.userData.growthForm)).size).toBe(6)
    const backdrop=world.getObjectByName('forest-dense-backdrop')
    expect(backdrop.children).toHaveLength(12)
    expect(backdrop.children.every(object=>object.isInstancedMesh)).toBe(true)
    disposeObject3D(world)
  })

  it('keeps rolling ground out of the road and matches the finale clearing and pool basin',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    const heightAt=world.userData.heightAt
    const sideHeights=[-24,-16,16,24].flatMap(x=>[-100,-115,-125].map(z=>heightAt(x,mapJourneyZ(z))))
    expect(Math.max(...sideHeights)-heightAt(0,mapJourneyZ(-120))).toBeGreaterThan(1.5)
    const ground=world.getObjectByName('forest-ground')
    ground.updateWorldMatrix(true,true)
    const ray=new THREE.Raycaster()
    WATERFALL_VIEWING_POSITIONS.forEach(([x,y,z])=>{
      expect(heightAt(x,z)).toBeCloseTo(y,6)
      ray.set(new THREE.Vector3(x,20,z),new THREE.Vector3(0,-1,0))
      expect(ray.intersectObject(ground)[0].point.y).toBeCloseTo(y,2)
    })
    expect(heightAt(WATERFALL.pool[0],WATERFALL.pool[2]))
      .toBeCloseTo(getFinaleGroundHeight(WATERFALL.pool[0],WATERFALL.pool[2]),6)
    expect(new THREE.Box3().setFromObject(ground).min.z).toBeLessThanOrEqual(shiftFinaleZ(-174))
    disposeObject3D(world)
  })

  it('hangs curved vines from actual tree branches away from the finale',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const vines=[]
    world.traverse(object=>{if(object.name.startsWith('jungle-vine-')) vines.push(object)})
    expect(vines).toHaveLength(16)
    const clearing=new THREE.Box3(new THREE.Vector3(-6,-5,shiftFinaleZ(-145)),new THREE.Vector3(8,30,shiftFinaleZ(-129)))
    vines.forEach(vine=>{
      expect(vine.parent.name.startsWith('jungle-tree-')).toBe(true)
      const anchor=new THREE.Vector3(...vine.userData.branchAnchor)
      const branchVertices=vine.parent.getObjectByName('tree-trunk').geometry.getAttribute('position')
      let closest=Infinity
      const vertex=new THREE.Vector3()
      for(let index=0;index<branchVertices.count;index+=1){
        closest=Math.min(closest,vertex.fromBufferAttribute(branchVertices,index).distanceTo(anchor))
      }
      expect(closest).toBeLessThan(1e-7)
      const curve=vine.geometry.parameters.path
      expect(curve.getPoint(0).distanceTo(anchor)).toBeLessThan(1e-7)
      expect(anchor.y-curve.getPoint(1).y).toBeGreaterThan(2)
      expect(Math.hypot(anchor.x-curve.getPoint(1).x,anchor.z-curve.getPoint(1).z)).toBeGreaterThan(.1)
      expect(new THREE.Box3().setFromObject(vine).intersectsBox(clearing)).toBe(false)
    })
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])('keeps the %s outflow channel open in the terrain and vegetation',quality=>{
    const world=createJungleWorld(createMaterials(),quality)
    world.updateMatrixWorld(true)
    const ground=world.getObjectByName('forest-ground')
    const ray=new THREE.Raycaster()
    WATERFALL_OUTFLOW.forEach(([x,z,halfWidth,level],index)=>{
      expect(world.userData.heightAt(x,z)).toBeCloseTo(getFinaleGroundHeight(x,z),6)
      const previous=WATERFALL_OUTFLOW[Math.max(0,index-1)]
      const next=WATERFALL_OUTFLOW[Math.min(WATERFALL_OUTFLOW.length-1,index+1)]
      const tangent=new THREE.Vector2(next[0]-previous[0],next[1]-previous[1]).normalize()
      ;[-.8,0,.8].forEach(side=>{
        const sampleX=x-tangent.y*halfWidth*side,sampleZ=z+tangent.x*halfWidth*side
        ray.set(new THREE.Vector3(sampleX,20,sampleZ),new THREE.Vector3(0,-1,0))
        const hit=ray.intersectObject(ground)[0]
        expect(hit).toBeTruthy()
        expect(hit.point.y).toBeLessThan(level-.03)
      })
    })
    world.traverse(object=>{
      if(!object.name.startsWith('jungle-tree-')&&!object.name.startsWith('undergrowth-')) return
      const {center,radius}=obstacleFootprint(object)
      expect(sampleFinaleWater(center.x,center.z).edgeDistance-radius).toBeGreaterThan(0)
    })
    ;['forest-dense-backdrop','forest-finale-thickets'].forEach(name=>{
      world.getObjectByName(name).userData.instances.forEach(({x,z,radius})=>{
        expect(sampleFinaleWater(x,z).edgeDistance-radius).toBeGreaterThanOrEqual(.6-1e-5)
      })
    })
    const cover=world.getObjectByName('forest-bank-groundcover')
    const bounds=cover.geometry.boundingBox
    const radius=Math.hypot(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x)),Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z)))
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3()
    for(let index=0;index<cover.count;index+=1){
      cover.getMatrixAt(index,matrix)
      matrix.decompose(position,quaternion,scale)
      expect(sampleFinaleWater(position.x,position.z).edgeDistance-radius*scale.x).toBeGreaterThanOrEqual(.6-1e-5)
    }
    disposeObject3D(world)
  })

  it('reserves full canopy clearance for the waterfall and both final camera paths',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const footprints=[]
    const viewingClearing=new THREE.Box3(new THREE.Vector3(-5,-5,shiftFinaleZ(-144)),new THREE.Vector3(6,30,shiftFinaleZ(-130)))
    world.traverse(object=>{
      if(!object.name.startsWith('jungle-tree-')) return
      expect(new THREE.Box3().setFromObject(object).intersectsBox(viewingClearing)).toBe(false)
      footprints.push(obstacleFootprint(object))
    })
    ;['forest-dense-backdrop','forest-finale-thickets'].forEach(name=>{
      world.getObjectByName(name).userData.instances.forEach(({x,z,radius})=>{
        footprints.push({center:new THREE.Vector3(x,0,z),radius})
      })
    })
    Object.values(FINALE_CAMERAS).forEach(({camera,target})=>{
      const from=new THREE.Vector3(...camera),to=new THREE.Vector3(...target)
      footprints.forEach(({center,radius})=>{
        expect(distanceToSegmentXZ(center,from,to)-radius).toBeGreaterThanOrEqual(3.8)
      })
    })
    expect(world.getObjectByName('ranger-outpost').position.x).toBeLessThan(-30)
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])('fills both rear cliff flanks with six instanced draws at %s quality',quality=>{
    const world=createJungleWorld(createMaterials(),quality)
    const thickets=world.getObjectByName('forest-finale-thickets')
    expect(thickets.children).toHaveLength(6)
    expect(thickets.children.every(object=>object.isInstancedMesh)).toBe(true)
    const instances=thickets.userData.instances
    expect(instances.length).toBe(quality==='mobile'?32:48)
    ;[-1,1].forEach(side=>{
      const flank=instances.filter(({x})=>Math.sign(x-WATERFALL.center[0])===side)
      expect(flank.length).toBe(instances.length/2)
      expect(Math.max(...flank.map(({z})=>z))).toBeGreaterThan(shiftFinaleZ(side<0?-151:-160))
      expect(Math.min(...flank.map(({z})=>z))).toBeLessThan(shiftFinaleZ(-172))
      flank.forEach(({x,z})=>{
        expect(Math.abs(x-WATERFALL.center[0])).toBeGreaterThan(26)
        expect(z).toBeGreaterThan(shiftFinaleZ(-174))
      })
    })
    const transform=new THREE.Matrix4()
    const instanceBounds=new THREE.Box3()
    thickets.children.filter(object=>object.name.includes('understory')).forEach(object=>{
      for(let index=0;index<object.count;index+=1){
        object.getMatrixAt(index,transform)
        instanceBounds.copy(object.geometry.boundingBox).applyMatrix4(transform)
        const position=new THREE.Vector3().setFromMatrixPosition(transform)
        expect(instanceBounds.min.y-world.userData.heightAt(position.x,position.z)).toBeCloseTo(.25,4)
        expect(instanceBounds.max.y-instanceBounds.min.y).toBeGreaterThan(2)
      }
    })
    disposeObject3D(world)
  })

  it.each(['mobile','desktop'])(
    'keeps full tree crowns outside the runtime %s camera-to-jeep sight corridor',
    quality=>{
    const world=createJungleWorld(createMaterials(),quality)
    world.updateMatrixWorld(true)
    const state=getJourneyState(.84)
    const jeep=world.userData.route.getPointAt(.5)
    const frame=getResolvedCameraFrame({
      quality,
      progress:.84,
      state,
      transportPosition:jeep.toArray(),
    })
    expect(frame).toEqual(getTransportCamera(quality,'jeep',jeep.toArray()))
    const camera=new THREE.Vector3(...frame.camera)
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

  it('keeps mobile undergrowth clear of the lens without emptying the visible forest corridor',()=>{
    const world=createJungleWorld(createMaterials(),'mobile')
    world.updateMatrixWorld(true)
    const jeep=world.userData.route.getPointAt(.5)
    const framing=getMobileTransportCamera('jeep',jeep.toArray())
    const camera=new THREE.Vector3(...framing.camera)
    const clearances=[]
    world.getObjectByName('jungle-undergrowth').children.forEach(plant=>{
      const {center,radius}=obstacleFootprint(plant)
      clearances.push(Math.hypot(center.x-camera.x,center.z-camera.z)-radius)
    })
    expect(Math.min(...clearances)).toBeGreaterThanOrEqual(3.5)
    expect(Math.min(...clearances)).toBeLessThan(6)
    const view=new THREE.PerspectiveCamera(60,390/844,.1,420)
    view.position.copy(camera)
    view.lookAt(jeep.clone().add(new THREE.Vector3(0,1,0)))
    view.updateMatrixWorld(true)
    view.updateProjectionMatrix()
    const projected=[]
    ;[
      ...world.getObjectByName('forest-near-layer').children,
      ...world.getObjectByName('forest-mid-layer').children,
      ...world.getObjectByName('jungle-undergrowth').children,
    ].forEach(object=>{
      const point=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).project(view)
      if(Math.abs(point.x)<=1&&Math.abs(point.y)<=1&&point.z>=-1&&point.z<=1) projected.push(object)
    })
    expect(projected.length).toBeGreaterThanOrEqual(20)
    disposeObject3D(world)
  })

  it('keeps sparse atmosphere in the finale frustum without entering the route or camera bubble',()=>{
    const world=createJungleWorld(createMaterials(),'desktop')
    world.updateMatrixWorld(true)
    const state=getJourneyState(.84)
    const camera=new THREE.Vector3(...state.cameraPosition)
    const view=new THREE.PerspectiveCamera(60,1440/900,.1,420)
    view.position.copy(camera)
    view.lookAt(new THREE.Vector3(...state.cameraTarget))
    view.updateMatrixWorld(true)
    view.updateProjectionMatrix()
    const frustum=new THREE.Frustum().setFromProjectionMatrix(
      new THREE.Matrix4().multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse),
    )
    const mist=world.getObjectByName('jungle-mist').children
    const shafts=[]
    world.traverse(object=>{
      if(object.name.startsWith('jungle-sun-shaft-')) shafts.push(object)
    })
    expect(shafts).toHaveLength(4)
    expect(mist.some(veil=>frustum.intersectsBox(new THREE.Box3().setFromObject(veil)))).toBe(true)
    expect(shafts.some(shaft=>frustum.intersectsBox(new THREE.Box3().setFromObject(shaft)))).toBe(true)
    shafts.forEach(shaft=>{
      const bounds=new THREE.Box3().setFromObject(shaft)
      const center=bounds.getCenter(new THREE.Vector3())
      const size=bounds.getSize(new THREE.Vector3())
      expect(distanceToSegmentXZ(center,world.userData.route.getPointAt(0),world.userData.route.getPointAt(1))
        -Math.hypot(size.x,size.z)/2).toBeGreaterThanOrEqual(1.4)
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
      veil.material.userData.edgeFade==='all-edges'&&
      veil.geometry.parameters.width<=10
    )).toBe(true)
    const shader={
      vertexShader:'#include <common>\n#include <begin_vertex>',
      fragmentShader:'#include <common>\n#include <opaque_fragment>',
    }
    mist.children[0].material.onBeforeCompile(shader)
    expect(shader.fragmentShader).toContain('mistEdgeAlpha')
    expect(shader.vertexShader).toContain('vMistUv')
    expect(shader.vertexShader).not.toContain('attribute vec2 uv;')
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
