import { describe, expect, it } from 'vitest'
import {getAtmosphereState,getDampingFactor,getMobileTrekCamera,getRenderQuality,getWorldVisibility} from './indiaJourney'

describe('renderer quality', () => {
  it('selects the simplified mobile scene at narrow widths', () => {
    expect(getRenderQuality(390)).toBe('mobile')
    expect(getRenderQuality(1440)).toBe('desktop')
  })
  it('isolates cinematic architecture from competing legacy regions',()=>{
    expect(getWorldVisibility('operations')).toEqual(['deccan','tourism-operations-pavilion'])
    expect(getWorldVisibility('plans')).toEqual([])
    expect(getWorldVisibility('contact')).toEqual([])
  })
  it('frames the mobile trekker from a readable trailing distance',()=>{
    expect(getMobileTrekCamera([2,1,-130])).toEqual({camera:[5,3.2,-122],target:[2,1.9,-130]})
  })
  it('uses frame-rate independent exponential damping',()=>{
    const at60Fps=getDampingFactor(1/60)
    const at30Fps=getDampingFactor(1/30)
    expect(at60Fps).toBeCloseTo(1-Math.exp(-(1/60)*4.5),8)
    expect(1-(1-at60Fps)**60).toBeCloseTo(1-(1-at30Fps)**30,8)
  })
  it('blends fog range and exposure from the same landscape weights',()=>{
    const forest=getAtmosphereState({forest:1,water:0,hills:0})
    const water=getAtmosphereState({forest:0,water:1,hills:0})
    const hills=getAtmosphereState({forest:0,water:0,hills:1})
    const blend=getAtmosphereState({forest:.25,water:.5,hills:.25})
    for(const key of ['fogNear','fogFar','exposure']){
      expect(blend[key]).toBeCloseTo(forest[key]*.25+water[key]*.5+hills[key]*.25,8)
    }
    expect(blend.fogFar).toBeGreaterThan(blend.fogNear)
  })
})
