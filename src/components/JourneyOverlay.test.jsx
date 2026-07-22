import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JourneyOverlay from './JourneyOverlay'
import { JOURNEY_STOPS } from '../three/journeyData'

describe('JourneyOverlay', () => {
  it('exposes the active destination and progress accessibly', () => {
    render(<JourneyOverlay stop={JOURNEY_STOPS[0]} index={0} count={9} />)
    expect(screen.getByRole('heading', { name: 'Kerala Backwaters' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Explore Kerala Backwaters/ })).toHaveAttribute('href','#destinations')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow','1')
  })
})
