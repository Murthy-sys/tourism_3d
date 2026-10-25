import { describe,expect,it } from 'vitest'
import { SCROLL_TIMELINE,JOURNEY_TRAVEL_SCREENS,scrollToJourneyProgress,journeyProgressToScroll,steadyTravelProgress } from './scrollTimeline'

describe('journey scroll pacing',()=>{
  it('round-trips every chapter and intermediate menu destination monotonically',()=>{
    let previous=-1
    for(let index=0;index<=1000;index++){
      const progress=index/1000
      const scroll=journeyProgressToScroll(progress)
      expect(scroll).toBeGreaterThan(previous)
      expect(scrollToJourneyProgress(scroll)).toBeCloseTo(progress,12)
      previous=scroll
    }
    for(const key of SCROLL_TIMELINE){
      expect(scrollToJourneyProgress(key.screens/JOURNEY_TRAVEL_SCREENS)).toBeCloseTo(key.progress,12)
    }
  })
  it('gives long journeys more scroll distance and reduces small wheel movement',()=>{
    const pixels=100,viewport=900
    const oldProgress=pixels/(17*viewport)
    for(const [progress,maxRelativeMotion] of [[.072,.2],[.5,.65],[.8,.6]]){
      const native=journeyProgressToScroll(progress)
      const next=scrollToJourneyProgress(native+pixels/(JOURNEY_TRAVEL_SCREENS*viewport))
      expect(next-progress).toBeLessThan(oldProgress*maxRelativeMotion)
    }
  })
  it('clamps native overscroll and invalid values',()=>{
    for(const map of [scrollToJourneyProgress,journeyProgressToScroll,steadyTravelProgress]){
      expect(map(-.5)).toBe(0)
      expect(map(2)).toBe(1)
      expect(map(NaN)).toBe(0)
    }
  })
  it('drives steadily through the middle and eases gently into both stops',()=>{
    const middle=[.2,.4,.6,.8].map(t=>steadyTravelProgress(t+.001)-steadyTravelProgress(t))
    middle.forEach(step=>expect(step).toBeCloseTo(.001/.9,12))
    expect(steadyTravelProgress(.001)).toBeLessThan(middle[0]/1000)
    expect(1-steadyTravelProgress(.999)).toBeLessThan(middle[0]/1000)
    for(let i=0;i<=100;i++){
      const t=i/100
      expect(steadyTravelProgress(t)).toBeCloseTo(1-steadyTravelProgress(1-t),12)
    }
  })
})
