import { describe, expect, it } from 'vitest'
import {
  BRAND_CAPABILITIES,
  BOAT_OFFER_END,
  BOAT_OFFER_START,
  CHAPTERS,
  OPENING_DRIVE_END,
  OPENING_TREK_END,
  SOCIAL_MEDIA_METRICS,
  SOCIAL_MEDIA_PROFILE,
  SOCIAL_PERFORMANCE_START,
  TREK_PACKAGES,
  getChapterAtProgress,
  getProgressForChapter,
} from './chapters'
import * as chapterData from './chapters'

describe('journey chapters', () => {
  it('owns the approved social performance data without invented insights',()=>{
    expect(SOCIAL_PERFORMANCE_START).toBe(.88)
    expect(SOCIAL_MEDIA_PROFILE).toEqual({
      handle:'@sanchari.kannadiga',
      url:'https://www.instagram.com/_sanchari_kannadiga_?igsh=bWM0NGNja3E3dzZx',
      sourceLabel:'Public estimates · July 2026',
      sourceUrl:'https://www.instagram.com/_sanchari_kannadiga_?igsh=bWM0NGNja3E3dzZx',
    })
    expect(SOCIAL_MEDIA_METRICS).toEqual([
      {
        id:'followers',
        label:'Followers',
        value:546,
        kind:'compact',
        suffix:'+',
        display:'546+',
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
        value:null,
        kind:'pending',
        suffix:'',
        display:'Updating soon',
      },
      {
        id:'engagement',
        label:'Engagement',
        value:null,
        kind:'percent',
        suffix:'%',
        display:'Updating soon',
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
  })
  it('owns the five deduplicated poster packages without poster dates',()=>{
    expect(TREK_PACKAGES.map(({id,name,price,priceLabel,duration})=>({
      id,name,price,priceLabel,duration,
    }))).toEqual([
      {id:'bandaje-waterfalls',name:'Bandaje Waterfalls',price:3299,priceLabel:'₹3,299',duration:'1 Night · 1 Day'},
      {id:'kurinjal-trek',name:'Kurinjal Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
      {id:'netravati-peak-trek',name:'Netravati Peak Trek',price:3499,priceLabel:'₹3,499',duration:'1 Night · 1 Day'},
      {id:'kuduremukha-trek',name:'Kuduremukha Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
      {id:'gangadikallu-trek',name:'Gangadikallu Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
    ])
    expect(new Set(TREK_PACKAGES.map(({id})=>id)).size).toBe(5)
    expect(JSON.stringify(TREK_PACKAGES)).not.toMatch(/31st|july|2026/i)
    expect(TREK_PACKAGES[0].inclusions).toEqual([
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Trek Entry',
      'Trek Guide',
      'Group Fun Activities',
    ])
    expect(TREK_PACKAGES[1].inclusions).toEqual([
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee, Tea or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Trek Entry',
      'Trek Guide',
      'Group Fun Activities',
    ])
    expect(TREK_PACKAGES[2].inclusions).toEqual(TREK_PACKAGES[1].inclusions)
    expect(
      TREK_PACKAGES.find(({id})=>id==='gangadikallu-trek').inclusions,
    ).toEqual([
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee, Tea or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Trek Entry',
      'Group Fun Activities',
    ])
    expect(
      TREK_PACKAGES.find(({id})=>id==='kuduremukha-trek').inclusions,
    ).toEqual([
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee, Tea or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Homestay for Fresh Up & Luggage',
      'Trek Entry',
      'Trek Guide',
      'Group Fun Activities',
    ])
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
  it('owns the boating offer boundaries without reasons-card data',()=>{
    expect(BOAT_OFFER_START).toBe(.42)
    expect(BOAT_OFFER_END).toBe(.74)
    expect(chapterData.BRAND_REASONS).toBeUndefined()
    const about=CHAPTERS.find(({id})=>id==='who-we-are')
    expect(about.brandValue).toBeUndefined()
  })
  it('contains no customer-facing Himalaya, snow, or ice semantics',()=>{
    expect(JSON.stringify({chapters:CHAPTERS,packages:TREK_PACKAGES})).not.toMatch(/\bhimalaya\b|\bsnow\b|\bice\b/i)
  })
})
