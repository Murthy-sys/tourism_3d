import { describe, expect, it } from 'vitest'
import { getMobileTrekCamera, getRenderQuality, getWorldVisibility } from './indiaJourney'

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
})
