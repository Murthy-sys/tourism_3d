import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BookingOverlay from './BookingOverlay'

describe('BookingOverlay', () => {
  it('renders a cinematic dialog and closes with Escape', () => {
    const onClose=vi.fn()
    render(<BookingOverlay open initialPlan="Heritage India" onClose={onClose}/>)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal','true')
    expect(screen.getByDisplayValue('Heritage India')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/hill country/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/himalaya|snow|ice/i)
    fireEvent.keyDown(document,{key:'Escape'})
    expect(onClose).toHaveBeenCalled()
  })
})
