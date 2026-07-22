import {describe,expect,it} from 'vitest'
import {analyzeRgbaPixels,CANVAS_ISOLATION_STYLE,FRAME_CONTRACTS,validateCanvasEvidence,validateFrameContract} from './visual-qa-core.mjs'

const qaFor=(zoneWeights,transportWeights)=>({
  guides:transportWeights.trekker>.05?1:0,
  tourists:transportWeights.trekker>.05?3:0,
  iceObjects:0,
  walkersOnTrail:transportWeights.trekker>.05?4:0,
  zoneWeights,
  transportWeights,
  visibleMembers:{guides:transportWeights.trekker>.05?1:0,tourists:transportWeights.trekker>.05?3:0},
  transports:Object.entries(transportWeights).map(([name,weight])=>({name,visible:weight>.05})),
})

describe('visual QA contracts',()=>{
  it('pins the stable hill reveal after the water-to-hill blend completes',()=>{
    expect(FRAME_CONTRACTS['hill-reveal'].progress).toBe(.79)
  })
  it.each([
    ['water-corridor',qaFor({forest:0,water:1,hills:0},{ambassador:0,jeep:0,boat:1,trekker:0})],
    ['hill-reveal',qaFor({forest:0,water:0,hills:1},{ambassador:0,jeep:0,boat:0,trekker:1})],
    ['hill-contact',qaFor({forest:0,water:0,hills:1},{ambassador:0,jeep:0,boat:0,trekker:1})],
  ])('accepts the explicit %s zone and transport semantics',(name,qa)=>{
    expect(validateFrameContract(name,qa,'desktop')).toEqual([])
  })

  it.each(['water-corridor','hill-reveal','hill-contact'])('rejects wrong %s zone and transport semantics',name=>{
    const qa=qaFor({forest:1,water:0,hills:0},{ambassador:0,jeep:1,boat:0,trekker:0})
    const failures=validateFrameContract(name,qa,'desktop')
    expect(failures.some(failure=>failure.includes('zones'))).toBe(true)
    expect(failures.some(failure=>failure.includes('transports'))).toBe(true)
  })

  it('accepts an active renderable contact party without requiring its aggregate center onscreen',()=>{
    const qa=qaFor({forest:0,water:0,hills:1},{ambassador:0,jeep:0,boat:0,trekker:1})
    qa.transports.find(transport=>transport.name==='trekker').visible=false
    expect(validateFrameContract('hill-contact',qa,'desktop')).toEqual([])
  })
})

describe('canvas evidence',()=>{
  it('isolates the WebGL canvas from every stage and experience overlay',()=>{
    expect(CANVAS_ISOLATION_STYLE).toContain('.experience__stage > :not(.journey__canvas)')
    expect(CANVAS_ISOLATION_STYLE).toContain('.experience > :not(.experience__track)')
  })

  it('rejects hidden and blank canvas captures',()=>{
    const blank=analyzeRgbaPixels(new Uint8ClampedArray(16*16*4).fill(0),16,16)
    expect(validateCanvasEvidence({presentation:{visible:false,width:16,height:16},pixels:blank})).toEqual(expect.arrayContaining([
      expect.stringContaining('visible'),
      expect.stringContaining('blank'),
    ]))
  })

  it('accepts visible canvas pixels with a real luminance and color histogram',()=>{
    const rgba=new Uint8ClampedArray(16*16*4)
    for(let index=0;index<16*16;index++){
      rgba[index*4]=(index%16)*16
      rgba[index*4+1]=Math.floor(index/16)*16
      rgba[index*4+2]=(index*7)%256
      rgba[index*4+3]=255
    }
    const pixels=analyzeRgbaPixels(rgba,16,16)
    expect(validateCanvasEvidence({presentation:{visible:true,width:390,height:844},pixels})).toEqual([])
  })
})
