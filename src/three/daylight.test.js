import * as THREE from 'three'
import {describe,expect,it} from 'vitest'
import {createDaylightTexture} from './daylight'

describe('daylight environment texture',()=>{
  it('maps blue sky above and dark earth below for Three equirectangular sampling',()=>{
    const texture=createDaylightTexture()
    const {data,width,height}=texture.image
    const sampleDirection=direction=>{
      // Three's equirectUv maps +Y to v=1; DataTexture uploads without a Y flip.
      const v=Math.asin(direction.y)/Math.PI+.5
      const row=Math.round(v*(height-1))
      const offset=(row*width+Math.floor(width*.5))*4
      return [...data.slice(offset,offset+3)]
    }
    const sky=sampleDirection(new THREE.Vector3(0,1,0))
    const earth=sampleDirection(new THREE.Vector3(0,-1,0))
    const horizon=sampleDirection(new THREE.Vector3(1,0,0))
    expect(texture.flipY).toBe(false)
    expect(texture.mapping).toBe(THREE.EquirectangularReflectionMapping)
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(sky[2]-sky[0]).toBeGreaterThan(40)
    expect(earth[2]).toBeLessThan(earth[0])
    expect(sky.reduce((sum,value)=>sum+value,0))
      .toBeGreaterThan(earth.reduce((sum,value)=>sum+value,0)*1.7)
    expect(horizon[0]).toBeGreaterThan(sky[0])
    texture.dispose()
  })
})
