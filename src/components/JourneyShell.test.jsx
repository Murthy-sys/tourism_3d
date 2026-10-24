import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyShell from './JourneyShell'
import { FINALE_QUOTE } from '../journey/chapters'

const renderProgress=vi.hoisted(()=>vi.fn())
const renderHero=vi.hoisted(()=>vi.fn())
const renderChapter=vi.hoisted(()=>vi.fn())
const renderBooking=vi.hoisted(()=>vi.fn())
vi.mock('./Hero3D',()=>({default:props=>{
  renderHero(props)
  const {progress,onReady,introPhase}=props
  renderProgress(progress)
  return <button type="button" onClick={onReady} data-intro-phase={introPhase}>Ready journey</button>
}}))
vi.mock('./ChapterContent',async()=>{
  const {default:ContactCard}=await import('./ContactCard')
  return {default:props=>{
  renderChapter(props)
  if(props.chapter.layout==='contact-card'){
    return <ContactCard progress={props.progress} reducedMotion={props.reducedMotion}/>
  }
  return <button
    type="button"
    onClick={()=>props.onPlan({
      id:'kurinjal-trek',
      name:'Kurinjal Trek',
      priceLabel:'₹3,399',
      duration:'1 Night · 1 Day',
    })}
  >Book Kurinjal Trek</button>
}}})
vi.mock('./BookingOverlay',()=>({default:props=>{
  renderBooking(props)
  return props.open?<div role="dialog" aria-label="Package booking">
    <button type="button" onClick={props.onClose}>Close booking</button>
  </div>:null
}}))

