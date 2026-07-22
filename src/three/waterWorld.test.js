import { describe,expect,it } from 'vitest'
import * as THREE from 'three'
import { createMaterials,disposeObject3D } from './primitives'
import { createExpeditionBoat,updateBoat } from './expeditionVehicles'
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

const horizontalGap=(first,second)=>{
  const xGap=Math.max(first.min.x-second.max.x,second.min.x-first.max.x,0)
  const zGap=Math.max(first.min.z-second.max.z,second.min.z-first.max.z,0)
  return Math.hypot(xGap,zGap)
}

describe('water world',()=>{
  it('connects the forest landing to a narrowing hill-side river corridor',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    ;['forest-water-landing','hill-water-landing','river-banks','water-shallows','water-reflection-layer'].forEach(name=>expect(world.getObjectByName(name)).toBeTruthy())

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

  it('exposes both shallow-water strips laterally inside the river banks',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    const leftBank=world.getObjectByName('left-river-bank'),rightBank=world.getObjectByName('right-river-bank')
    const leftShallows=world.getObjectByName('left-water-shallows'),rightShallows=world.getObjectByName('right-water-shallows')
    const sampleZ=0
    const leftInnerEdge=Math.max(...bankCoordinatesAt(leftBank,sampleZ))
    const rightInnerEdge=Math.min(...bankCoordinatesAt(rightBank,sampleZ))
    expect(Math.max(...bankCoordinatesAt(leftShallows,sampleZ))-leftInnerEdge).toBeGreaterThan(1)
    expect(rightInnerEdge-Math.min(...bankCoordinatesAt(rightShallows,sampleZ))).toBeGreaterThan(1)
    disposeObject3D(world)
  })

  it('keeps a layered forest bank readable around the incoming landing',()=>{
    const world=createWaterWorld(createMaterials(),'desktop')
    const detail=world.getObjectByName('forest-handoff-bank-detail')
    expect(detail).toBeTruthy()
    expect(world.getObjectByName('wet-bank-shelves')).toBeTruthy()
    expect(detail.children.length).toBeGreaterThanOrEqual(30)
    expect(new Set(detail.children.map(child=>child.userData.detailType))).toEqual(new Set(['tree','shrub','reed','rock']))
    const landing=world.getObjectByName('forest-water-landing')
    detail.children.forEach(child=>expect(Math.abs(child.position.z-landing.position.z)).toBeLessThan(10))
    disposeObject3D(world)
  })

  it('parks the boat hull beside each landing deck with docking clearance',()=>{
    const materials=createMaterials(),world=createWaterWorld(materials,'desktop'),boat=createExpeditionBoat(materials)
    world.add(boat)
    ;[[0,'forest-water-landing'],[1,'hill-water-landing']].forEach(([progress,landingName])=>{
      updateBoat(boat,world.userData.route,progress,0,true);world.updateMatrixWorld(true)
      const hullBox=new THREE.Box3().setFromObject(boat.getObjectByName('boat-hull'))
      const deckBox=new THREE.Box3().setFromObject(world.getObjectByName(landingName))
      const clearance=horizontalGap(hullBox,deckBox)
      expect(clearance).toBeGreaterThan(.25)
      expect(clearance).toBeLessThan(1.2)
    })
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
