import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createMaterials,disposeObject3D} from './primitives'
import {createTrailhead} from './trailhead'
import {LANDMARKS,sampleMountainHeight} from './terrain'
import {createHillWorld} from './hillWorld'
import {sampleAccessRoad,ACCESS_ROAD_WIDTH,ACCESS_ROAD_SHOULDER} from './accessRoad'

const standingPoses=[
  {role:'guide',position:[3.2,.35,33.7],heading:-3.04},
  {role:'tourist',position:[1.8,.35,36.5],heading:-2.35},
  {role:'tourist',position:[3.2,.35,36.7],heading:2.65},
  {role:'tourist',position:[2.4,.35,38],heading:-2.7},
]

const route=new THREE.CatmullRomCurve3([
  new THREE.Vector3(...LANDMARKS.trailheadStart),
  new THREE.Vector3(...LANDMARKS.mountainEntry),
  new THREE.Vector3(...LANDMARKS.mountainStart),
])

const meshesIn=root=>{
  const meshes=[]
  root.traverse(object=>{if(object.isMesh) meshes.push(object)})
  return meshes
}

const maxSurfaceDeviation=(surface,heightAt)=>{
  const position=surface.geometry.getAttribute('position')
  const index=surface.geometry.getIndex()
  let maximum=0
  for(let offset=0;offset<index.count;offset+=3){
    const vertices=[0,1,2].map(vertex=>index.getX(offset+vertex))
    const x=vertices.reduce((sum,vertex)=>sum+position.getX(vertex),0)/3
    const y=vertices.reduce((sum,vertex)=>sum+position.getY(vertex),0)/3
    const z=vertices.reduce((sum,vertex)=>sum+position.getZ(vertex),0)/3
    maximum=Math.max(maximum,Math.abs(y-heightAt(x,z)))
  }
  return maximum
}

describe('trailhead clearing',()=>{
  it('builds gravel, earth, tracks, damp patches, and natural edge detail',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(trailhead.getObjectByName(name)).toBeTruthy())
    expect(trailhead.userData.coachPose.position.toArray()).toEqual([
      -4,
      sampleMountainHeight(-4,34),
      34,
    ])
    expect(trailhead.userData.coachPose.heading).toBe(-Math.PI/2)
    expect(trailhead.userData.routeClearance).toBeGreaterThanOrEqual(1.5)
    expect(trailhead.userData.cameraClearance).toBeGreaterThanOrEqual(3)
    disposeObject3D(trailhead)
  })

  it('keeps every edge obstacle outside the walking corridor, coach turnout, and party',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    const samples=route.getSpacedPoints(80)
    trailhead.userData.routeObstacles.forEach(bounds=>{
      samples.forEach(point=>expect(bounds.distanceToPoint(point))
        .toBeGreaterThanOrEqual(trailhead.userData.routeClearance))
      expect(bounds.intersectsBox(trailhead.userData.turnoutBounds)).toBe(false)
      standingPoses.forEach(pose=>{
        const [x,y,z]=pose.position
        expect(bounds.distanceToPoint(new THREE.Vector3(x,y,z))).toBeGreaterThan(.8)
      })
    })
    disposeObject3D(trailhead)
  })

  it('keeps edge details outside the opening camera bubble',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    const openingCamera=new THREE.Vector3(8.5,3.8,46)
    expect(trailhead.userData.cameraClearance).toBeGreaterThanOrEqual(6)
    trailhead.userData.routeObstacles.forEach(bounds=>{
      expect(bounds.distanceToPoint(openingCamera))
        .toBeGreaterThanOrEqual(trailhead.userData.cameraClearance)
    })
    disposeObject3D(trailhead)
  })

  it('preserves semantic groups on mobile with fewer decorative instances',()=>{
    const options={heightAt:sampleMountainHeight,route,standingPoses}
    const desktop=createTrailhead(createMaterials(),{...options,quality:'desktop'})
    const mobile=createTrailhead(createMaterials(),{...options,quality:'mobile'})
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
      'trailhead-edge-grass',
      'trailhead-edge-stones',
      'trailhead-framing-bushes',
    ].forEach(name=>expect(mobile.getObjectByName(name)).toBeTruthy())
    expect(desktop.userData.routeObstacles.length)
      .toBeGreaterThan(mobile.userData.routeObstacles.length)
    disposeObject3D(desktop)
    disposeObject3D(mobile)
  })

  it('keeps clearing surface layers shadow-receiving without casting',()=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality:'desktop',
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    ;[
      'trailhead-gravel',
      'trailhead-earth',
      'trailhead-tire-marks',
      'trailhead-damp-patches',
    ].forEach(name=>{
      const surfaces=meshesIn(trailhead.getObjectByName(name))
      expect(surfaces.length).toBeGreaterThan(0)
      surfaces.forEach(surface=>{
        expect(surface.castShadow).toBe(false)
        expect(surface.receiveShadow).toBe(true)
      })
    })
    disposeObject3D(trailhead)
  })

  it.each(['desktop','mobile'])(
    'keeps the %s gravel turnout close to the underlying terrain',
    quality=>{
      const trailhead=createTrailhead(createMaterials(),{
        quality,
        heightAt:sampleMountainHeight,
        route,
        standingPoses,
      })
      const surfaces=meshesIn(trailhead.getObjectByName('trailhead-gravel'))
      expect(surfaces.length).toBeGreaterThan(0)
      surfaces.forEach(surface=>{
        expect(maxSurfaceDeviation(surface,sampleMountainHeight)).toBeLessThan(.5)
      })
      disposeObject3D(trailhead)
    },
  )

  it.each(['desktop','mobile'])('faces the %s gravel turnout upward',quality=>{
    const trailhead=createTrailhead(createMaterials(),{
      quality,
      heightAt:sampleMountainHeight,
      route,
      standingPoses,
    })
    const surfaces=meshesIn(trailhead.getObjectByName('trailhead-gravel'))
    expect(surfaces.length).toBeGreaterThan(0)
    surfaces.forEach(surface=>{
      const normal=surface.geometry.getAttribute('normal')
      for(let index=0;index<normal.count;index+=1){
        expect(normal.getY(index)).toBeGreaterThan(0)
      }
    })
    disposeObject3D(trailhead)
  })
})


