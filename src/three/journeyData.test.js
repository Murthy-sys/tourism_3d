import { describe, expect, it } from 'vitest'
import { JOURNEY_STOPS, clamp01, getExpeditionState, getJourneyState } from './journeyData'
import { LANDMARKS } from './terrain'
import { mapJourneyZ } from './journeySpatial'
import { getCityCameraFrame } from './cityJourney'

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

  it('keeps the expedition state stable while the city opening owns the camera', () => {
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
    const forestReveal=getJourneyState(.59)
    const forestApproach=getJourneyState(.60)
    const rounded=values=>values.map(value=>Number(value.toFixed(3)))
    expect(rounded(corridor.cameraPosition)).toEqual(rounded([.8,1.55,mapJourneyZ(-57.9)+2.9]))
    expect(rounded(corridor.cameraTarget)).toEqual([-4.3,.42,mapJourneyZ(-57.9)])
    expect(rounded(forestReveal.cameraPosition)).toEqual(rounded([-3,2.15,mapJourneyZ(-83.15)+2.15]))
    expect(rounded(forestReveal.cameraTarget)).toEqual(rounded([-.5,.73,mapJourneyZ(-83.15)]))
    expect(rounded(forestApproach.cameraPosition)).toEqual([-3,1.65,LANDMARKS.forestLanding[2]+4])
    expect(rounded(forestApproach.cameraTarget)).toEqual([-2,.3,LANDMARKS.forestLanding[2]])
    ;[corridor,forestReveal,forestApproach].forEach(({cameraPosition,cameraTarget})=>{
      const distance=Math.hypot(...cameraPosition.map(
        (value,index)=>value-cameraTarget[index],
      ))
      expect(distance).toBeLessThan(6.2)
      expect(cameraPosition[1]-cameraTarget[1]).toBeLessThan(1.5)
    })
  })

  it('descends into the city, follows its coach, and holds the original mountain stop',()=>{
    for(const progress of [0,.025,.045,.072,.105,.14]){
      const frame=getCityCameraFrame(progress)
      expect(getJourneyState(progress).cameraPosition).toEqual(frame.camera)
      expect(getJourneyState(progress).cameraTarget).toEqual(frame.target)
    }
    expect(getJourneyState(0).cameraTarget[2]).toBeGreaterThan(140)
    expect(getJourneyState(.105).cameraPosition).toEqual([8.5,3.8,46])
    expect(getJourneyState(.105).cameraTarget).toEqual([-2,1.55,34.8])
    expect(getJourneyState(.19).cameraPosition).toEqual([4.5,9.8,6])
    expect(getJourneyState(.19).cameraTarget).toEqual([0,3,-4])
  })

  it('preserves the expedition handoffs and reserves the ending for the waterfall stop',()=>{
    expect([
      [0,'mountain-trek'],
      [.279999,'mountain-trek'],
      [.28,'trek-to-boat'],
      [.419999,'trek-to-boat'],
      [.42,'water-boat'],
      [.599999,'water-boat'],
      [.60,'boat-to-jeep'],
      [.739999,'boat-to-jeep'],
      [.74,'forest-jeep'],
      [.899999,'forest-jeep'],
      [.90,'contact'],
      [1,'contact'],
    ].map(([progress])=>getExpeditionState(progress).phase)).toEqual([
      'mountain-trek',
      'mountain-trek',
      'trek-to-boat',
      'trek-to-boat',
      'water-boat',
      'water-boat',
      'boat-to-jeep',
      'boat-to-jeep',
      'forest-jeep',
      'forest-jeep',
      'contact',
      'contact',
    ])
  })

  it('keeps the complete desktop rail continuous at dense progress samples',()=>{
    // This samples rail continuity, not per-frame movement; the runtime bounds each frame separately.
    const samples=100000
    let maximumJump=0
    for(let index=0;index<samples;index+=1){
      const from=getJourneyState(index/samples)
      const to=getJourneyState((index+1)/samples)
      const jump=Math.max(
        Math.hypot(...from.cameraPosition.map(
          (value,axis)=>value-to.cameraPosition[axis],
        )),
        Math.hypot(...from.cameraTarget.map(
          (value,axis)=>value-to.cameraTarget[axis],
        )),
      )
      maximumJump=Math.max(maximumJump,jump)
    }
    expect(maximumJump).toBeLessThan(.1)
  })

  it('joins the mountain-entry rail with continuous velocity',()=>{
    const h=1e-5
    const velocity=(from,to)=>from.map(
      (value,axis)=>(to[axis]-value)/h,
    )
    const magnitude=vector=>Math.hypot(...vector)
    const difference=(a,b)=>Math.hypot(...a.map(
      (value,axis)=>value-b[axis],
    ))

    for(const boundary of [.14,.19]){
      const before=getJourneyState(boundary-h)
      const at=getJourneyState(boundary)
      const after=getJourneyState(boundary+h)
      for(const field of ['cameraPosition','cameraTarget']){
        const left=velocity(before[field],at[field])
        const right=velocity(at[field],after[field])
        expect(magnitude(left)).toBeLessThan(1e-3)
        expect(magnitude(right)).toBeLessThan(1e-3)
        expect(difference(left,right)).toBeLessThan(1e-3)
      }
    }
  })

  it('moves monotonically through the softened mountain-entry segment',()=>{
    const start=getJourneyState(.14)
    const end=getJourneyState(.19)
    for(const field of ['cameraPosition','cameraTarget']){
      const delta=end[field].map(
        (value,axis)=>value-start[field][axis],
      )
      const lengthSquared=delta.reduce(
        (sum,value)=>sum+value*value,
        0,
      )
      let previous=-Infinity
      for(let index=0;index<=50;index+=1){
        const current=getJourneyState(.14+index/1000)[field]
        const scalar=current.reduce(
          (sum,value,axis)=>
            sum+(value-start[field][axis])*delta[axis],
          0,
        )/lengthSquared
        expect(scalar).toBeGreaterThanOrEqual(previous-1e-10)
        expect(scalar).toBeGreaterThanOrEqual(-1e-10)
        expect(scalar).toBeLessThanOrEqual(1+1e-10)
        previous=scalar
      }
    }
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
