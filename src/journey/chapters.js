export const SERVICES=[
  ['Curated Tours','Hand-built journeys across iconic and lesser-known India.'],['Stay & Transport','Vetted stays and seamless local movement.'],['Travel Documents','Guidance for permits, insurance and documentation.'],['Local Concierge','Certified guides and round-the-clock assistance.'],['Custom Itineraries','Trips shaped around your pace, budget and interests.'],['Groups & Corporate','Retreats and group logistics managed end to end.']
]
const STANDARD_INCLUSIONS=[
  'Adventurous Jeep Ride',
  '2 Times Local Cuisine Food',
  '1 Time Coffee, Tea or Snacks',
  'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
  'Trek Entry',
  'Trek Guide',
  'Group Fun Activities',
]
export const TREK_PACKAGES=[
  {
    id:'bandaje-waterfalls',
    name:'Bandaje Waterfalls',
    price:3499,
    priceLabel:'₹3,499',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Trek Entry',
      'Trek Guide',
      'Group Fun Activities',
    ],
  },
  {
    id:'kurinjal-trek',
    name:'Kurinjal Trek',
    price:3499,
    priceLabel:'₹3,499',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[...STANDARD_INCLUSIONS],
  },
  {
    id:'netravati-peak-trek',
    name:'Netravati Peak Trek',
    price:3499,
    priceLabel:'₹3,499',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[...STANDARD_INCLUSIONS],
  },
  {
    id:'kuduremukha-trek',
    name:'Kuduremukha Trek',
    price:3599,
    priceLabel:'₹3,599',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[
      ...STANDARD_INCLUSIONS.slice(0,4),
      'Homestay for Fresh Up & Luggage',
      ...STANDARD_INCLUSIONS.slice(4),
    ],
  },
  {
    id:'gangadikallu-trek',
    name:'Gangadikallu Trek',
    price:3499,
    priceLabel:'₹3,499',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:STANDARD_INCLUSIONS.filter(item=>item!=='Trek Guide'),
  },
]
export const STORIES=[
  {quote:'Every transfer, stay and local experience felt effortless.',name:'Ananya Rao',trip:'Kerala to Goa'},
  {quote:'Our heritage route balanced famous landmarks with places we would never have found ourselves.',name:'Kabir Mehta',trip:'Rajasthan & Agra'},
  {quote:'The team adapted our mountain itinerary as the weather changed.',name:'Priya Menon',trip:'Himachal Pradesh'},
]
export const OPENING_TREK_END=.14
export const OPENING_DRIVE_END=OPENING_TREK_END
export const OPENING_STORY=[
  {
    id:'city',
    progressStart:0,
    kicker:'A moment for yourself',
    title:'Step away from the everyday.',
    body:'Leave the rush behind. Refresh your body. Clear your mind.',
  },
  {
    id:'boarding',
    progressStart:.025,
    kicker:'Your journey begins',
    title:'A seat for a fresh start.',
    body:'Meet your fellow travellers. The mountains are calling.',
  },
  {
    id:'road',
    progressStart:.045,
    kicker:'From city streets to open hills',
    title:'Let the city fall behind.',
    body:'A change of scenery. A little room to breathe.',
  },
  {
    id:'arrival',
    progressStart:.105,
    kicker:'The mountain trailhead',
    title:'Breathe deeper. You’re here.',
    body:'Step off the bus and into the hills.',
  },
]
export const getOpeningStory=progress=>
  OPENING_STORY.findLast(story=>progress>=story.progressStart)||OPENING_STORY[0]
export const BOAT_OFFER_START=.42
export const BOAT_OFFER_END=.74
export const SOCIAL_PERFORMANCE_START=.80
export const SOCIAL_PERFORMANCE_SETTLED=.83
export const FINALE_QUOTE_START=.955
export const FINALE_QUOTE_SETTLED=.975
export const FINALE_CONTACT_START=.98
export const FINALE_CONTACT_SETTLED=.995
export const FINALE_QUOTE='Some journeys end. This feeling stays.'
export const SOCIAL_MEDIA_PROFILE={
  handle:'@xyz.travellers.demo',
  url:null,
  sourceLabel:'Sample data · Demo profile',
  sourceUrl:null,
}
export const SOCIAL_MEDIA_METRICS=[
  {id:'followers',label:'Followers',value:500,kind:'compact',suffix:'+',display:'500+'},
  {id:'total-reach',label:'Total Reach',value:null,kind:'pending',suffix:'',display:'Updating soon'},
  {id:'reel-views',label:'Reel Views',value:null,kind:'pending',suffix:'',display:'Updating soon'},
  {id:'engagement',label:'Engagement',value:null,kind:'percent',suffix:'%',display:'Updating soon'},
  {id:'viral-reels',label:'Viral Reels',value:null,kind:'pending',suffix:'',display:'Updating soon'},
  {id:'audience-insights',label:'Audience Insights',value:null,kind:'pending',suffix:'',display:'Updating soon'},
]
export const BRAND_CAPABILITIES=[
  'Destination Promotions',
  'Tourism Campaigns',
  'Hotel & Resort Promotions',
  'Homestay Promotions',
  'Adventure Activity Promotions',
  'Travel Reels',
  'Professional Photography',
  'Cinematic Promotional Videos',
  'Tourism Brand Collaborations',
]
export const CHAPTERS=[
  {...OPENING_STORY[0],id:'home',menuLabel:'Home',progressEnd:OPENING_TREK_END,layout:'drive'},
  {
    id:'who-we-are',
    menuLabel:'Who We Are',
    title:'Destination stories. Brand impact.',
    kicker:'Who we are',
    body:'XYZ Travellers is built for brand collaborations with tourism boards, hotels, resorts, travel companies, adventure brands and government tourism departments. More than a travel montage, the portfolio offers campaign concepts, on-location production, experience-led storytelling and audience-ready assets designed to build attention, trust and travel intent.',
    creator:{
      kicker:'About the creator',
      title:'Karnataka, experienced deeply.',
      body:'XYZ Travellers creates premium travel content across Karnataka, turning its landscapes, heritage, people and adventures into cinematic, brand-ready stories.',
      pillars:[
        'Hidden destinations',
        'Waterfalls',
        'Trekking',
        'Temples & heritage',
        'Road trips',
        'Nature',
        'Local culture & festivals',
        'Adventure experiences',
      ],
    },
    progressStart:OPENING_TREK_END,
    progressEnd:.28,
    layout:'operations',
  },
  {id:'plans',menuLabel:'Plans',title:'Three expedition chapters.',kicker:'Curated journeys',body:'Choose a direction. We will shape every detail around you.',progressStart:.28,progressEnd:.84,layout:'monument-plans'},
  {id:'packages',menuLabel:'Packages',title:'Where should we take you next?',kicker:'Begin a journey',body:'Tell us what you imagine. We will make the route real.',progressStart:.84,progressEnd:.90,layout:'pavilion-contact'},
  {id:'contact',menuLabel:'Contact',title:'XYZ Travellers',kicker:'Contact',body:'',progressStart:.90,progressEnd:1,navigationProgress:FINALE_CONTACT_SETTLED,layout:'contact-card'},
]
export const getChapterAtProgress=(progress)=>{const p=Math.min(1,Math.max(0,progress));return CHAPTERS.find(c=>p>=c.progressStart&&p<(c.progressEnd))||CHAPTERS.at(-1)}
export const getProgressForChapter=id=>{
  const chapter=CHAPTERS.find(item=>item.id===id)
  return chapter?.navigationProgress??chapter?.progressStart??0
}
