import { describe, expect, it } from 'vitest'
import {
  BRAND_CAPABILITIES,
  CHAPTERS,
  OPENING_DRIVE_END,
  OPENING_TREK_END,
  SOCIAL_MEDIA_METRICS,
  SOCIAL_MEDIA_PROFILE,
  SOCIAL_PERFORMANCE_START,
  TRAVEL_PLANS,
  getChapterAtProgress,
  getProgressForChapter,
} from './chapters'
import * as chapterData from './chapters'

describe('journey chapters', () => {
  it('owns the approved social performance data without invented insights',()=>{
    expect(SOCIAL_PERFORMANCE_START).toBe(.88)
    expect(SOCIAL_MEDIA_PROFILE).toEqual({
      handle:'@sanchari.kannadiga',
      url:'https://www.instagram.com/sanchari.kannadiga/',
      sourceLabel:'Public estimates · July 2026',
      sourceUrl:'https://getreelax.com/instagram/sanchari.kannadiga/',
    })
    expect(SOCIAL_MEDIA_METRICS).toEqual([
      {
        id:'followers',
        label:'Followers',
        value:156200,
        kind:'compact',
        suffix:'+',
        display:'156K+',
      },
      {
        id:'total-reach',
        label:'Total Reach',
        value:null,
        kind:'pending',
        suffix:'',
        display:'Updating soon',
      },
      {
        id:'reel-views',
        label:'Reel Views',
        value:815700,
        kind:'compact',
        suffix:' avg.',
        display:'815K avg.',
      },
      {
        id:'engagement',
        label:'Engagement',
        value:46.7,
        kind:'percent',
        suffix:'%',
        display:'46.7%',
      },
      {
        id:'viral-reels',
        label:'Viral Reels',
        value:null,
        kind:'pending',
        suffix:'',
        display:'Updating soon',
      },
      {
        id:'audience-insights',
        label:'Audience Insights',
        value:null,
        kind:'pending',
        suffix:'',
        display:'Updating soon',
      },
    ])
  })
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
  it('lists the approved Who We Are promotion services in order',()=>{
    expect(BRAND_CAPABILITIES).toEqual([
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
  })
  it('lists the approved reasons for brands to work with the creator',()=>{
    expect(chapterData.BRAND_REASONS).toEqual([
      'High-quality cinematic storytelling',
      'Authentic travel experiences',
      'Strong audience engagement',
      'Karnataka-focused travel audience',
      'Professional content creation',
      'High-reach social media campaigns',
    ])
    const about=CHAPTERS.find(({id})=>id==='who-we-are')
    expect(about.brandValue?.offer?.items).toBe(BRAND_CAPABILITIES)
    expect(about.brandValue?.reasons?.items).toBe(
      chapterData.BRAND_REASONS,
    )
  })
  it('contains no customer-facing Himalaya, snow, or ice semantics',()=>{
    expect(JSON.stringify({chapters:CHAPTERS,plans:TRAVEL_PLANS})).not.toMatch(/himalaya|snow|ice/i)
  })
})
