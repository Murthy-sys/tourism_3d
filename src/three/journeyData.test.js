import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import {createExpeditionController} from './expeditionController'
import {createMaterials,disposeObject3D} from './primitives'
import { JOURNEY_STOPS, clamp01, getExpeditionState, getJourneyState } from './journeyData'

describe('India journey data', () => {
  it('runs south to north through every approved tourism stop', () => {
    expect(JOURNEY_STOPS.map((stop) => stop.id)).toEqual([
      'kerala', 'tamil-nadu', 'hampi', 'goa', 'mumbai',
      'rajasthan', 'agra', 'varanasi', 'himalayas',
    ])
  })

  it('clamps progress and returns stable endpoint states', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(3)).toBe(1)
    expect(getJourneyState(-1).activeStop.id).toBe('kerala')
    expect(getJourneyState(2).activeStop.id).toBe('himalayas')
  })

  it('interpolates finite camera coordinates', () => {
    const state = getJourneyState(0.55)
    expect([...state.cameraPosition, ...state.cameraTarget].every(Number.isFinite)).toBe(true)
    expect(state.localProgress).toBeGreaterThanOrEqual(0)
    expect(state.localProgress).toBeLessThanOrEqual(1)
  })

  it('keeps the opening camera focused on the moving Ambassador', () => {
    const opening=getJourneyState(.08)
    expect(opening.phase).toBe('vehicle-intro')
    expect(opening.vehicleVisible).toBe(true)
    expect(opening.contentVisible).toBe(false)
  })

  it('exposes the three plan focus states in journey order', () => {
    expect([.48,.66,.82].map(p=>getJourneyState(p).planFocus)).toEqual([0,1,2])
  })

  it('frames the operations pavilion and each expedition world deliberately',()=>{
    expect(getJourneyState(.25).cameraTarget[2]).toBeCloseTo(-24,0)
    expect(getJourneyState(.48).cameraTarget[2]).toBeCloseTo(-53,0)
    expect(getJourneyState(.66).cameraTarget[2]).toBeCloseTo(-92.5,0)
    expect(getJourneyState(.82).cameraTarget[2]).toBeCloseTo(-129.5,0)
  })
  it('moves through Ambassador, jeep, boat and trekking phases',()=>{
    expect([.1,.34,.43,.55,.64,.78,.9].map(p=>getExpeditionState(p).activeTransport)).toEqual(['ambassador','ambassador','jeep','jeep','boat','trekker','trekker'])
    expect(getExpeditionState(.39).handoff).toBe('ambassador-to-jeep')
    expect(getExpeditionState(.60).handoff).toBe('jeep-to-boat')
    expect(getExpeditionState(.72).handoff).toBe('boat-to-trek')
    expect(getExpeditionState(.82).phase).toBe('hill-trek')
  })
  it('eases camera interpolation and centers intermediate frames on both landings',()=>{
    expect(getJourneyState(.5025).cameraPosition[0]).toBeCloseTo(1.25,5)
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    scene.updateMatrixWorld(true)
    const forestLanding=controller.worlds.forest.userData.landing.getWorldPosition(new THREE.Vector3())
    const hillLanding=controller.worlds.hills.userData.landing.getWorldPosition(new THREE.Vector3())
    forestLanding.y+=1.2
    hillLanding.y+=1.5
    expect(new THREE.Vector3(...getJourneyState(.595).cameraTarget).distanceTo(forestLanding)).toBeLessThan(.25)
    expect(new THREE.Vector3(...getJourneyState(.725).cameraTarget).distanceTo(hillLanding)).toBeLessThan(.25)
    disposeObject3D(scene)
  })
  it('targets the elevated hill trail and lodge with continuous desktop framing',()=>{
    const scene=new THREE.Scene(),controller=createExpeditionController(scene,createMaterials(),'mobile')
    controller.update(getExpeditionState(.82),2,false)
    scene.updateMatrixWorld(true)
    const guide=controller.transports.trekker.userData.members[0].root.getWorldPosition(new THREE.Vector3())
    const hillTarget=new THREE.Vector3(...getJourneyState(.82).cameraTarget)
    expect(Math.hypot(hillTarget.x-guide.x,hillTarget.z-guide.z)).toBeLessThan(2)
    expect(hillTarget.y-guide.y).toBeGreaterThanOrEqual(.5)
    expect(hillTarget.y-guide.y).toBeLessThan(3)

    const lodge=controller.worlds.hills.getObjectByName('hill-lodge').getWorldPosition(new THREE.Vector3())
    const contactTarget=new THREE.Vector3(...getJourneyState(.92).cameraTarget)
    expect(Math.hypot(contactTarget.x-lodge.x,contactTarget.z-lodge.z)).toBeLessThan(2)
    expect(contactTarget.y-lodge.y).toBeGreaterThanOrEqual(1)
    const before=new THREE.Vector3(...getJourneyState(.92-1e-6).cameraTarget)
    expect(contactTarget.distanceTo(before)).toBeLessThan(.01)
    disposeObject3D(scene)
  })
  it('describes the final stop as lush hill country without snow or Himalayan copy',()=>{
    const finalStop=JOURNEY_STOPS.at(-1)
    expect(finalStop.name).toBe('Hill Country Trek')
    expect(finalStop.description).toBe('Finish among forested ridges, mist-filled valleys and winding green trails.')
    expect(`${finalStop.name} ${finalStop.kicker} ${finalStop.description}`).not.toMatch(/snow|ice|Himalaya/i)
  })
  it('keeps each expedition transport close enough to read clearly',()=>{
    ;[.48,.66,.82].forEach(progress=>{
      const {cameraPosition,cameraTarget}=getJourneyState(progress)
      const distance=Math.hypot(...cameraPosition.map((value,index)=>value-cameraTarget[index]))
      expect(distance).toBeLessThan(15)
    })
  })
})
