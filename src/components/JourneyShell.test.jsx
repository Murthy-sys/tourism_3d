import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyShell from './JourneyShell'

const renderProgress=vi.hoisted(()=>vi.fn())
const renderChapter=vi.hoisted(()=>vi.fn())
const renderBooking=vi.hoisted(()=>vi.fn())
vi.mock('./Hero3D',()=>({default:({progress})=>{
  renderProgress(progress)
  return <canvas className="journey__canvas"/>
}}))
vi.mock('./ChapterContent',()=>({default:props=>{
  renderChapter(props)
  return <button
    type="button"
    onClick={()=>props.onPlan({
      id:'kurinjal-trek',
      name:'Kurinjal Trek',
      priceLabel:'₹3,399',
      duration:'1 Night · 1 Day',
    })}
  >Book Kurinjal Trek</button>
}}))
vi.mock('./BookingOverlay',()=>({default:props=>{
  renderBooking(props)
  return props.open?<div role="dialog" aria-label="Package booking">
    <button type="button" onClick={props.onClose}>Close booking</button>
  </div>:null
}}))

describe('JourneyShell',()=>{
  beforeEach(()=>{
    renderProgress.mockClear()
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
    expect(traversed.at(-1)).toBeCloseTo(.97,6)
    expect(traversed.some(value=>value>.28&&value<.42)).toBe(true)
    expect(traversed.some(value=>value>.60&&value<.74)).toBe(true)
    expect(traversed.every((value,index)=>index===0||value>=traversed[index-1])).toBe(true)
  })

  it('passes reduced-motion state to chapter overlays',()=>{
    vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})))
    render(<JourneyShell/>)
    expect(renderChapter.mock.calls.at(-1)[0].reducedMotion).toBe(true)
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

  it('routes Plan a Trip to Contact without opening an empty booking overlay',()=>{
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
    expect(traversed.at(-1)).toBeCloseTo(.97,6)
    expect(renderBooking.mock.calls.at(-1)[0]).toEqual(
      expect.objectContaining({
        open:false,
        selectedPackage:null,
      }),
    )
    expect(screen.queryByRole('dialog',{name:'Package booking'})).not.toBeInTheDocument()
  })
})
