import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContactCard from './ContactCard'
import {
  FINALE_CONTACT_START,
  FINALE_QUOTE,
  FINALE_QUOTE_START,
  SOCIAL_MEDIA_PROFILE,
} from '../journey/chapters'
import { DEMO_CONTACT } from '../data'

describe('ContactCard',()=>{
  it('shows clearly marked dummy contacts without live phone or social destinations',()=>{
    render(<ContactCard/>)
    const card=screen.getByRole('region',{name:'Contact XYZ Travellers'})
    expect(card).toContainElement(screen.getByRole('heading',{name:'XYZ Travellers'}))
    expect(card).toContainElement(screen.getByText(DEMO_CONTACT.phone))
    expect(card).toContainElement(screen.getByText(DEMO_CONTACT.email))
    expect(card).toContainElement(screen.getByText(SOCIAL_MEDIA_PROFILE.handle))
    expect(screen.getByText('Demo contact details. Enquiries are not sent.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('leaves the walk clear, reveals the quote, then brings in contact details beneath it',()=>{
    const view=render(<ContactCard progress={.94}/>)
    expect(view.container).toBeEmptyDOMElement()

    view.rerender(<ContactCard progress={.965}/>)
    const quote=screen.getByRole('heading',{name:FINALE_QUOTE})
    expect(Number(quote.style.opacity)).toBeCloseTo(.5,5)
    expect(screen.queryByRole('region',{name:'Contact XYZ Travellers'})).not.toBeInTheDocument()
    expect(screen.getByRole('article')).not.toHaveClass('chapter--glass-card')

    view.rerender(<ContactCard progress={.9875}/>)
    expect(screen.getByRole('heading',{name:FINALE_QUOTE})).toHaveStyle({opacity:'1'})
    expect(Number(screen.getByRole('region',{name:'Contact XYZ Travellers'}).style.opacity)).toBeCloseTo(.5,5)

    view.rerender(<ContactCard progress={1}/>)
    expect(screen.getByRole('region',{name:'Contact XYZ Travellers'})).toHaveStyle({opacity:'1'})
    view.rerender(<ContactCard progress={.95}/>)
    expect(view.container).toBeEmptyDOMElement()
  })

  it('shows semantic stages immediately for reduced motion without exposing future contacts',()=>{
    const view=render(<ContactCard progress={FINALE_QUOTE_START-.001} reducedMotion/>)
    expect(view.container).toBeEmptyDOMElement()
    view.rerender(<ContactCard progress={FINALE_QUOTE_START} reducedMotion/>)
    expect(screen.getByRole('heading',{name:FINALE_QUOTE})).toHaveStyle({opacity:'1'})
    expect(screen.queryByRole('region',{name:'Contact XYZ Travellers'})).not.toBeInTheDocument()
    view.rerender(<ContactCard progress={FINALE_CONTACT_START} reducedMotion/>)
    expect(screen.getByRole('region',{name:'Contact XYZ Travellers'})).toHaveStyle({opacity:'1'})
  })
})
