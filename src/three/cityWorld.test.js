import * as THREE from 'three'
import { describe,expect,it } from 'vitest'
import { CITY_DEPARTURE,createCityWorld,updateCityWorld } from './cityWorld'
import { disposeObject3D } from './primitives'

describe('city departure district',()=>{
  it.each(['desktop','mobile'])('keeps architecture, traffic and commuters within a bounded %s draw budget',quality=>{
    const city=createCityWorld({},quality)
    let draws=0
    city.traverse(object=>{
      if(!object.isMesh) return
      draws++
      expect(object.geometry.attributes.position.array.every(Number.isFinite)).toBe(true)
    })
    expect(draws).toBeLessThan(60)
    expect(city.userData.buildings.length).toBeGreaterThanOrEqual(12)
    expect(city.getObjectByName('city-bus-shelter')).toBeTruthy()
    expect(city.userData.traffic.cars.length).toBeGreaterThanOrEqual(4)
    expect(city.userData.boardingPeople).toHaveLength(4)
    disposeObject3D(city)
  })

  it('keeps tall buildings outside the opening camera and coach sightline',()=>{
    const city=createCityWorld({},'desktop')
    const start=new THREE.Vector3(15,9,170),end=new THREE.Vector3(-4,2,150)
    const ray=new THREE.Ray(start,end.clone().sub(start).normalize())
    const length=start.distanceTo(end),hit=new THREE.Vector3()
    city.userData.buildings.forEach(({x,z,width,depth,height})=>{
      const bounds=new THREE.Box3(new THREE.Vector3(x-width/2,.5,z-depth/2),new THREE.Vector3(x+width/2,height+.5,z+depth/2))
      const intersection=ray.intersectBox(bounds,hit)
      expect(intersection&&start.distanceTo(intersection)<length).toBeFalsy()
    })
    const road=city.getObjectByName('city-asphalt')
    road.geometry.computeBoundingBox()
    expect(road.geometry.boundingBox.min.z).toBe(128)
    expect(CITY_DEPARTURE.heading).toBe(0)
    disposeObject3D(city)
  })

  it('boards the queue at the coach entrance and restores it when scroll reverses',()=>{
    const city=createCityWorld({},'mobile')
    const initial=city.userData.boardingPeople.map(person=>person.position.clone())
    updateCityWorld(city,8,false,.034)
    expect(city.userData.boardingPeople[0].position.x).toBeLessThan(initial[0].x)
    updateCityWorld(city,10,false,CITY_DEPARTURE.boardingEnd)
    city.userData.boardingPeople.forEach(person=>{
      expect(person.boarded).toBe(true)
      expect(person.position.x).toBeCloseTo(-3.55)
      expect(person.position.z).toBeCloseTo(146.2)
    })
    updateCityWorld(city,11,false,0)
    city.userData.boardingPeople.forEach((person,index)=>{
      expect(person.boarded).toBe(false)
      expect(person.position.distanceTo(initial[index])).toBeLessThan(1e-8)
    })
    disposeObject3D(city)
  })

  it('freezes ambient motion for reduced motion while retaining scroll-driven boarding',()=>{
    const city=createCityWorld({},'mobile')
    updateCityWorld(city,3,true,0)
    const traffic=city.userData.traffic.batches[0].instanceMatrix.array.slice()
    const people=city.userData.crowd.people.map(person=>person.position.toArray())
    updateCityWorld(city,40,true,0)
    expect(city.userData.traffic.batches[0].instanceMatrix.array).toEqual(traffic)
    expect(city.userData.crowd.people.map(person=>person.position.toArray())).toEqual(people)
    updateCityWorld(city,50,true,CITY_DEPARTURE.boardingEnd)
    expect(city.userData.boardingPeople.every(person=>person.boarded)).toBe(true)
    disposeObject3D(city)
  })
})
