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
  it('keeps the city-to-mountain story aligned when scrolling in both directions',()=>{
    const {rerender}=render(<ChapterContent chapter={CHAPTERS[0]} progress={0}/>)
    expect(screen.getByRole('heading',{name:'Step away from the everyday.'})).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('Refresh your body. Clear your mind.')
    for(const [progress,stage,title] of [
      [.03,'boarding','A seat for a fresh start.'],
      [.08,'road','Let the city fall behind.'],
      [.12,'arrival','Breathe deeper. You’re here.'],
      [.02,'city','Step away from the everyday.'],
    ]){
      rerender(<ChapterContent chapter={CHAPTERS[0]} progress={progress}/>)
      expect(screen.getByRole('article')).toHaveAttribute('data-opening-stage',stage)
      expect(screen.getByRole('heading',{name:title})).toBeInTheDocument()
    }
    expect(screen.getByRole('article')).not.toHaveClass('chapter--glass-card')
    expect(screen.queryByText('Who we are')).not.toBeInTheDocument()
  })

  it('renders the Who We Are heading and approved paragraph without services',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.19}/>)
    expect(screen.getByRole('article')).toHaveClass(
      'chapter--glass-card',
      'chapter--mobile-safe-top',
    )
    expect(screen.getByRole('article')).toHaveTextContent(chapter.body)
    expect(screen.getByText(chapter.kicker)).toBeInTheDocument()
    expect(screen.getByRole('heading',{name:chapter.title}))
      .toBeInTheDocument()
    expect(screen.queryByLabelText('What we do')).not.toBeInTheDocument()
  })

  it('keeps only the approved paragraph through the Who We Are interval',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.24}/>)
    expect(screen.getByRole('article')).toHaveTextContent(chapter.body)
    expect(screen.queryByText('About the creator')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Creator coverage')).not.toBeInTheDocument()
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
      'chapter--mobile-safe-bottom',
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
      <ChapterContent chapter={plans} progress={.78} onPlan={vi.fn()}/>,
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
        progress={.799999}
        onPlan={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByLabelText('Social media performance'))
      .not.toBeInTheDocument()
    rerender(
      <ChapterContent
        chapter={plans}
        progress={.80}
        reducedMotion
        onPlan={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Social media performance'))
      .toHaveClass('chapter--mobile-safe-bottom')
    expect(screen.queryByText('Three expedition chapters.'))
      .not.toBeInTheDocument()
  })

  it('renders all five packages under Packages and selects the exact package',()=>{
    const onPlan=vi.fn()
    render(
      <ChapterContent
        chapter={CHAPTERS.find(({id})=>id==='packages')}
        progress={.87}
        onPlan={onPlan}
      />,
    )
    expect(screen.getByText('Where should we take you next?'))
      .toBeInTheDocument()
    const contactCard=
      screen.getByRole('heading',{
        name:'Where should we take you next?',
      }).closest('article')
    expect(contactCard).not.toHaveClass('chapter--mobile-safe-top')
    expect(contactCard).not.toHaveClass('chapter--mobile-safe-bottom')
    expect(screen.getAllByRole('button',{name:/Select .* package/i}))
      .toHaveLength(5)
    expect(screen.getAllByText('/ day')).toHaveLength(5)
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

  it('places Packages after social performance and Contact last',()=>{
    expect(getChapterAtProgress(.839999).id).toBe('plans')
    expect(getChapterAtProgress(.84).id).toBe('packages')
    const {rerender}=render(
      <ChapterContent
        chapter={getChapterAtProgress(.839999)}
        progress={.839999}
        reducedMotion
      />,
    )
    expect(screen.getByLabelText('Social media performance')).toBeInTheDocument()
    rerender(<ChapterContent chapter={getChapterAtProgress(.84)} progress={.84}/>)
    expect(screen.getByText('Where should we take you next?')).toBeInTheDocument()
    expect(screen.queryByLabelText('Social media performance'))
      .not.toBeInTheDocument()
    rerender(
      <ChapterContent
        chapter={getChapterAtProgress(.995)}
        progress={.995}
      />,
    )
    expect(screen.getByRole('region',{
      name:'Contact XYZ Travellers',
    })).toBeInTheDocument()
    expect(screen.queryByText('Where should we take you next?'))
      .not.toBeInTheDocument()
  })
})
