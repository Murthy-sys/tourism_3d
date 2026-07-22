export const SERVICES=[
  ['Curated Tours','Hand-built journeys across iconic and lesser-known India.'],['Stay & Transport','Vetted stays and seamless local movement.'],['Travel Documents','Guidance for permits, insurance and documentation.'],['Local Concierge','Certified guides and round-the-clock assistance.'],['Custom Itineraries','Trips shaped around your pace, budget and interests.'],['Groups & Corporate','Retreats and group logistics managed end to end.']
]
export const TRAVEL_PLANS=[
  {id:'southern-discovery',name:'Southern Discovery',days:'10 days',route:'Kerala · Tamil Nadu · Hampi · Goa',style:'Jungle by jeep'},
  {id:'heritage-india',name:'Heritage India',days:'9 days',route:'Backwaters · Lakes · River country',style:'Water by boat'},
  {id:'himalayan-adventure',name:'Hill Country Trek',days:'8 days',route:'Munnar · Coorg · Nilgiris',style:'Lush hills on foot'},
]
export const STORIES=[
  {quote:'Every transfer, stay and local experience felt effortless.',name:'Ananya Rao',trip:'Kerala to Goa'},
  {quote:'Our heritage route balanced famous landmarks with places we would never have found ourselves.',name:'Kabir Mehta',trip:'Rajasthan & Agra'},
  {quote:'The team adapted our mountain itinerary as the weather changed.',name:'Priya Menon',trip:'Himachal Pradesh'},
]
export const OPENING_DRIVE_END=.18
export const CHAPTERS=[
  {id:'home',menuLabel:'Home',title:'The road is calling.',kicker:'WanderLux',body:'A journey across India begins here.',progressStart:0,progressEnd:OPENING_DRIVE_END,layout:'drive'},
  {id:'who-we-are',menuLabel:'Who We Are',title:'Journeys, managed completely.',kicker:'Who we are',body:'We don’t simply book holidays. We design, coordinate and manage journeys across India—from the first conversation to the moment you return home.',progressStart:OPENING_DRIVE_END,progressEnd:.38,layout:'operations'},
  {id:'plans',menuLabel:'Plans',title:'Three ways into India.',kicker:'Curated journeys',body:'Choose a direction. We will shape every detail around you.',progressStart:.38,progressEnd:.92,layout:'monument-plans'},
  {id:'contact',menuLabel:'Contact',title:'Where should we take you next?',kicker:'Begin a journey',body:'Tell us what you imagine. We will make the route real.',progressStart:.92,progressEnd:1,layout:'pavilion-contact'},
]
export const getChapterAtProgress=(progress)=>{const p=Math.min(1,Math.max(0,progress));return CHAPTERS.find(c=>p>=c.progressStart&&p<(c.progressEnd))||CHAPTERS.at(-1)}
export const getProgressForChapter=(id)=>CHAPTERS.find(c=>c.id===id)?.progressStart??0