describe('JourneyShell',()=>{
  beforeEach(()=>{
    renderProgress.mockClear()
    renderHero.mockClear()
    renderChapter.mockClear()
    renderBooking.mockClear()
  })
  afterEach(()=>vi.unstubAllGlobals())

  it('renders one immersive journey without conventional sections',()=>{
    const {container}=render(<JourneyShell/>)
    expect(screen.getByRole('button',{name:'Open journey menu'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Toggle ambient sound'})).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(container.querySelector('#services')).not.toBeInTheDocument()
    expect(container.querySelector('footer')).not.toBeInTheDocument()
  })

  it('forwards the rendered-journey readiness signal',()=>{
    const onReady=vi.fn()
    render(<JourneyShell onReady={onReady}/>)
    fireEvent.click(screen.getByRole('button',{name:'Ready journey'}))
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('locks scroll and keeps content inert until the introduction completes',()=>{
    vi.stubGlobal('scrollTo',vi.fn())
    document.body.style.overflow='auto'
    const view=render(<JourneyShell introPhase="waiting"/>)
    expect(document.body.style.overflow).toBe('hidden')
    expect(scrollTo).toHaveBeenCalledWith({top:0,left:0,behavior:'instant'})
    expect(view.container.querySelector('main')).toHaveAttribute('inert')
    expect(screen.queryByRole('button',{name:'Open journey menu'})).not.toBeInTheDocument()
    expect(renderChapter).not.toHaveBeenCalled()

    view.rerender(<JourneyShell introPhase="playing"/>)
    expect(scrollTo).toHaveBeenCalledTimes(2)
    fireEvent.scroll(window)
    expect(renderProgress.mock.calls.at(-1)[0]).toBe(0)
    expect(document.body.style.overflow).toBe('hidden')

    view.rerender(<JourneyShell introPhase="complete"/>)
    expect(scrollTo).toHaveBeenCalledTimes(3)
    expect(document.body.style.overflow).toBe('auto')
    expect(view.container.querySelector('main')).not.toHaveAttribute('inert')
    expect(screen.getByRole('button',{name:'Open journey menu'})).toBeInTheDocument()
    expect(renderChapter).toHaveBeenCalled()
    expect(screen.getByRole('button',{name:'Open journey menu'})).toHaveFocus()
    view.unmount()
    document.body.style.overflow=''
  })

  it('tweens menu navigation through monotonic intermediate progress',()=>{
    const frames=[]
    vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{
      frames.push(callback)
      return frames.length
    }))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    vi.stubGlobal('scrollTo',vi.fn())
    render(<JourneyShell/>)
    fireEvent.click(screen.getByRole('button',{name:'Open journey menu'}))
    const callsBeforeSelection=renderProgress.mock.calls.length
    fireEvent.click(screen.getByRole('button',{name:'Contact'}))

    const immediate=renderProgress.mock.calls.slice(callsBeforeSelection).map(([value])=>value)
    expect(immediate.at(-1)).toBe(0)
    expect(frames).toHaveLength(1)

    ;[0,360,522,900].forEach(timestamp=>{
      const frame=frames.shift()
      act(()=>frame(timestamp))
    })
    const traversed=renderProgress.mock.calls.slice(callsBeforeSelection).map(([value])=>value)
    expect(traversed.at(-1)).toBeCloseTo(.995,6)
    expect(traversed.some(value=>value>.28&&value<.42)).toBe(true)
    expect(traversed.some(value=>value>.60&&value<.74)).toBe(true)
    expect(traversed.every((value,index)=>index===0||value>=traversed[index-1])).toBe(true)
  })

  it('passes reduced-motion state to chapter overlays',()=>{
    vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})))
    render(<JourneyShell/>)
    expect(renderChapter.mock.calls.at(-1)[0].reducedMotion).toBe(true)
  })

  it('updates the scene and content when the motion preference changes',()=>{
    let onChange
    const removeEventListener=vi.fn()
    vi.stubGlobal('matchMedia',vi.fn(()=>({
      matches:false,
      addEventListener:vi.fn((event,listener)=>{onChange=listener}),
      removeEventListener,
    })))
    const view=render(<JourneyShell/>)
    expect(renderChapter.mock.calls.at(-1)[0].reducedMotion).toBe(false)
    act(()=>onChange({matches:true}))
    expect(renderChapter.mock.calls.at(-1)[0].reducedMotion).toBe(true)
    view.unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change',onChange)
  })

  it('opens booking with the exact package selected from Contact',()=>{
    render(<JourneyShell/>)
    const selectedPackage={
      id:'kurinjal-trek',
      name:'Kurinjal Trek',
      priceLabel:'₹3,399',
      duration:'1 Night · 1 Day',
    }
    act(()=>renderChapter.mock.calls.at(-1)[0].onPlan(selectedPackage))
    expect(renderBooking.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        open:true,
        selectedPackage,
      }),
    )
  })

  it('returns focus to the package button after booking closes',()=>{
    render(<JourneyShell/>)
    const trigger=screen.getByRole('button',{name:'Book Kurinjal Trek'})
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog',{name:'Package booking'})).toBeInTheDocument()

    const close=screen.getByRole('button',{name:'Close booking'})
    close.focus()
    fireEvent.click(close)

    expect(screen.queryByRole('dialog',{name:'Package booking'})).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('waits for rendered arrival before revealing the finale and keeps reverse scrolling synchronized',()=>{
    const frames=[]
    vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{
      frames.push(callback)
      return frames.length
    }))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    const {container}=render(<JourneyShell/>)
    const track=container.querySelector('.experience__track')
    Object.defineProperty(track,'offsetHeight',{value:innerHeight+10000})
    let nativeProgress=.995
    track.getBoundingClientRect=()=>({top:-nativeProgress*10000})
    const scroll=()=>{
      fireEvent.scroll(window)
      act(()=>frames.shift()(0))
    }
    scroll()
    const onFinaleProgress=renderHero.mock.calls.at(-1)[0].onFinaleProgress
    expect(renderProgress.mock.calls.at(-1)[0]).toBe(.995)
    expect(screen.queryByRole('heading',{name:FINALE_QUOTE})).not.toBeInTheDocument()

    act(()=>onFinaleProgress(.94))
    expect(screen.queryByRole('heading',{name:FINALE_QUOTE})).not.toBeInTheDocument()
    act(()=>onFinaleProgress(.975))
    expect(screen.getByRole('heading',{name:FINALE_QUOTE})).toBeInTheDocument()
    expect(screen.queryByRole('region',{name:'Contact XYZ Travellers'})).not.toBeInTheDocument()
    act(()=>onFinaleProgress(.995))
    expect(screen.getByRole('region',{name:'Contact XYZ Travellers'})).toBeInTheDocument()
    expect(renderProgress.mock.calls.at(-1)[0]).toBe(.995)
    expect(renderHero.mock.calls.at(-1)[0].onFinaleProgress).toBe(onFinaleProgress)

    nativeProgress=.8
    scroll()
    expect(screen.getByRole('region',{name:'Contact XYZ Travellers'})).toBeInTheDocument()
    expect(renderProgress.mock.calls.at(-1)[0]).toBe(.8)
    act(()=>onFinaleProgress(.96))
    expect(screen.getByRole('heading',{name:FINALE_QUOTE})).toBeInTheDocument()
    expect(screen.queryByRole('region',{name:'Contact XYZ Travellers'})).not.toBeInTheDocument()
    act(()=>onFinaleProgress(0))
    expect(screen.queryByRole('heading',{name:FINALE_QUOTE})).not.toBeInTheDocument()
    expect(renderChapter.mock.calls.at(-1)[0].chapter.id).toBe('plans')
    expect(renderChapter.mock.calls.at(-1)[0].progress).toBe(.8)
    expect(renderProgress.mock.calls.at(-1)[0]).toBe(.8)
  })

  it('keeps the finale reachable from native scrolling when WebGL falls back',()=>{
    const frames=[]
    vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{
      frames.push(callback)
      return frames.length
    }))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    const {container}=render(<JourneyShell/>)
    const track=container.querySelector('.experience__track')
    Object.defineProperty(track,'offsetHeight',{value:innerHeight+10000})
    track.getBoundingClientRect=()=>({top:-9950})
    fireEvent.scroll(window)
    act(()=>frames.shift()(0))
    expect(screen.queryByRole('region',{name:'Contact XYZ Travellers'})).not.toBeInTheDocument()
    act(()=>renderHero.mock.calls.at(-1)[0].onFallback())
    expect(screen.getByRole('region',{name:'Contact XYZ Travellers'})).toBeInTheDocument()
    expect(renderChapter.mock.calls.at(-1)[0].progress).toBe(.995)
  })

  it('routes Plan a Trip to Packages without opening an empty booking overlay',()=>{
    const frames=[]
    vi.stubGlobal('requestAnimationFrame',vi.fn(callback=>{
      frames.push(callback)
      return frames.length
    }))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    vi.stubGlobal('scrollTo',vi.fn())
    render(<JourneyShell/>)
    fireEvent.click(screen.getByRole('button',{name:'Open journey menu'}))
    const callsBeforeSelection=renderProgress.mock.calls.length

    fireEvent.click(screen.getByRole('button',{name:'Plan a Trip'}))
    ;[0,360,522,900].forEach(timestamp=>{
      const frame=frames.shift()
      act(()=>frame(timestamp))
    })

    const traversed=renderProgress.mock.calls.slice(callsBeforeSelection)
      .map(([value])=>value)
    expect(traversed.at(-1)).toBeCloseTo(.87,6)
    expect(renderBooking.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        open:false,
        selectedPackage:null,
      }),
    )
    expect(screen.queryByRole('dialog',{name:'Package booking'})).not.toBeInTheDocument()
  })
})
