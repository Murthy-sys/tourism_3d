import { describe, expect, it } from 'vitest'
import { CHAPTERS, OPENING_DRIVE_END, OPENING_TREK_END, TRAVEL_PLANS, getChapterAtProgress, getProgressForChapter } from './chapters'

describe('journey chapters', () => {
  it('contains the complete approved experience in order', () => {
    expect(CHAPTERS.map((chapter) => chapter.id)).toEqual(['home','who-we-are','plans','contact'])
    expect(TRAVEL_PLANS.map((plan) => plan.id)).toEqual(['mountain-trail','heritage-india','southern-discovery'])
    expect(TRAVEL_PLANS.map((plan) => plan.style)).toEqual(['Mountains on foot','Water by boat','Forest by jeep'])
  })
  it('maps progress and menu targets to stable chapters', () => {
    expect(getChapterAtProgress(0).id).toBe('home')
    expect(getChapterAtProgress(1).id).toBe('contact')
    expect(getProgressForChapter('plans')).toBeGreaterThan(0)
  })
  it('reserves the opening for the mountain party before company content', () => {
    expect(OPENING_TREK_END).toBeGreaterThanOrEqual(.12)
    expect(OPENING_DRIVE_END).toBe(OPENING_TREK_END)
    expect(getChapterAtProgress(.08).layout).toBe('drive')
    expect(getChapterAtProgress(OPENING_TREK_END + .01).id).toBe('who-we-are')
  })
  it('keeps all approved content ranges unchanged around the trailhead opening',()=>{
    expect(OPENING_TREK_END).toBe(.14)
    expect(CHAPTERS.map(({id,progressStart,progressEnd})=>[
      id,
      progressStart,
      progressEnd,
    ])).toEqual([
      ['home',0,.14],
      ['who-we-are',.14,.28],
      ['plans',.28,.94],
      ['contact',.94,1],
    ])
  })
  it('positions Sanchari Kannadiga as a nationwide brand-collaboration partner', () => {
    const about = CHAPTERS.find(({ id }) => id === 'who-we-are')
    expect(`${about.title} ${about.body}`).toMatch(/Sanchari Kannadiga/i)
    expect(about.body).toMatch(/tourism boards/i)
    expect(about.body).toMatch(/hotels|resorts/i)
    expect(about.body).toMatch(/travel companies|adventure brands/i)
    expect(about.body).toMatch(/government tourism departments/i)
    expect(about.body).toMatch(/brand collaborations/i)
    expect(about.body).not.toMatch(/partners with/i)
    expect(about.body).toMatch(/designed to build/i)
    expect(about.creator.body).toMatch(
      /premium travel content across Karnataka/i,
    )
    expect(about.creator.pillars).toEqual([
      'Hidden destinations',
      'Waterfalls',
      'Trekking',
      'Temples & heritage',
      'Road trips',
      'Nature',
      'Local culture & festivals',
      'Adventure experiences',
    ])
    expect(about.body).not.toMatch(/South Indian/i)
  })
  it('contains no customer-facing Himalaya, snow, or ice semantics',()=>{
    expect(JSON.stringify({chapters:CHAPTERS,plans:TRAVEL_PLANS})).not.toMatch(/himalaya|snow|ice/i)
  })
})
