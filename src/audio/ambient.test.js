import { afterEach, describe, expect, it } from 'vitest'
import { getAmbientEnabled, getAmbientEnvironment, setAmbientEnabled, setAmbientEnvironment, subscribeAmbient } from './ambient'

describe('ambient sound state',()=>{
  afterEach(()=>setAmbientEnabled(false))
  it('publishes mute and resume state changes',()=>{
    const states=[]
    const unsubscribe=subscribeAmbient(value=>states.push(value))
    setAmbientEnabled(true);setAmbientEnabled(false);unsubscribe()
    expect(states).toEqual([true,false])
    expect(getAmbientEnabled()).toBe(false)
  })
  it('publishes the active environmental sound layer',()=>{
    const states=[];const unsubscribe=subscribeAmbient((_,environment)=>states.push(environment))
    setAmbientEnvironment('jungle');setAmbientEnvironment('water');setAmbientEnvironment('mountain');unsubscribe()
    expect(states).toEqual(['jungle','water','mountain'])
    expect(getAmbientEnvironment()).toBe('mountain')
  })
})
