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

  it('requires a non-whitespace contact name and both travel dates',()=>{
    const openWhatsApp=vi.fn()
    render(
      <BookingOverlay
        open
        selectedPackage={selectedPackage}
        onClose={vi.fn()}
        openWhatsApp={openWhatsApp}
      />,
    )
    fireEvent.change(screen.getByLabelText('Contact Person Name'),{
      target:{value:'   '},
    })
    fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter the contact person name and select both travel dates.',
    )
    expect(openWhatsApp).not.toHaveBeenCalled()
  })

  it('wraps Tab focus within the dialog',()=>{
    render(
      <BookingOverlay
        open
        selectedPackage={selectedPackage}
        onClose={vi.fn()}
      />,
    )
    const dialog=screen.getByRole('dialog')
    const first=screen.getByRole('button',{name:'Close booking'})
    const final=screen.getByRole('button',{name:'Continue on WhatsApp'})

    final.focus()
    fireEvent.keyDown(dialog,{key:'Tab'})
    expect(first).toHaveFocus()

    first.focus()
    fireEvent.keyDown(dialog,{key:'Tab',shiftKey:true})
    expect(final).toHaveFocus()
  })

  it('makes sibling journey UI inert and restores it with body scrolling',()=>{
    document.body.style.overflow='scroll'
    const {rerender}=render(
      <main>
        <section data-testid="journey-ui"/>
        <BookingOverlay
          open
          selectedPackage={selectedPackage}
          onClose={vi.fn()}
        />
      </main>,
    )
    const journeyUi=screen.getByTestId('journey-ui')
    expect(journeyUi.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <main>
        <section data-testid="journey-ui"/>
        <BookingOverlay
          open={false}
          selectedPackage={selectedPackage}
          onClose={vi.fn()}
        />
      </main>,
    )
    expect(journeyUi.inert).toBe(false)
    expect(document.body.style.overflow).toBe('scroll')
    document.body.style.overflow=''
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
