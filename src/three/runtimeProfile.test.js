import {describe,expect,it} from 'vitest'
import {getRuntimeProfile} from './runtimeProfile'

describe('device and connection budgets',()=>{
  it('keeps capable desktops detailed when optional browser hints are absent',()=>{
    expect(getRuntimeProfile(1440)).toMatchObject({quality:'desktop',compactAssets:false})
  })
  it('uses lighter scenery on a large screen with limited hardware',()=>{
    expect(getRuntimeProfile(1440,{deviceMemory:4,hardwareConcurrency:8})).toMatchObject({quality:'mobile',constrainedDevice:true})
    expect(getRuntimeProfile(1440,{hardwareConcurrency:2})).toMatchObject({quality:'mobile'})
  })
  it('keeps desktop scenery on slow connections while reducing downloads',()=>{
    for(const connection of [{saveData:true},{effectiveType:'3g'},{downlink:1.5}]){
      expect(getRuntimeProfile(1440,{connection})).toMatchObject({quality:'desktop',compactAssets:true})
    }
  })
  it('selects compact assets on phones without treating an unknown speed as zero bandwidth',()=>{
    expect(getRuntimeProfile(390)).toMatchObject({quality:'mobile',compactAssets:true})
    expect(getRuntimeProfile(1440,{connection:{downlink:0}}).compactAssets).toBe(false)
  })
})
