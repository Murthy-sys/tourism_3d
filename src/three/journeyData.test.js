import { describe, expect, it } from 'vitest'
import { JOURNEY_STOPS, clamp01, getExpeditionState, getJourneyState } from './journeyData'
import { LANDMARKS,sampleMountainHeight } from './terrain'

describe('India journey data', () => {
  it('runs south to north through every approved tourism stop', () => {
    expect(JOURNEY_STOPS.map((stop) => stop.id)).toEqual([
      'kerala', 'tamil-nadu', 'hampi', 'goa', 'mumbai',
      'rajasthan', 'agra', 'varanasi', 'hill-country',
    ])
  })

  it('clamps progress and returns stable endpoint states', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(3)).toBe(1)
    expect(getJourneyState(-1).activeStop.id).toBe('kerala')
    expect(getJourneyState(2).activeStop.id).toBe('hill-country')
  })

  it('interpolates finite camera coordinates', () => {
    const state = getJourneyState(0.55)
    expect([...state.cameraPosition, ...state.cameraTarget].every(Number.isFinite)).toBe(true)
    expect(state.localProgress).toBeGreaterThanOrEqual(0)
    expect(state.localProgress).toBeLessThanOrEqual(1)
  })

  it('opens on the mountain trek with the four-person party visible', () => {
    const opening=getJourneyState(.08)
    expect(opening.phase).toBe('mountain')
    expect(opening.expedition.activeTransport).toBe('trekker')
    expect(opening.contentVisible).toBe(true)
  })

  it('exposes the three plan focus states in journey order', () => {
    expect([.34,.5,.82].map(p=>getJourneyState(p).planFocus)).toEqual([0,1,2])
  })

  it('frames both physical landings before, during, and after each handoff',()=>{
    const mountainLanding=new Set([.28,.35,.42].map(progress=>Math.round(getJourneyState(progress).cameraTarget[2])))
    const forestLanding=new Set([.60,.67,.74].map(progress=>Math.round(getJourneyState(progress).cameraTarget[2])))
    expect([...mountainLanding].every(z=>Math.abs(z-LANDMARKS.mountainLanding[2])<=8)).toBe(true)
    expect([...forestLanding].every(z=>Math.abs(z-LANDMARKS.forestLanding[2])<=8)).toBe(true)
  })

  it('uses the required biome and transport order',()=>{
    expect([.05,.5,.9].map(p=>getExpeditionState(p).activeTransport)).toEqual(['trekker','boat','jeep'])
    expect([.05,.5,.9].map(p=>getExpeditionState(p).biome)).toEqual(['mountain','water','forest'])
    expect(JSON.stringify(getExpeditionState(.5))).not.toMatch(/ambassador|monument|ice/i)
  })

  it('contains no active Himalaya, snow, or ice semantics',()=>{
    expect(JSON.stringify(JOURNEY_STOPS)).not.toMatch(/himalaya|snow|ice/i)
    expect(JSON.stringify(getJourneyState(1))).not.toMatch(/himalaya|snow|ice/i)
  })

  it('uses the full landing ranges for both handoffs',()=>{
    expect(getExpeditionState(.34)).toEqual({
      phase:'trek-to-boat',
      biome:'mountain-water',
      activeTransport:'trekker',
      localProgress:(.34-.28)/.14,
    })
    expect(getExpeditionState(.68)).toEqual({
      phase:'boat-to-jeep',
      biome:'water-forest',
      activeTransport:'boat',
      localProgress:(.68-.60)/.14,
    })
  })

  it('keeps each expedition transport close enough to read clearly',()=>{
    ;[.16,.5,.82].forEach(progress=>{
      const {cameraPosition,cameraTarget}=getJourneyState(progress)
      const distance=Math.hypot(...cameraPosition.map((value,index)=>value-cameraTarget[index]))
      expect(distance).toBeLessThan(15)
    })
  })

  it('keeps the desktop water tracking cameras low and close to the boat corridor',()=>{
    const corridor=getJourneyState(.52)
    const forestApproach=getJourneyState(.60)
    const rounded=values=>values.map(value=>Number(value.toFixed(3)))
    expect(rounded(corridor.cameraPosition)).toEqual([.8,1.55,-55])
    expect(rounded(corridor.cameraTarget)).toEqual([-4.3,.42,-57.9])
    expect(rounded(forestApproach.cameraPosition)).toEqual([-3,1.65,-82])
    expect(rounded(forestApproach.cameraTarget)).toEqual([-2,.3,-86])
    ;[corridor,forestApproach].forEach(({cameraPosition,cameraTarget})=>{
      const distance=Math.hypot(...cameraPosition.map(
        (value,index)=>value-cameraTarget[index],
      ))
      expect(distance).toBeLessThan(6.2)
      expect(cameraPosition[1]-cameraTarget[1]).toBeLessThan(1.5)
    })
  })

  it('keeps the mountain opening far enough back to frame the whole party',()=>{
    const {cameraPosition,cameraTarget}=getJourneyState(.08)
    const distance=Math.hypot(...cameraPosition.map((value,index)=>value-cameraTarget[index]))
    expect(distance).toBeGreaterThan(12)
    expect(distance).toBeLessThan(16)
    expect(cameraPosition[2]).toBeLessThanOrEqual(4.5)
    expect(cameraTarget[2]).toBeLessThanOrEqual(-3)
    expect(cameraPosition[1]-sampleMountainHeight(cameraPosition[0],cameraPosition[2]))
      .toBeGreaterThan(4)
  })

  it('keeps the forest camera inside the protected route corridor',()=>{
    const {cameraPosition,cameraTarget}=getJourneyState(.84)
    expect(Math.abs(cameraPosition[0]-cameraTarget[0])).toBeLessThanOrEqual(2)
    expect(Math.hypot(...cameraPosition.map((value,index)=>value-cameraTarget[index])))
      .toBeLessThan(9)
  })

  it('keeps the landing camera behind the full trekking party during the water reveal',()=>{
    ;[.26,.35].forEach(progress=>{
      const {cameraPosition,cameraTarget}=getJourneyState(progress)
      expect(cameraPosition[2]-cameraTarget[2]).toBeGreaterThan(11)
      expect(Math.hypot(...cameraPosition.map((value,index)=>value-cameraTarget[index])))
        .toBeGreaterThan(14)
    })
  })
})
