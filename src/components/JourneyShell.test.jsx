import {fireEvent,render,screen} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import JourneyShell from './JourneyShell'
const heroProgresses=vi.hoisted(()=>[])
vi.mock('./Hero3D',()=>({default:({progress})=>{heroProgresses.push(progress);return <canvas data-testid="hero-3d" data-progress={progress} className="journey__canvas"/>}}))

describe('JourneyShell',()=>{
  it('renders one immersive journey without conventional sections',()=>{
    const {container}=render(<JourneyShell/>)
    expect(screen.getByRole('button',{name:'Open journey menu'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Toggle ambient sound'})).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(container.querySelector('#services')).not.toBeInTheDocument()
    expect(container.querySelector('footer')).not.toBeInTheDocument()
  })
  it('requests menu scrolling without snapping scene progress immediately',()=>{
    heroProgresses.length=0
    const scrollTo=vi.fn()
    vi.stubGlobal('scrollTo',scrollTo)
    render(<JourneyShell/>)
    expect(screen.getByTestId('hero-3d')).toHaveAttribute('data-progress','0')
    fireEvent.click(screen.getByRole('button',{name:'Open journey menu'}))
    fireEvent.click(screen.getByRole('button',{name:'Contact'}))
    expect(scrollTo).toHaveBeenCalled()
    expect(screen.getByTestId('hero-3d')).toHaveAttribute('data-progress','0')
    expect(heroProgresses.every(progress=>progress===0)).toBe(true)
    vi.unstubAllGlobals()
  })
})
