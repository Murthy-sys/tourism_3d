import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChapterContent from './ChapterContent'
import {
  BRAND_CAPABILITIES,
  CHAPTERS,
  getChapterAtProgress,
} from '../journey/chapters'
import * as chapterData from '../journey/chapters'

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

  it('reveals two prominent brand cards after the creator beat',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.26}/>)
    const group=screen.getByLabelText('Brand collaboration value')
    expect(group).toHaveClass('chapter--brand-value')
    expect([...screen.getByLabelText('What we offer').children]
      .map(item=>item.textContent)).toEqual(BRAND_CAPABILITIES)
    expect([
      ...screen.getByLabelText('Why brands should work with us').children,
    ].map(item=>item.textContent)).toEqual(chapterData.BRAND_REASONS)
    expect(screen.queryByText('About the creator')).not.toBeInTheDocument()
  })

  it('keeps the operations beat transitions at the approved boundaries',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    const {rerender}=render(
      <ChapterContent chapter={chapter} progress={.219999}/>,
    )
    expect(screen.getByLabelText('What we do')).toBeInTheDocument()
    rerender(<ChapterContent chapter={chapter} progress={.22}/>)
    expect(screen.getByText('About the creator')).toBeInTheDocument()
    rerender(<ChapterContent chapter={chapter} progress={.249999}/>)
    expect(screen.getByText('About the creator')).toBeInTheDocument()
    rerender(<ChapterContent chapter={chapter} progress={.25}/>)
    expect(screen.getByLabelText('Brand collaboration value'))
      .toBeInTheDocument()
  })

  it('renders three accessible monument plan actions',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='plans')
    render(<ChapterContent chapter={chapter} progress={.5} onPlan={vi.fn()}/>)
    expect(screen.getAllByRole('button',{name:/plan .* journey/i})).toHaveLength(3)
  })

  it('activates plan overlays at the expedition transport boundaries',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='plans')
    const {rerender}=render(<ChapterContent chapter={chapter} progress={.45} onPlan={vi.fn()}/>)
    expect(screen.getByRole('button',{name:'Plan Heritage India journey'})).toHaveClass('active')
    rerender(<ChapterContent chapter={chapter} progress={.75} onPlan={vi.fn()}/>)
    expect(screen.getByRole('button',{name:'Plan Southern Discovery journey'})).toHaveClass('active')
  })

  it('replaces only the tail of Plans with social performance',()=>{
    const plans=CHAPTERS.find(({id})=>id==='plans')
    const {rerender}=render(
      <ChapterContent
        chapter={plans}
        progress={.879999}
        onPlan={vi.fn()}
      />,
    )
    expect(screen.getByText('Three expedition chapters.')).toBeInTheDocument()
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
