import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createMaterials,disposeObject3D } from './primitives'
import { createExpeditionBoat } from './expeditionVehicles'
import { createJungleWorld } from './jungleWorld'
import { createWaterWorld,updateWaterWorld } from './waterWorld'

const materialSet=root=>{
  const materials=new Set()
  root.traverse(object=>(Array.isArray(object.material)?object.material:[object.material]).filter(Boolean).forEach(material=>materials.add(material)))
  return materials
}

const bankCoordinatesAt=(bank,z)=>{
  const coordinates=[]
  const positions=bank.geometry.getAttribute('position')
  for(let index=0;index<positions.count;index++)if(Math.abs(positions.getZ(index)-z)<.001)coordinates.push(positions.getX(index))
  return coordinates
}

describe('water world',()=>{
  it('connects the forest landing to a narrowing hill-side river corridor',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    ;['forest-water-landing','hill-water-landing','river-banks','water-shallows','water-reflection-layer'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())
    const routeStart=world.userData.route.getPoint(0),routeEnd=world.userData.route.getPoint(1)
    expect(world.getObjectByName('forest-water-landing').position.distanceTo(routeStart)).toBeLessThan(1)
    expect(world.getObjectByName('hill-water-landing').position.distanceTo(routeEnd)).toBeLessThan(1)

    const leftBank=world.getObjectByName('left-river-bank'),rightBank=world.getObjectByName('right-river-bank')
    const startZ=Math.max(...Array.from(leftBank.geometry.getAttribute('position').array).filter((_,index)=>index%3===2))
    const endZ=Math.min(...Array.from(leftBank.geometry.getAttribute('position').array).filter((_,index)=>index%3===2))
    const startSeparation=Math.min(...bankCoordinatesAt(rightBank,startZ))-Math.max(...bankCoordinatesAt(leftBank,startZ))
    const endSeparation=Math.min(...bankCoordinatesAt(rightBank,endZ))-Math.max(...bankCoordinatesAt(leftBank,endZ))
    expect(startSeparation).toBeCloseTo(12)
    expect(endSeparation).toBeCloseTo(5)
    expect(endSeparation).toBeLessThan(startSeparation)
    expect(leftBank.position.y).toBeGreaterThan(world.getObjectByName('left-water-shallows').position.y)
    expect(world.getObjectByName('left-water-shallows').position.y).toBeGreaterThan(world.getObjectByName('water-reflection-layer').position.y)
    disposeObject3D(world)
  })

  it('owns materials independently of the shared palette, other water worlds, jungle and transport',()=>{
    const materials=createMaterials()
    const first=createWaterWorld(materials,'mobile'),second=createWaterWorld(materials,'mobile')
    const jungle=createJungleWorld(materials,'mobile'),boat=createExpeditionBoat(materials)
    const shared=new Set(Object.values(materials)),firstMaterials=materialSet(first),secondMaterials=materialSet(second)
    const jungleMaterials=materialSet(jungle),boatMaterials=materialSet(boat)
    expect([...firstMaterials].every(material=>!shared.has(material))).toBe(true)
    expect([...firstMaterials].every(material=>!secondMaterials.has(material))).toBe(true)
    expect([...firstMaterials].every(material=>!jungleMaterials.has(material))).toBe(true)
    expect([...firstMaterials].every(material=>!boatMaterials.has(material))).toBe(true)
    disposeObject3D(first);disposeObject3D(second);disposeObject3D(jungle);disposeObject3D(boat)
  })

  it('animates water layers independently while keeping the boat wake attached',()=>{
    const world=createWaterWorld(createMaterials(),'desktop'),boat=new THREE.Group()
    const water=world.getObjectByName('reflective-water'),reflection=world.getObjectByName('water-reflection-layer')
    boat.position.set(3,.2,-6);boat.rotation.y=.7
    updateWaterWorld(world,.4,boat)
    const firstWaterY=water.position.y,firstReflectionY=reflection.position.y
    updateWaterWorld(world,1.1,boat)
    expect(water.position.y-firstWaterY).not.toBeCloseTo(reflection.position.y-firstReflectionY)
    expect(reflection.material.transparent).toBe(true)
    expect(reflection.material.opacity).toBeLessThan(.3)
    expect(world.getObjectByName('boat-wake').position).toEqual(boat.position)
    expect(world.getObjectByName('boat-wake').rotation.y).toBe(boat.rotation.y)
    disposeObject3D(world)
  })
})
