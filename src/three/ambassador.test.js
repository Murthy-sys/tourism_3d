import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createAmbassador, updateAmbassador } from './ambassador'
import { createMaterials, disposeObject3D } from './primitives'

describe('vintage Ambassador', () => {
  it('builds a detailed vehicle with traveller, lights and four wheels', () => {
    const car=createAmbassador(createMaterials())
    expect(car.name).toBe('ambassador-vehicle')
    expect(car.userData.wheels).toHaveLength(4)
    expect(car.userData.traveller.name).toBe('ambassador-traveller')
    expect(car.getObjectByName('ambassador-headlights')).toBeTruthy()
    expect(car.getObjectByName('ambassador-grille')).toBeTruthy()
    disposeObject3D(car)
  })

  it('follows and faces the route while rotating its wheels', () => {
    const car=createAmbassador(createMaterials())
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-10)])
    updateAmbassador(car,curve,.5,1,false)
    expect(car.position.z).toBeCloseTo(-5,1)
    expect(car.userData.wheels[0].rotation.x).not.toBe(0)
    disposeObject3D(car)
  })
})
