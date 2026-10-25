import { act,render,waitFor } from '@testing-library/react'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import Hero3D from './Hero3D'
import { createIndiaJourney } from '../three/indiaJourney'
import { preloadRealisticTravellers,releaseRealisticTravellers } from '../three/realisticTravellers'
import { preloadNatureAssets } from '../three/natureAssets'
import { preloadRealisticVehicles } from '../three/realisticVehicles'
import { preloadRealisticWildlife,releaseRealisticWildlife } from '../three/realisticWildlife'
import { preloadJourneyFonts,releaseJourneyFonts } from '../journey/journeyFonts'

vi.mock('../three/indiaJourney',()=>({createIndiaJourney:vi.fn()}))
vi.mock('../three/realisticTravellers',()=>({preloadRealisticTravellers:vi.fn(),releaseRealisticTravellers:vi.fn()}))
vi.mock('../three/natureAssets',()=>({preloadNatureAssets:vi.fn().mockResolvedValue(),releaseNatureAssets:vi.fn()}))
vi.mock('../three/realisticVehicles',()=>({preloadRealisticVehicles:vi.fn().mockResolvedValue(),releaseRealisticVehicles:vi.fn()}))
vi.mock('../three/realisticWildlife',()=>({preloadRealisticWildlife:vi.fn().mockResolvedValue(),releaseRealisticWildlife:vi.fn()}))
vi.mock('../journey/journeyFonts',()=>({preloadJourneyFonts:vi.fn().mockResolvedValue(),releaseJourneyFonts:vi.fn()}))

