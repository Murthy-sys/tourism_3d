import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import JourneyMenu from './JourneyMenu'

describe('JourneyMenu', () => {
  it('opens every chapter and selects one', () => {
    const onSelect = vi.fn()
    render(<JourneyMenu open onClose={()=>{}} onSelect={onSelect} onBook={()=>{}} />)
    expect(screen.getByRole('button',{name:'Who We Are'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'Contact'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Plans'}))
    expect(onSelect).toHaveBeenCalledWith('plans')
  })
})
