import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ContactCard, {
  CONTACT_MESSAGE,
  buildContactWhatsAppUrl,
} from './ContactCard'
import { SOCIAL_MEDIA_PROFILE } from '../journey/chapters'

describe('ContactCard',()=>{
  it('builds separate exact-number WhatsApp destinations',()=>{
    expect(buildContactWhatsAppUrl('7204033032')).toBe(
      `https://wa.me/917204033032?text=${encodeURIComponent(CONTACT_MESSAGE)}`,
    )
    expect(buildContactWhatsAppUrl('7358369538')).toBe(
      `https://wa.me/917358369538?text=${encodeURIComponent(CONTACT_MESSAGE)}`,
    )
  })

  it('keeps every contact action together in one card',()=>{
    render(<ContactCard/>)
    const card=screen.getByRole('article',{name:'Contact Sanchari Kannadiga'})
    expect(card).toContainElement(
      screen.getByRole('heading',{name:'Sanchari Kannadiga'}),
    )

    for(const number of ['7204033032','7358369538']){
      const link=screen.getByRole('link',{name:`WhatsApp ${number}`})
      expect(card).toContainElement(link)
      expect(link).toHaveAttribute('href',buildContactWhatsAppUrl(number))
      expect(link).toHaveAttribute('target','_blank')
      expect(link).toHaveAttribute('rel','noreferrer')
    }

    const instagram=screen.getByRole('link',{
      name:'Instagram @sanchari.kannadiga',
    })
    expect(card).toContainElement(instagram)
    expect(instagram).toHaveAttribute('href',SOCIAL_MEDIA_PROFILE.url)
    expect(instagram).toHaveAttribute('target','_blank')
    expect(instagram).toHaveAttribute('rel','noreferrer')
  })
})
