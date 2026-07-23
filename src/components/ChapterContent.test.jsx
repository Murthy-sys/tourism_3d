import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ChapterContent from './ChapterContent'
import { CHAPTERS } from '../journey/chapters'

describe('cinematic chapter content',()=>{
  it('does not render company copy during the opening drive',()=>{
    const {container}=render(<ChapterContent chapter={CHAPTERS[0]} progress={.08}/>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders realistic nationwide tourism operations',()=>{
    const chapter=CHAPTERS.find(({id})=>id==='who-we-are')
    render(<ChapterContent chapter={chapter} progress={.25}/>)
    expect(screen.getByText('Destination specialists')).toBeInTheDocument()
    expect(screen.getByText('24/7 journey support')).toBeInTheDocument()
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
})
