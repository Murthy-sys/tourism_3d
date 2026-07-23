import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import JourneyShell from './JourneyShell'

const renderProgress=vi.hoisted(()=>vi.fn())
vi.mock('./Hero3D',()=>({default:({progress})=>{
  renderProgress(progress)
  return <canvas className="journey__canvas"/>
}}))

describe('JourneyShell',()=>{
  beforeEach(()=>{renderProgress.mockClear()})

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
})
