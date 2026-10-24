import { act,render,waitFor } from '@testing-library/react'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import Hero3D from './Hero3D'
import { createIndiaJourney } from '../three/indiaJourney'
import { preloadRealisticTravellers,releaseRealisticTravellers } from '../three/realisticTravellers'

vi.mock('../three/indiaJourney',()=>({createIndiaJourney:vi.fn()}))
vi.mock('../three/realisticTravellers',()=>({preloadRealisticTravellers:vi.fn(),releaseRealisticTravellers:vi.fn()}))
vi.mock('../three/natureAssets',()=>({preloadNatureAssets:vi.fn().mockResolvedValue(),releaseNatureAssets:vi.fn()}))
vi.mock('../three/realisticVehicles',()=>({preloadRealisticVehicles:vi.fn().mockResolvedValue(),releaseRealisticVehicles:vi.fn()}))

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

  it('forwards rendered finale progress to the latest callback without changing the scene target',async()=>{
    const original=vi.fn()
    const latest=vi.fn()
    const view=render(<Hero3D progress={.995} onFinaleProgress={original}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalled())
    const notify=createIndiaJourney.mock.calls[0][1].onFinaleProgress
    notify(.94)
    expect(original).toHaveBeenCalledWith(.94)
    view.rerender(<Hero3D progress={.995} onFinaleProgress={latest}/>)
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

  it('releases a pending model lease without creating a renderer after unmount',async()=>{
    let resolve
    preloadRealisticTravellers.mockReturnValueOnce(new Promise(done=>{resolve=done}))
    const view=render(<Hero3D progress={0}/>)
    await waitFor(()=>expect(preloadRealisticTravellers).toHaveBeenCalledOnce())
    view.unmount()
    await act(async()=>resolve())
    expect(createIndiaJourney).not.toHaveBeenCalled()
    expect(releaseRealisticTravellers).toHaveBeenCalledOnce()
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

  it('still initializes the fallback people when the detailed asset fails',async()=>{
    const warning=vi.spyOn(console,'warn').mockImplementation(()=>{})
    preloadRealisticTravellers.mockRejectedValueOnce(new Error('Asset unavailable'))
    const onReady=vi.fn()
    render(<Hero3D progress={0} onReady={onReady}/>)
    await waitFor(()=>expect(createIndiaJourney).toHaveBeenCalledOnce())
    createIndiaJourney.mock.calls[0][1].onReady()
    expect(onReady).toHaveBeenCalledOnce()
    expect(warning).toHaveBeenCalledWith('Detailed traveller model unavailable:',expect.any(Error))
    warning.mockRestore()
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
