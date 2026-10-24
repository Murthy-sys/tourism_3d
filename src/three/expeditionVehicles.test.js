import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createMaterials, disposeObject3D } from './primitives'
import { createExpeditionBoat, createExpeditionJeep, createTrekker, updateBoat, updateJeep, updateTrekker } from './expeditionVehicles'
import { EXPEDITION_PALETTES } from './expeditionPeople'
import { createJungleWorld } from './jungleWorld'

const meshCount=object=>{
  let count=0
  object.traverse(child=>{if(child.isMesh) count+=1})
  return count
}

describe('expedition transports',()=>{
  it.each([
    ['boat',createExpeditionBoat],
    ['jeep',createExpeditionJeep],
  ])('carries one visible guide and three visible tourists in the %s',(_,create)=>{
    const transport=create(createMaterials())
    expect(transport.userData.members.filter(member=>member.visible!==false&&member.role==='guide')).toHaveLength(1)
    expect(transport.userData.members.filter(member=>member.visible!==false&&member.role==='tourist')).toHaveLength(3)
    disposeObject3D(transport)
  })

  it('creates a detailed jungle jeep with traveller and four wheels',()=>{
    const jeep=createExpeditionJeep(createMaterials())
    expect(jeep.name).toBe('jungle-jeep')
    expect(jeep.userData.wheels).toHaveLength(4)
    expect(jeep.getObjectByName('jeep-roll-cage')).toBeTruthy()
    expect(jeep.getObjectByName('expedition-traveller')).toBeTruthy()
    disposeObject3D(jeep)
  })
  it('creates a naturally finished rowboat with an adult articulated guide and oars',()=>{
    const boat=createExpeditionBoat(createMaterials())
    expect(boat.name).toBe('water-boat')
    expect(boat.getObjectByName('boat-hull').material.roughness).toBeGreaterThanOrEqual(.35)
    expect(boat.userData.wakeAnchors).toHaveLength(2)
    expect(boat.getObjectByName('boat-rower')).toBeTruthy()
    expect(boat.getObjectByName('boat-rower-torso').material.color.getHexString()).toBe(EXPEDITION_PALETTES[0].jacket.slice(1))
    expect(boat.getObjectByName('boat-oar-port')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-starboard')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-port-blade').material.roughness).toBeGreaterThan(.6)
    const hullSize=new THREE.Box3().setFromObject(boat.getObjectByName('boat-hull')).getSize(new THREE.Vector3())
    expect(hullSize.z).toBeGreaterThan(hullSize.x*2)
    expect(boat.getObjectByName('boat-rower').position.y).toBeLessThan(.5)
    disposeObject3D(boat)
  })
  it.each([
    ['boat',createExpeditionBoat],
    ['jeep',createExpeditionJeep],
  ])('preserves adult identities and seated limbs within the %s draw-call budget',(_,create)=>{
    const transport=create(createMaterials())
    transport.userData.members.forEach((member,index)=>{
      expect(member.userData.identity).toBe(index)
      expect(member.userData.adultProportions).toBe(true)
      expect(member.userData.seated).toBe(true)
      expect(member.userData.elbows).toHaveLength(2)
      expect(member.userData.knees).toHaveLength(2)
      expect(member.getObjectByName('head')).toBeTruthy()
      expect(member.getObjectByName('hand')).toBeTruthy()
      expect(member.getObjectByName('boot')).toBeTruthy()
      expect(member.scale.toArray()).toEqual([1,1,1])
    })
    expect(meshCount(transport)).toBeLessThan(230)
    disposeObject3D(transport)
  })
  it('keeps the articulated boat and visible wake',()=>{
    const boat=createExpeditionBoat(createMaterials())
    expect(boat.getObjectByName('boat-rower')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-left')).toBeTruthy()
    expect(boat.getObjectByName('boat-oar-right')).toBeTruthy()
    expect(boat.getObjectByName('boat-wake')).toBeTruthy()
    disposeObject3D(boat)
  })
  it('animates the rower and both oars as one rowing stroke',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    updateBoat(boat,curve,.4,0,false)
    const first={
      left:boat.getObjectByName('boat-oar-left').rotation.x,
      torso:boat.getObjectByName('boat-rower-torso-pivot').rotation.x,
      elbow:boat.getObjectByName('boat-rower-left-elbow').rotation.x,
    }
    updateBoat(boat,curve,.5,.72,false)
    expect(boat.getObjectByName('boat-oar-left').rotation.x).not.toBe(first.left)
    expect(boat.getObjectByName('boat-oar-right').rotation.x).toBeCloseTo(boat.getObjectByName('boat-oar-left').rotation.x)
    expect(boat.getObjectByName('boat-rower-torso-pivot').rotation.x).not.toBe(first.torso)
    expect(boat.getObjectByName('boat-rower-left-elbow').rotation.x).not.toBe(first.elbow)
    disposeObject3D(boat)
  })
  it('keeps both modern and compatibility oar groups attached to visible geometry',()=>{
    const boat=createExpeditionBoat(createMaterials())
    ;['boat-oar-left','boat-oar-right','boat-oar-port','boat-oar-starboard']
      .forEach(name=>expect(meshCount(boat.getObjectByName(name))).toBeGreaterThan(0))
    const wake=boat.getObjectByName('boat-wake')
    expect(new Set(wake.children.map(child=>child.material)).size).toBe(wake.children.length)
    disposeObject3D(boat)
  })
  it('keeps the two wake trails symmetric and subtler ripples behind them',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    updateBoat(boat,curve,.5,.6,false)
    const wake=boat.getObjectByName('boat-wake')
    const trails=wake.children.filter(child=>child.name.startsWith('boat-wake-trail'))
    const ripples=wake.children.filter(child=>child.name.startsWith('boat-wake-ripple'))
    expect(trails[0].material.opacity).toBeCloseTo(trails[1].material.opacity)
    ripples.forEach(ripple=>expect(ripple.material.opacity).toBeLessThan(trails[0].material.opacity))
    disposeObject3D(boat)
  })
  it('keeps the wake shorter and quieter than the boat silhouette',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const wake=boat.getObjectByName('boat-wake')
    const trails=wake.children.filter(child=>child.name.startsWith('boat-wake-trail'))
    const ripples=wake.children.filter(child=>child.name.startsWith('boat-wake-ripple'))
    const wakeSize=new THREE.Box3().setFromObject(wake).getSize(new THREE.Vector3())
    const boatSize=new THREE.Box3().setFromObject(boat.getObjectByName('boat-hull')).getSize(new THREE.Vector3())
    expect(wakeSize.z).toBeLessThan(boatSize.z*.75)
    trails.forEach(trail=>expect(trail.material.opacity).toBeLessThanOrEqual(.22))
    ripples.forEach(ripple=>expect(ripple.material.opacity).toBeLessThanOrEqual(.1))
    disposeObject3D(boat)
  })
  it('smoothly merges a staged dock offset onto the route without a starting snap',()=>{
    const boat=createExpeditionBoat(createMaterials())
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,.35,0),
      new THREE.Vector3(0,.2,-8),
    ])
    boat.userData.dockLateralOffset=3.1
    const offsets=[]
    const positions=[]
    ;[0,.0001,.04,.08,.12,.16].forEach(progress=>{
      updateBoat(boat,curve,progress,0,true)
      const point=curve.getPointAt(progress)
      const tangent=curve.getTangentAt(progress).normalize()
      const lateral=new THREE.Vector3(tangent.z,0,-tangent.x).normalize()
      offsets.push(boat.position.clone().sub(point).dot(lateral))
      positions.push(boat.position.clone())
    })
    expect(Math.abs(offsets[0])).toBeCloseTo(3.1,5)
    expect(Math.abs(offsets[1]-offsets[0])).toBeLessThan(.005)
    expect(positions[1].distanceTo(positions[0])).toBeLessThan(.02)
    const magnitudes=offsets.map(Math.abs)
    magnitudes.slice(1).forEach((value,index)=>{
      expect(value).toBeLessThanOrEqual(magnitudes[index]+1e-9)
    })
    expect(offsets[4]).toBeCloseTo(0,6)
    expect(offsets[5]).toBeCloseTo(0,6)
    disposeObject3D(boat)
  })
  it('creates and animates an articulated trekker',()=>{
    const trekker=createTrekker(createMaterials())
    expect(trekker.userData.limbs).toHaveLength(4)
    expect(trekker.getObjectByName('trekker-backpack')).toBeTruthy()
    expect(trekker.getObjectByName('trekking-pole')).toBeTruthy()
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,1,-5)])
    updateTrekker(trekker,curve,.5,1,false)
    expect(trekker.userData.limbs[0].rotation.x).not.toBe(0)
    disposeObject3D(trekker)
  })
  it('moves jeep and boat along their routes',()=>{
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-8)])
    const jeep=createExpeditionJeep(createMaterials()),boat=createExpeditionBoat(createMaterials())
    updateJeep(jeep,curve,.5,1,false);updateBoat(boat,curve,.5,1,false)
    expect(jeep.position.z).toBeCloseTo(-4,1)
    expect(boat.position.z).toBeCloseTo(-4,1)
    disposeObject3D(jeep);disposeObject3D(boat)
  })
  it.each([
    ['jeep',createExpeditionJeep,updateJeep],
    ['boat',createExpeditionBoat,updateBoat],
  ])('smoothly turns the %s nose toward reverse route travel and holds at a stop',(_,create,update)=>{
    const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-100))
    const vehicle=create(createMaterials())
    const motion={deltaSeconds:1/60}
    const angleDifference=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b))
    try{
      update(vehicle,curve,.6,0,false,motion)
      expect(new THREE.Vector3(0,0,-1).applyEuler(vehicle.rotation).z).toBeCloseTo(-1,5)
      let previousHeading=vehicle.rotation.y
      for(let frame=1;frame<=90;frame++){
        update(vehicle,curve,.6-frame*.002,frame/60,false,motion)
        expect(Math.abs(angleDifference(vehicle.rotation.y,previousHeading))).toBeLessThanOrEqual(Math.PI*2/60+1e-9)
        previousHeading=vehicle.rotation.y
      }
      expect(vehicle.userData.travelMotion.direction).toBe(-1)
      expect(new THREE.Vector3(0,0,-1).applyEuler(vehicle.rotation).z).toBeGreaterThan(.999)
      const stoppedHeading=vehicle.rotation.y
      for(let frame=0;frame<30;frame++) update(vehicle,curve,.42,2+frame/60,false,motion)
      expect(vehicle.rotation.y).toBe(stoppedHeading)
      for(const offset of [.00002,-.00002,.00004,-.00003,0]){
        update(vehicle,curve,.42+offset,3,false,motion)
        expect(vehicle.userData.travelMotion.direction).toBe(-1)
      }
    }finally{disposeObject3D(vehicle)}
  })
  it('keeps turning speed independent of display refresh rate',()=>{
    const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-100))
    const headings=[30,60,120].map(fps=>{
      const jeep=createExpeditionJeep(createMaterials())
      try{
        const motion={deltaSeconds:1/fps}
        updateJeep(jeep,curve,.8,0,false,motion)
        for(let frame=1;frame<=fps;frame++) updateJeep(jeep,curve,.8-frame/fps*.2,frame/fps,false,motion)
        return jeep.rotation.y
      }finally{disposeObject3D(jeep)}
    })
    expect(Math.max(...headings)-Math.min(...headings)).toBeLessThan(.012)
  })
  it('holds an interrupted turn and rolls tires with actual forward or backward movement',()=>{
    const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-100))
    const jeep=createExpeditionJeep(createMaterials())
    const motion={deltaSeconds:1/60}
    try{
      updateJeep(jeep,curve,.7,0,false,motion)
      const wheel=jeep.userData.wheels[0]
      let rotation=wheel.rotation.x
      updateJeep(jeep,curve,.71,1/60,false,motion)
      expect(wheel.rotation.x).toBeLessThan(rotation)
      rotation=wheel.rotation.x
      updateJeep(jeep,curve,.70,2/60,false,motion)
      expect(wheel.rotation.x).toBeGreaterThan(rotation)
      const heading=jeep.rotation.y
      for(let frame=0;frame<60;frame++) updateJeep(jeep,curve,.7,1+frame/60,false,motion)
      expect(jeep.rotation.y).toBe(heading)
      for(let frame=1;frame<=90;frame++) updateJeep(jeep,curve,.7-frame*.002,2+frame/60,false,motion)
      rotation=wheel.rotation.x
      updateJeep(jeep,curve,.51,4,false,motion)
      expect(wheel.rotation.x).toBeLessThan(rotation)
    }finally{disposeObject3D(jeep)}
  })
  it('uses direct direction changes for reduced motion without turning parked vehicles',()=>{
    const curve=new THREE.LineCurve3(new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-100))
    const jeep=createExpeditionJeep(createMaterials())
    const motion={deltaSeconds:1/60,lockHeading:false}
    try{
      updateJeep(jeep,curve,.7,0,true,motion)
      updateJeep(jeep,curve,.69,1/60,true,motion)
      expect(new THREE.Vector3(0,0,-1).applyEuler(jeep.rotation).z).toBeCloseTo(1,6)
      const parkedHeading=jeep.rotation.y
      motion.lockHeading=true
      updateJeep(jeep,curve,.8,2/60,true,motion)
      expect(jeep.rotation.y).toBe(parkedHeading)
      expect(jeep.userData.travelMotion.moving).toBe(false)
    }finally{disposeObject3D(jeep)}
  })
  it('grounds all four jeep tires on the track just below the route centerline',()=>{
    const routeY=.25
    const curve=new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,routeY,0),
      new THREE.Vector3(0,routeY,-8),
    ])
    const jeep=createExpeditionJeep(createMaterials())
    updateJeep(jeep,curve,.5,1,true)
    jeep.updateMatrixWorld(true)
    jeep.userData.wheels.forEach(wheel=>{
      const tireBottom=new THREE.Box3().setFromObject(wheel,true).min.y
      expect(Math.abs(tireBottom-(routeY-.015))).toBeLessThan(.005)
    })
    disposeObject3D(jeep)
  })
  it('keeps every tire and contact shadow on the actual forest road while the body settles',()=>{
    const materials=createMaterials()
    const forest=createJungleWorld(materials,'mobile')
    const jeep=createExpeditionJeep(materials)
    const road=forest.getObjectByName('jeep-track-surface')
    const ray=new THREE.Raycaster()
    const down=new THREE.Vector3(0,-1,0)
    const wheelPosition=new THREE.Vector3()
    const surfaceAt=(x,z)=>{
      ray.set(new THREE.Vector3(x,10,z),down)
      const intersection=ray.intersectObject(road)[0]
      expect(intersection).toBeTruthy()
      return intersection.point.y
    }
    road.updateWorldMatrix(true,true)
    try{
      for(const progress of [.1,.55,.85]){
        const wheelHeights=[]
        const bodyHeights=[]
        for(const elapsed of [0,Math.PI/14,3*Math.PI/14]){
          updateJeep(jeep,forest.userData.route,progress,elapsed,false)
          jeep.updateWorldMatrix(true,true)
          jeep.userData.wheels.forEach(wheel=>{
            wheel.getWorldPosition(wheelPosition)
            const surface=surfaceAt(wheelPosition.x,wheelPosition.z)
            // Precise vertex bounds avoid overestimating a rotated tire's radius.
            const tireBottom=new THREE.Box3().setFromObject(wheel,true).min.y
            expect(Math.abs(tireBottom-surface)).toBeLessThan(.01)
          })
          wheelHeights.push(jeep.userData.wheels[0].getWorldPosition(wheelPosition).y)
          bodyHeights.push(jeep.userData.sprungBody.position.y)
          const shadow=jeep.userData.contactShadow.getWorldPosition(new THREE.Vector3())
          expect(Math.abs(shadow.y-surfaceAt(shadow.x,shadow.z))).toBeLessThan(.006)
        }
        expect(Math.max(...wheelHeights)-Math.min(...wheelHeights)).toBeLessThan(1e-8)
        expect(Math.max(...bodyHeights)-Math.min(...bodyHeights)).toBeGreaterThan(.02)
      }
    }finally{
      disposeObject3D(jeep)
      disposeObject3D(forest)
      Object.values(materials).forEach(material=>material.dispose())
    }
  })
})