describe('Hero3D visual QA interface',()=>{
  let api

  beforeEach(()=>{
    vi.clearAllMocks()
    api={
      setPointer:vi.fn(),
      setProgress:vi.fn(),
      setReducedMotion:vi.fn(),
      setIntroPhase:vi.fn(),
      getQASnapshot:vi.fn(extras=>({phase:'mountain-trek',...extras})),
      resetQAMetrics:vi.fn(),
      dispose:vi.fn(),
      pause:vi.fn(),
      resume:vi.fn(),
    }
    createIndiaJourney.mockReturnValue(api)
    preloadRealisticTravellers.mockResolvedValue(undefined)
    window.__journeyConsoleFailures=['warning: rendered warning']
  })

  afterEach(()=>{
    delete window.__journeyConsoleFailures
    delete window.__journeyQA
    delete window.__resetJourneyQA
    vi.clearAllMocks()
  })

  it('exposes a complete browser snapshot and camera reset hook',async()=>{
    render(<Hero3D progress={.26} reducedMotion={false} onFallback={vi.fn()}/>)

    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    expect(window.__journeyQA()).toMatchObject({
      phase:'mountain-trek',
      consoleFailures:['warning: rendered warning'],
      audioControls:0,
    })
    window.__resetJourneyQA()
    expect(api.resetQAMetrics).toHaveBeenCalledOnce()
  })

  it('removes its browser QA hooks when the journey unmounts',async()=>{
    const view=render(<Hero3D progress={0} reducedMotion={false} onFallback={vi.fn()}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    view.unmount()
    expect(window.__journeyQA).toBeUndefined()
    expect(window.__resetJourneyQA).toBeUndefined()
  })

  it('forwards first-frame readiness to the journey renderer',async()=>{
    const onReady=vi.fn()
    render(
      <Hero3D
        progress={0}
        reducedMotion={false}
        onFallback={vi.fn()}
        onReady={onReady}
      />,
    )
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    const options=createIndiaJourney.mock.calls[0][1]
    options.onReady()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('reports readiness when WebGL initialization falls back',async()=>{
    createIndiaJourney.mockImplementationOnce(()=>{throw new Error('WebGL')})
    const onFallback=vi.fn()
    const onReady=vi.fn()
    render(
      <Hero3D
        progress={0}
        reducedMotion={false}
        onFallback={onFallback}
        onReady={onReady}
      />,
    )
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    expect(onFallback).toHaveBeenCalledOnce()
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('forwards intro phases without recreating the renderer',async()=>{
    const onIntroComplete=vi.fn()
    const view=render(<Hero3D progress={0} introPhase="waiting" onIntroComplete={onIntroComplete}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    expect(createIndiaJourney.mock.calls[0][1].intro).toBe(true)
    expect(api.setIntroPhase).toHaveBeenLastCalledWith('waiting')
    view.rerender(<Hero3D progress={0} introPhase="playing" onIntroComplete={onIntroComplete}/>)
    expect(api.setIntroPhase).toHaveBeenLastCalledWith('playing')
    createIndiaJourney.mock.calls[0][1].onIntroComplete()
    expect(onIntroComplete).toHaveBeenCalledOnce()
    view.rerender(<Hero3D progress={0} introPhase="complete" onIntroComplete={onIntroComplete}/>)
    expect(api.setIntroPhase).toHaveBeenLastCalledWith('complete')
    expect(createIndiaJourney).toHaveBeenCalledOnce()
  })

  it('completes a fallback introduction only when the user starts it',async()=>{
    createIndiaJourney.mockImplementationOnce(()=>{throw new Error('WebGL')})
    const onIntroComplete=vi.fn()
    const view=render(<Hero3D progress={0} introPhase="waiting" onIntroComplete={onIntroComplete}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    expect(onIntroComplete).not.toHaveBeenCalled()
    view.rerender(<Hero3D progress={0} introPhase="playing" onIntroComplete={onIntroComplete}/>)
    expect(onIntroComplete).toHaveBeenCalledOnce()
  })

  it.each(['onFinaleProgress','onProgress'])('forwards %s to the latest callback without changing the scene target',async callback=>{
    const original=vi.fn()
    const latest=vi.fn()
    const view=render(<Hero3D progress={.995} {...{[callback]:original}}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    const notify=createIndiaJourney.mock.calls[0][1][callback]
    notify(.94)
    expect(original).toHaveBeenCalledWith(.94)
    view.rerender(<Hero3D progress={.995} {...{[callback]:latest}}/>)
    notify(.975)
    expect(latest).toHaveBeenCalledWith(.975)
    expect(original).toHaveBeenCalledOnce()
    expect(createIndiaJourney).toHaveBeenCalledOnce()
    expect(api.setProgress).toHaveBeenCalledTimes(1)
    expect(api.setProgress).toHaveBeenLastCalledWith(.995)
  })
  it('waits for model readiness and uses the latest progress when loading finishes',async()=>{
    let resolve
    preloadRealisticTravellers.mockReturnValueOnce(new Promise(done=>{resolve=done}))
    const view=render(<Hero3D progress={0} introPhase="waiting"/>)
    expect(createIndiaJourney).not.toHaveBeenCalled()
    await waitFor(()=>expect(preloadRealisticTravellers).toHaveBeenCalledOnce())
    view.rerender(<Hero3D progress={.4} introPhase="playing" reducedMotion/> )
    await act(async()=>resolve())
    expect(createIndiaJourney).toHaveBeenCalledOnce()
    expect(api.setProgress).toHaveBeenLastCalledWith(.4)
    expect(api.setIntroPhase).toHaveBeenLastCalledWith('playing')
    expect(createIndiaJourney.mock.calls[0][1].reducedMotion).toBe(true)
  })

  it('preloads compact assets before creating the scene and never replaces them during scrolling',async()=>{
    const view=render(<Hero3D progress={0}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalledOnce())
    expect(preloadRealisticTravellers).toHaveBeenCalledWith('/models/traveller-compact.glb',{timeout:120000,strict:true})
    expect(preloadRealisticVehicles).toHaveBeenCalledWith('mobile',{timeout:120000,strict:true})
    expect(preloadNatureAssets).toHaveBeenCalledWith({timeout:120000,strict:true,compact:true,sky:true})
    expect(preloadRealisticWildlife).toHaveBeenCalledWith({timeout:120000,strict:true})
    expect(preloadJourneyFonts).toHaveBeenCalledWith({timeout:120000,strict:true})
    view.rerender(<Hero3D progress={.6}/>)
    view.rerender(<Hero3D progress={.2}/>)
    expect(preloadRealisticTravellers).toHaveBeenCalledOnce()
    expect(preloadNatureAssets).toHaveBeenCalledOnce()
    expect(preloadRealisticVehicles).toHaveBeenCalledOnce()
    expect(preloadRealisticWildlife).toHaveBeenCalledOnce()
    expect(createIndiaJourney).toHaveBeenCalledOnce()
  })

  it('releases a pending model lease without creating a renderer after unmount',async()=>{
    let resolve
    preloadRealisticTravellers.mockReturnValueOnce(new Promise(done=>{resolve=done}))
    const view=render(<Hero3D progress={0}/>)
    await waitFor(()=>expect(preloadRealisticTravellers).toHaveBeenCalledOnce())
    view.unmount()
    await act(async()=>resolve())
    expect(createIndiaJourney).not.toHaveBeenCalled()
    expect(releaseRealisticTravellers).toHaveBeenCalledOnce()
    expect(releaseRealisticWildlife).toHaveBeenCalledOnce()
  })

  it('loads wildlife concurrently and fixes its availability before constructing the scene',async()=>{
    let complete
    preloadRealisticWildlife.mockReturnValueOnce(new Promise(resolve=>{complete=resolve}))
    const view=render(<Hero3D progress={0}/>)
    await waitFor(()=>expect(preloadRealisticWildlife).toHaveBeenCalledOnce())
    expect(preloadRealisticTravellers).toHaveBeenCalledOnce()
    expect(preloadRealisticVehicles).toHaveBeenCalledOnce()
    expect(preloadNatureAssets).toHaveBeenCalledOnce()
    expect(createIndiaJourney).not.toHaveBeenCalled()
    await act(async()=>complete())
    expect(createIndiaJourney).toHaveBeenCalledOnce()
    view.rerender(<Hero3D progress={.75}/>)
    expect(preloadRealisticWildlife).toHaveBeenCalledOnce()
    view.unmount()
    expect(releaseRealisticWildlife).toHaveBeenCalledOnce()
  })

  it('keeps Start locked when a wildlife asset fails instead of omitting it',async()=>{
    preloadRealisticWildlife.mockRejectedValueOnce(new Error('Wildlife unavailable'))
    const onLoadingState=vi.fn(),onReady=vi.fn()
    render(<Hero3D progress={0} onLoadingState={onLoadingState} onReady={onReady}/>)
    await waitFor(()=>expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'})))
    expect(createIndiaJourney).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
    expect(releaseRealisticWildlife).toHaveBeenCalledOnce()
  })

  it('completes the intro before restoring a scroll target after delayed loading',async()=>{
    let resolve
    preloadRealisticTravellers.mockReturnValueOnce(new Promise(done=>{resolve=done}))
    let phase='waiting',renderedTarget=0
    api.setIntroPhase.mockImplementation(value=>{phase=value})
    api.setProgress.mockImplementation(value=>{renderedTarget=phase==='complete'?value:0})
    render(<Hero3D progress={.65} introPhase="complete"/>)
    await waitFor(()=>expect(preloadRealisticTravellers).toHaveBeenCalledOnce())
    await act(async()=>resolve())
    expect(renderedTarget).toBe(.65)
  })

  it('retries missing assets only on a new loading attempt and prepares the complete scene',async()=>{
    preloadRealisticTravellers.mockRejectedValueOnce(new Error('Asset unavailable'))
    const onReady=vi.fn(),onLoadingState=vi.fn()
    const view=render(<Hero3D progress={0} onReady={onReady} onLoadingState={onLoadingState}/>)
    await waitFor(()=>expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'})))
    expect(createIndiaJourney).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
    view.rerender(<Hero3D progress={0} onReady={onReady} onLoadingState={onLoadingState} loadAttempt={1}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalledOnce())
    expect(onLoadingState).toHaveBeenCalledWith({phase:'assets',completed:5,total:5,message:'Loading journey assets'})
    expect(onLoadingState).toHaveBeenLastCalledWith({phase:'preparing',completed:0,total:1,message:'Preparing scenes for smooth travel'})
    expect(onReady).not.toHaveBeenCalled()
    createIndiaJourney.mock.calls[0][1].onPrepareProgress(.6)
    expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'preparing',completed:.6}))
    createIndiaJourney.mock.calls[0][1].onReady()
    expect(onReady).toHaveBeenCalledOnce()
    expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'ready'}))
    expect(preloadRealisticTravellers).toHaveBeenCalledTimes(2)
    expect(releaseRealisticTravellers).toHaveBeenCalledOnce()
  })
  it('does not announce readiness after GPU preparation fails or the attempt is abandoned',async()=>{
    const onReady=vi.fn(),onLoadingState=vi.fn()
    const view=render(<Hero3D progress={0} onReady={onReady} onLoadingState={onLoadingState}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalledOnce())
    const options=createIndiaJourney.mock.calls[0][1]
    options.onPrepareError(new Error('Shader compile failed'))
    expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'error'}))
    expect(api.dispose).toHaveBeenCalledOnce()
    options.onReady()
    expect(onReady).not.toHaveBeenCalled()
    const reports=onLoadingState.mock.calls.length
    view.unmount()
    options.onPrepareProgress(1)
    options.onReady()
    expect(onLoadingState).toHaveBeenCalledTimes(reports)
    expect(onReady).not.toHaveBeenCalled()
  })
  it('keeps the gate loading while local fonts are still decoding',async()=>{
    let finish
    preloadJourneyFonts.mockReturnValueOnce(new Promise(resolve=>{finish=resolve}))
    const onReady=vi.fn(),onLoadingState=vi.fn()
    const view=render(<Hero3D progress={0} onReady={onReady} onLoadingState={onLoadingState}/>)
    await waitFor(()=>expect(onLoadingState).toHaveBeenLastCalledWith(expect.objectContaining({phase:'assets',completed:4,total:5})))
    expect(createIndiaJourney).not.toHaveBeenCalled()
    expect(onReady).not.toHaveBeenCalled()
    await act(async()=>finish())
    expect(createIndiaJourney).toHaveBeenCalledOnce()
    view.unmount()
    expect(releaseJourneyFonts).toHaveBeenCalledOnce()
  })
  it('pauses hidden scenes and removes its visibility listener on unmount',async()=>{
    const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(false)
    const view=render(<Hero3D progress={0}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalledOnce())
    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.pause).toHaveBeenCalledOnce()
    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.resume).toHaveBeenCalledTimes(2)
    view.unmount()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(api.resume).toHaveBeenCalledTimes(2)
    hidden.mockRestore()
  })

})
