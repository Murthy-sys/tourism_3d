import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BookingOverlay, { buildWhatsAppUrl } from './BookingOverlay'

const selectedPackage={
  id:'bandaje-waterfalls',
  name:'Bandaje Waterfalls',
  price:3299,
  priceLabel:'₹3,299',
  duration:'1 Night · 1 Day',
  transfer:'Bengaluru pickup & drop',
  inclusions:['Trek Guide'],
}

describe('BookingOverlay', () => {
  it('builds one exact-number WhatsApp URL with name, package, and dates',()=>{
    const url=buildWhatsAppUrl({
      contactName:'Ananya Rao',
      startDate:'2026-08-14',
      endDate:'2026-08-15',
      selectedPackage,
    })
    expect(url).toMatch(/^https:\/\/wa\.me\/917204033032\?text=/)
    const message=decodeURIComponent(url.split('?text=')[1])
    expect(message).toContain('Contact person: Ananya Rao')
    expect(message).toContain('Travel dates: 2026-08-14 to 2026-08-15')
    expect(message).toContain('Package: Bandaje Waterfalls — 1 Night · 1 Day — ₹3,299 per person')
    expect(url).not.toMatch(/7358369538|7404033032/)
  })

  it('validates the contact name and date range before opening WhatsApp',()=>{
    const openWhatsApp=vi.fn()
    render(
      <BookingOverlay
        open
        selectedPackage={selectedPackage}
        onClose={vi.fn()}
        openWhatsApp={openWhatsApp}
      />,
    )
    expect(screen.getByText('Bandaje Waterfalls')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Contact Person Name'),{
      target:{value:'Ananya Rao'},
    })
    fireEvent.change(screen.getByLabelText('Start Date'),{
      target:{value:'2026-08-16'},
    })
    fireEvent.change(screen.getByLabelText('End Date'),{
      target:{value:'2026-08-15'},
    })
    fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'End Date cannot be before Start Date.',
    )
    expect(openWhatsApp).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('End Date'),{
      target:{value:'2026-08-17'},
    })
    fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}))
    expect(openWhatsApp).toHaveBeenCalledTimes(1)
    expect(openWhatsApp.mock.calls[0][0]).toMatch(
      /^https:\/\/wa\.me\/917204033032\?text=/,
    )
  })

  it('renders a cinematic dialog and closes with Escape', () => {
    const onClose=vi.fn()
    render(
      <BookingOverlay
        open
        selectedPackage={selectedPackage}
        onClose={onClose}
      />,
    )
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal','true')
    fireEvent.keyDown(document,{key:'Escape'})
    expect(onClose).toHaveBeenCalled()
  })
})
