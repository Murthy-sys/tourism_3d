import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import JourneyShell from './JourneyShell'
vi.mock('./Hero3D',()=>({default:()=> <canvas className="journey__canvas"/>}))

describe('JourneyShell',()=>{
  it('renders one immersive journey without conventional sections',()=>{
    const {container}=render(<JourneyShell/>)
    expect(screen.getByRole('button',{name:'Open journey menu'})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Toggle ambient sound'})).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(container.querySelector('#services')).not.toBeInTheDocument()
    expect(container.querySelector('footer')).not.toBeInTheDocument()
  })
})
