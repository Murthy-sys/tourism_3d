import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChapterContent from './ChapterContent'
import {
  BRAND_CAPABILITIES,
  BOAT_OFFER_END,
  BOAT_OFFER_START,
  CHAPTERS,
  getChapterAtProgress,
} from '../journey/chapters'

describe('cinematic chapter content',()=>{
  it('does not render company copy during the opening drive',()=>{
    const {container}=render(<ChapterContent chapter={CHAPTERS[0]} progress={.08}/>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders only the approved Who We Are promotion services in order',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.19}/>)
    const proof=screen.getByLabelText('What we do')
    expect([...proof.children].map(item=>item.textContent)).toEqual([
      'Destination Promotions',
      'Tourism Campaigns',
      'Hotel & Resort Promotions',
      'Homestay Promotions',
      'Adventure Activity Promotions',
      'Travel Reels',
      'Professional Photography',
      'Cinematic Promotional Videos',
      'Tourism Brand Collaborations',
    ])
    expect(screen.queryByText('Campaign concepts')).not.toBeInTheDocument()
    expect(screen.queryByText('Audience-ready content')).not.toBeInTheDocument()
  })

  it('reveals the transparent creator card after the Who We Are beat',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.24}/>)
    expect(screen.getByText('About the creator')).toBeInTheDocument()
    expect(screen.getByText(/premium travel content across Karnataka/i))
      .toBeInTheDocument()
    expect(screen.getByLabelText('Creator coverage').children).toHaveLength(8)
    expect(screen.getByRole('article')).toHaveClass('chapter--creator-card')
    expect(screen.queryByLabelText('Brand collaboration value'))
      .not.toBeInTheDocument()
  })

  it('keeps the creator card through the end of Who We Are',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.26}/>)
    expect(screen.getByText('About the creator')).toBeInTheDocument()
    expect(screen.queryByText('Why Brands Should Work With Us'))
      .not.toBeInTheDocument()
  })

  it('shows one standard What We Offer card for the full boat interval',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='plans')
    const {rerender}=render(
      <ChapterContent chapter={chapter} progress={BOAT_OFFER_START-.000001}/>,
    )
    expect(screen.queryByText('What We Offer')).not.toBeInTheDocument()
    rerender(<ChapterContent chapter={chapter} progress={BOAT_OFFER_START}/>)
    expect(screen.getByText('What We Offer')).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveClass(
      'chapter--creator-card',
      'chapter--boat-offer',
    )
    expect([...screen.getByLabelText('What we offer').children]
      .map(item=>item.textContent)).toEqual(BRAND_CAPABILITIES)
    expect(screen.queryByText('Why Brands Should Work With Us'))
      .not.toBeInTheDocument()
    rerender(
      <ChapterContent chapter={chapter} progress={BOAT_OFFER_END-.000001}/>,
    )
    expect(screen.getByText('What We Offer')).toBeInTheDocument()
    rerender(<ChapterContent chapter={chapter} progress={BOAT_OFFER_END}/>)
    expect(screen.queryByText('What We Offer')).not.toBeInTheDocument()
  })

  it('removes the Expedition Chapters UI while preserving the 3D interval',()=>{
    const plans=CHAPTERS.find(({id})=>id==='plans')
    const {container}=render(
      <ChapterContent chapter={plans} progress={.8} onPlan={vi.fn()}/>,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText(/Three expedition chapters/i))
      .not.toBeInTheDocument()
  })

  it('replaces only the tail of Plans with social performance',()=>{
    const plans=CHAPTERS.find(({id})=>id==='plans')
    const {container,rerender}=render(
      <ChapterContent
        chapter={plans}
        progress={.879999}
        onPlan={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByLabelText('Social media performance'))
      .not.toBeInTheDocument()
    rerender(
      <ChapterContent
        chapter={plans}
        progress={.88}
        reducedMotion
        onPlan={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Social media performance'))
      .toBeInTheDocument()
    expect(screen.queryByText('Three expedition chapters.'))
      .not.toBeInTheDocument()
  })

  it('renders all five packages under Contact and selects the exact package',()=>{
    const onPlan=vi.fn()
    render(
      <ChapterContent
        chapter={CHAPTERS.find(({id})=>id==='contact')}
        progress={.97}
        onPlan={onPlan}
      />,
    )
    expect(screen.getByText('Where should we take you next?'))
      .toBeInTheDocument()
    expect(screen.getAllByRole('button',{name:/Select .* package/i}))
      .toHaveLength(5)
    fireEvent.click(
      screen.getByRole('button',{name:'Select Netravati Peak Trek package'}),
    )
    expect(onPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        id:'netravati-peak-trek',
        name:'Netravati Peak Trek',
        priceLabel:'₹3,499',
      }),
    )
  })

  it('keeps social performance below Contact at the existing final boundary',()=>{
    expect(getChapterAtProgress(.939999).id).toBe('plans')
    expect(getChapterAtProgress(.94).id).toBe('contact')
    const {rerender}=render(
      <ChapterContent
        chapter={getChapterAtProgress(.939999)}
        progress={.939999}
        reducedMotion
      />,
    )
    expect(screen.getByLabelText('Social media performance')).toBeInTheDocument()
    rerender(<ChapterContent chapter={getChapterAtProgress(.94)} progress={.94}/>)
    expect(screen.getByText('Where should we take you next?')).toBeInTheDocument()
    expect(screen.queryByLabelText('Social media performance'))
      .not.toBeInTheDocument()
  })
})
