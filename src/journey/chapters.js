export const SERVICES=[
  ['Curated Tours','Hand-built journeys across iconic and lesser-known India.'],['Stay & Transport','Vetted stays and seamless local movement.'],['Travel Documents','Guidance for permits, insurance and documentation.'],['Local Concierge','Certified guides and round-the-clock assistance.'],['Custom Itineraries','Trips shaped around your pace, budget and interests.'],['Groups & Corporate','Retreats and group logistics managed end to end.']
]
export const TRAVEL_PLANS=[
  {id:'mountain-trail',name:'Mountain Trail Expedition',days:'8 days',route:'Munnar · Coorg · Nilgiris',style:'Mountains on foot'},
  {id:'heritage-india',name:'Heritage India',days:'9 days',route:'Backwaters · Lakes · River country',style:'Water by boat'},
  {id:'southern-discovery',name:'Southern Discovery',days:'10 days',route:'Kerala · Tamil Nadu · Hampi · Goa',style:'Forest by jeep'},
]
export const STORIES=[
  {quote:'Every transfer, stay and local experience felt effortless.',name:'Ananya Rao',trip:'Kerala to Goa'},
  {quote:'Our heritage route balanced famous landmarks with places we would never have found ourselves.',name:'Kabir Mehta',trip:'Rajasthan & Agra'},
  {quote:'The team adapted our mountain itinerary as the weather changed.',name:'Priya Menon',trip:'Himachal Pradesh'},
]
export const OPENING_TREK_END=.14
export const OPENING_DRIVE_END=OPENING_TREK_END
export const BRAND_CAPABILITIES=[
  'Campaign concepts',
  'Cinematic production',
  'Destination storytelling',
  'Hospitality features',
  'Adventure coverage',
  'Audience-ready content',
]
export const CHAPTERS=[
  {id:'home',menuLabel:'Home',title:'The trail is calling.',kicker:'WanderLux',body:'A journey across India begins here.',progressStart:0,progressEnd:OPENING_TREK_END,layout:'drive'},
  {
    id:'who-we-are',
    menuLabel:'Who We Are',
    title:'Destination stories. Brand impact.',
    kicker:'Who we are',
    body:'Sanchari Kannadiga is built for brand collaborations with tourism boards, hotels, resorts, travel companies, adventure brands and government tourism departments. More than a travel montage, the portfolio offers campaign concepts, on-location production, experience-led storytelling and audience-ready assets designed to build attention, trust and travel intent.',
    creator:{
      kicker:'About the creator',
      title:'Karnataka, experienced deeply.',
      body:'Sanchari Kannadiga creates premium travel content across Karnataka—turning its landscapes, heritage, people and adventures into cinematic, brand-ready stories.',
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
  {id:'plans',menuLabel:'Plans',title:'Three expedition chapters.',kicker:'Curated journeys',body:'Choose a direction. We will shape every detail around you.',progressStart:.28,progressEnd:.94,layout:'monument-plans'},
  {id:'contact',menuLabel:'Contact',title:'Where should we take you next?',kicker:'Begin a journey',body:'Tell us what you imagine. We will make the route real.',progressStart:.94,progressEnd:1,layout:'pavilion-contact'},
]
export const getChapterAtProgress=(progress)=>{const p=Math.min(1,Math.max(0,progress));return CHAPTERS.find(c=>p>=c.progressStart&&p<(c.progressEnd))||CHAPTERS.at(-1)}
export const getProgressForChapter=(id)=>CHAPTERS.find(c=>c.id===id)?.progressStart??0
