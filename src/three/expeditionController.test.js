import { describe,expect,it } from 'vitest'
import { getExpeditionVisibility, getIceLayerVisibility } from './expeditionController'

describe('expedition visibility',()=>{
  it('shows one transport in stable phases and both during handoffs',()=>{
    expect(getExpeditionVisibility({phase:'jungle-jeep'}).transports).toEqual(['jeep'])
    expect(getExpeditionVisibility({phase:'water-boat'}).transports).toEqual(['boat'])
    expect(getExpeditionVisibility({phase:'ice-trek'}).transports).toEqual(['trekker'])
    expect(getExpeditionVisibility({phase:'jeep-to-boat'}).transports).toEqual(['jeep','boat'])
    expect(getExpeditionVisibility({phase:'boat-to-trek'}).worlds).toEqual(['water','ice'])
  })
  it('removes only obstructing ice layers for mobile trek and contact',()=>{
    expect(getIceLayerVisibility('ice-trek','mobile')).toEqual({foreground:false,midground:true})
    expect(getIceLayerVisibility('contact','desktop')).toEqual({foreground:false,midground:false})
    expect(getIceLayerVisibility('ice-trek','desktop')).toEqual({foreground:true,midground:true})
  })
})