describe('road access to the bus turnout',()=>{
  it.each(['desktop','mobile'])('drapes a continuous %s road and shoulders onto the actual core and surround',quality=>{
    const world=createHillWorld(createMaterials(),quality)
    world.updateMatrixWorld(true)
    const road=world.getObjectByName('trailhead-access-road')
    const surface=road.getObjectByName('trailhead-road-surface')
    const shoulders=road.getObjectByName('trailhead-road-shoulders')
    const terrain=[world.getObjectByName('hill-terrain'),world.getObjectByName('hill-terrain-surround')]
    expect(road.children).toHaveLength(3)
    expect(road.userData.width).toBeGreaterThanOrEqual(5)
    expect(road.userData.width).toBeLessThanOrEqual(6)
    expect(road.userData.curve.getTangentAt(1).x).toBeGreaterThan(.99)
    expect(surface.geometry.index.count).toBeGreaterThan(300)
    expect(shoulders.geometry.index.count).toBeGreaterThan(300)
    const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0)
    for(let index=1;index<32;index++){
      const p=index/32,center=road.userData.curve.getPointAt(p),tangent=road.userData.curve.getTangentAt(p)
      const lateral=new THREE.Vector3(-tangent.z,0,tangent.x)
      for(const offset of [-2.6,0,2.6,3.2]){
        const point=center.clone().addScaledVector(lateral,offset)
        ray.set(new THREE.Vector3(point.x,100,point.z),down)
        const ground=ray.intersectObjects(terrain)[0]
        const overlay=ray.intersectObject(offset===3.2?shoulders:surface)[0]
        expect(ground,`ground at ${p}, ${offset}`).toBeTruthy()
        expect(overlay,`road at ${p}, ${offset}`).toBeTruthy()
        expect(overlay.point.y-ground.point.y).toBeCloseTo(road.userData.clearance,4)
      }
    }
    for(const object of road.children){
      expect(object.castShadow).toBe(false)
      expect(object.receiveShadow).toBe(true)
      const normal=object.geometry.getAttribute('normal')
      for(let index=0;index<normal.count;index++) expect(normal.getY(index)).toBeGreaterThan(0)
    }
    disposeObject3D(world)
  })

  it('joins the coach pad while keeping the party, hiking route and roadside obstacles clear',()=>{
    const trailhead=createTrailhead(createMaterials(),{heightAt:sampleMountainHeight,route,standingPoses})
    const {accessRoad,coachPose}=trailhead.userData
    const end=accessRoad.userData.curve.getPointAt(1)
    expect(end.toArray()).toEqual([-8,0,34])
    expect(Math.abs(end.z-coachPose.position.z)).toBeLessThan(.01)
    const roadMargin=ACCESS_ROAD_WIDTH/2+ACCESS_ROAD_SHOULDER
    for(const pose of standingPoses) expect(sampleAccessRoad(pose.position[0],pose.position[2]).distance).toBeGreaterThan(roadMargin+2)
    for(const point of route.getSpacedPoints(60)) expect(sampleAccessRoad(point.x,point.z).distance).toBeGreaterThan(roadMargin+2)
    for(const bounds of trailhead.userData.routeObstacles){
      const center=bounds.getCenter(new THREE.Vector3())
      expect(sampleAccessRoad(center.x,center.z).distance).toBeGreaterThan(roadMargin+.8)
    }
    disposeObject3D(trailhead)
  })
})
