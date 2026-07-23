import { render } from '@testing-library/react'
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import Hero3D from './Hero3D'
import { createIndiaJourney } from '../three/indiaJourney'

vi.mock('../three/indiaJourney',()=>({createIndiaJourney:vi.fn()}))

describe('Hero3D visual QA interface',()=>{
  let api

  beforeEach(()=>{
    api={
      setPointer:vi.fn(),
      setProgress:vi.fn(),
      setReducedMotion:vi.fn(),
      getQASnapshot:vi.fn(extras=>({phase:'mountain-trek',...extras})),
      resetQAMetrics:vi.fn(),
      dispose:vi.fn(),
    }
    createIndiaJourney.mockReturnValue(api)
    window.__journeyConsoleFailures=['warning: rendered warning']
  })

  afterEach(()=>{
    delete window.__journeyConsoleFailures
    delete window.__journeyQA
    delete window.__resetJourneyQA
    vi.clearAllMocks()
  })

  it('exposes a complete browser snapshot and camera reset hook',()=>{
    render(<Hero3D progress={.26} reducedMotion={false} onFallback={vi.fn()}/>)

    expect(window.__journeyQA()).toMatchObject({
      phase:'mountain-trek',
      consoleFailures:['warning: rendered warning'],
      audioControls:0,
    })
    window.__resetJourneyQA()
    expect(api.resetQAMetrics).toHaveBeenCalledOnce()
  })

  it('removes its browser QA hooks when the journey unmounts',()=>{
    const view=render(<Hero3D progress={0} reducedMotion={false} onFallback={vi.fn()}/>)
    view.unmount()
    expect(window.__journeyQA).toBeUndefined()
    expect(window.__resetJourneyQA).toBeUndefined()
  })
})
