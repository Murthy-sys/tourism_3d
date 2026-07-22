import { describe, expect, it } from 'vitest'
import { CHAPTERS, OPENING_DRIVE_END, TRAVEL_PLANS, getChapterAtProgress, getProgressForChapter } from './chapters'

describe('journey chapters', () => {
  it('contains the complete approved experience in order', () => {
    expect(CHAPTERS.map((chapter) => chapter.id)).toEqual(['home','who-we-are','plans','contact'])
    expect(TRAVEL_PLANS.map((plan) => plan.id)).toEqual(['southern-discovery','heritage-india','himalayan-adventure'])
  })
  it('maps progress and menu targets to stable chapters', () => {
    expect(getChapterAtProgress(0).id).toBe('home')
    expect(getChapterAtProgress(1).id).toBe('contact')
    expect(getProgressForChapter('plans')).toBeGreaterThan(0)
  })
  it('reserves the opening for the Ambassador before company content', () => {
    expect(OPENING_DRIVE_END).toBeGreaterThanOrEqual(.16)
    expect(getChapterAtProgress(.08).layout).toBe('drive')
    expect(getChapterAtProgress(OPENING_DRIVE_END + .01).id).toBe('who-we-are')
  })
  it('uses the approved nationwide tourism-management message', () => {
    const about = CHAPTERS.find(({ id }) => id === 'who-we-are')
    expect(about.body).toMatch(/design, coordinate and manage journeys across India/i)
    expect(about.body).not.toMatch(/South Indian/i)
  })
})
