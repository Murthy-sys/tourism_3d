import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'

describe('preloaded local journey fonts',()=>{
  let fonts,leases,add,faces,originalFonts
  const acquire=options=>{leases++;return fonts.preloadJourneyFonts(options)}
  beforeEach(async()=>{
    vi.resetModules()
    leases=0;faces=[];add=vi.fn()
    originalFonts=Object.getOwnPropertyDescriptor(document,'fonts')
    Object.defineProperty(document,'fonts',{configurable:true,value:{add}})
    vi.stubGlobal('FontFace',class{
      constructor(family,source,descriptors){this.family=family;this.source=source;this.descriptors=descriptors;faces.push(this)}
      load(){return Promise.resolve(this)}
    })
    vi.stubGlobal('fetch',vi.fn(async()=>new Response(new Uint8Array([1,2,3]))))
    fonts=await import('./journeyFonts')
  })
  afterEach(()=>{
    while(leases-->0) fonts.releaseJourneyFonts()
    if(originalFonts) Object.defineProperty(document,'fonts',originalFonts)
    else delete document.fonts
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  it('decodes both local font buffers before adding them and retains them across retries',async()=>{
    await acquire()
    expect(fetch.mock.calls.map(([url])=>url)).toEqual(['/fonts/bebas-neue-latin.woff2','/fonts/manrope-latin-variable.woff2'])
    expect(faces.map(face=>[face.family,face.descriptors.weight])).toEqual([['Bebas Neue','400'],['Manrope','300 800']])
    expect(faces.every(face=>new Uint8Array(face.source).length===3)).toBe(true)
    expect(add).toHaveBeenCalledTimes(2)
    fonts.releaseJourneyFonts();leases--
    await acquire()
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(add).toHaveBeenCalledTimes(2)
  })
  it('rejects failed font requests instead of allowing a late text swap',async()=>{
    fetch.mockResolvedValue(new Response(null,{status:404}))
    await expect(acquire()).rejects.toThrow('404')
    expect(add).not.toHaveBeenCalled()
    expect(faces).toHaveLength(0)
  })
  it('aborts pending font requests when their loading attempt is abandoned',async()=>{
    const signals=[]
    fetch.mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>{
      signals.push(signal)
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true})
    }))
    const outcome=expect(acquire()).rejects.toThrow('Scene released')
    fonts.releaseJourneyFonts();leases--
    await outcome
    expect(signals.every(signal=>signal.aborted)).toBe(true)
    expect(add).not.toHaveBeenCalled()
  })
})
