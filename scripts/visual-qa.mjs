import { mkdir,rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import {
  BRAND_CAPABILITIES,
  BRAND_REASONS,
  CHAPTERS,
  SOCIAL_MEDIA_METRICS,
  SOCIAL_MEDIA_PROFILE,
} from '../src/journey/chapters.js'

const args=process.argv.slice(2)
const projectIndex=args.indexOf('--project')
const requested=projectIndex>=0?args[projectIndex+1]:(args[0]||'desktop')
if(!['desktop','mobile'].includes(requested)){
  throw new Error(`Unknown visual QA project: ${requested||'(missing)'}`)
}

const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:4173/'
const outputRoot=path.resolve(
  process.env.QA_OUTPUT_DIR||'/tmp/tourist-management-visual-qa',
  requested,
)
const viewport=requested==='mobile'?{width:390,height:844}:{width:1440,height:900}
const captureTravel=10000
const cameraSettleTimeout=90000
const WHO_WE_ARE=CHAPTERS.find(chapter=>chapter.id==='who-we-are')
const states=[
  {
    name:'trailhead-establishing',
    progress:0,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:0,coach:'fully-framed',party:'fully-framed'},
  },
  {
    name:'travelers-beside-coach',
    progress:.035,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:0,coach:'fully-framed',party:'fully-framed'},
  },
  {
    name:'trailhead-departure',
    progress:.08,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{
      departureWeight:.4376849383,
      coach:'rendered',
      party:'visible',
    },
  },
  {
    name:'mountain-entry',
    progress:.12,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    opening:{departureWeight:1,coach:'mounted',party:'visible'},
  },
  {
    name:'brand-collaboration-overview',
    progress:.21,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    content:{
      title:'Destination stories. Brand impact.',
      creatorCard:false,
      body:WHO_WE_ARE.body,
      items:BRAND_CAPABILITIES,
    },
  },
  {
    name:'creator-profile',
    progress:.24,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    content:{
      title:'Karnataka, experienced deeply.',
      creatorCard:true,
      body:WHO_WE_ARE.creator.body,
      items:WHO_WE_ARE.creator.pillars,
    },
  },
  {
    name:'distant-water-reveal',
    progress:.26,
    phase:'mountain-trek',
    activeBiome:'mountain',
    activeTransport:'trekker',
    nextBiome:'water',
    content:{
      title:'What We Offer',
      creatorCard:false,
      body:'',
      items:[],
      brandCards:[
        {title:'What We Offer',items:BRAND_CAPABILITIES},
        {title:'Why Brands Should Work With Us',items:BRAND_REASONS},
      ],
    },
  },
  {
    name:'mountain-water-handoff',
    progress:.35,
    phase:'trek-to-boat',
    activeBiome:'water',
    activeTransport:'trekker',
    handoff:{biomes:['mountain','water'],transports:['trekker','boat']},
  },
  {name:'water-corridor',progress:.50,phase:'water-boat',activeBiome:'water',activeTransport:'boat'},
  {
    name:'distant-forest-reveal',
    progress:.59,
    phase:'water-boat',
    activeBiome:'water',
    activeTransport:'boat',
    nextBiome:'forest',
  },
  {
    name:'water-forest-handoff',
    progress:.67,
    phase:'boat-to-jeep',
    activeBiome:'forest',
    activeTransport:'boat',
    handoff:{biomes:['water','forest'],transports:['boat','jeep']},
  },
  {name:'forest-finale',progress:.84,phase:'forest-jeep',activeBiome:'forest',activeTransport:'jeep'},
  {
    name:'social-performance',
    progress:.91,
    phase:'forest-jeep',
    activeBiome:'forest',
    activeTransport:'jeep',
    content:{
      title:'Reach that moves people.',
      creatorCard:false,
      body:'',
      items:[],
      performance:{
        handle:SOCIAL_MEDIA_PROFILE.handle,
        source:SOCIAL_MEDIA_PROFILE.sourceLabel,
        labels:SOCIAL_MEDIA_METRICS.map(metric=>metric.label),
        values:SOCIAL_MEDIA_METRICS.map(metric=>metric.display),
      },
    },
  },
]
const requestedState=process.env.QA_STATE
const captureStates=requestedState
  ?states.filter(state=>state.name===requestedState)
  :states
if(requestedState&&!captureStates.length){
  throw new Error(`Unknown visual QA state: ${requestedState}`)
}

const isIgnoredConsoleMessage=text=>text.includes('ReadPixels')
const assertWeight=(weights,key,label)=>{
  if(!(weights[key]>.05)){
    throw new Error(`${label} ${key} does not overlap: ${weights[key]}`)
  }
}
const rectanglesOverlap=(a,b)=>
  a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
let coachWorldMatrix
const assertSnapshot=(snapshot,state,externalFailures)=>{
  if(!snapshot||typeof snapshot!=='object') throw new Error('Journey QA snapshot is unavailable')
  if(snapshot.phase!==state.phase){
    throw new Error(`${state.name} phase mismatch: expected ${state.phase}, received ${snapshot.phase}`)
  }
  if(
    snapshot.activeBiome!==state.activeBiome||
    !(snapshot.biomeWeights[state.activeBiome]>.05)
  ){
    throw new Error(
      `${state.name} active biome mismatch: expected ${state.activeBiome}, received `+
      `${snapshot.activeBiome} (${snapshot.biomeWeights[state.activeBiome]})`,
    )
  }
  if(
    snapshot.activeTransport!==state.activeTransport||
    !(snapshot.transportWeights[state.activeTransport]>.05)
  ){
    throw new Error(
      `${state.name} active transport mismatch: expected ${state.activeTransport}, received `+
      `${snapshot.activeTransport} (${snapshot.transportWeights[state.activeTransport]})`,
    )
  }
  if(Object.prototype.hasOwnProperty.call(snapshot.transportWeights,'coach')){
    throw new Error('Coach was added to expedition transport weights')
  }
  if(!snapshot.opening?.coach||!snapshot.opening.coach.mounted){
    throw new Error('Coach is not mounted as trailhead scenery')
  }
  if(!snapshot.opening.coach.worldMatrix?.length){
    throw new Error('Coach world matrix evidence is unavailable')
  }
  if(!coachWorldMatrix){
    coachWorldMatrix=[...snapshot.opening.coach.worldMatrix]
  }else if(
    snapshot.opening.coach.worldMatrix.some(
      (value,index)=>Math.abs(value-coachWorldMatrix[index])>1e-6
    )
  ){
    throw new Error('Coach world matrix changed')
  }
  if(state.opening){
    if(
      Math.abs(
        snapshot.opening.departureWeight-state.opening.departureWeight
      )>1e-6
    ){
      throw new Error(
        `${state.name} departure weight mismatch: `+
        `${snapshot.opening.departureWeight}`
      )
    }
    if(
      state.opening.coach==='fully-framed'&&
      !snapshot.opening.coach.fullyFramed
    ){
      throw new Error(`${state.name} does not fully frame the coach`)
    }
    if(
      state.opening.coach==='rendered'&&
      !snapshot.opening.coach.rendered
    ){
      throw new Error(`${state.name} does not render the coach`)
    }
    if(state.opening.party==='fully-framed'){
      const framed=snapshot.opening.fullyFramedMembers
      if(framed.guides!==1||framed.tourists!==3){
        throw new Error(`${state.name} does not fully frame the party`)
      }
    }
  }
  if(snapshot.visibleMembers.guides!==1||snapshot.visibleMembers.tourists!==3){
    throw new Error(
      `${state.name} trekking party is incomplete: `+
      JSON.stringify(snapshot.visibleMembers),
    )
  }
  if(snapshot.audioControls!==0) throw new Error('Audio controls returned')
  const consoleFailures=[...new Set([
    ...snapshot.consoleFailures,
    ...externalFailures,
  ].filter(message=>!isIgnoredConsoleMessage(message)))]
  if(consoleFailures.length) throw new Error(consoleFailures.join('\n'))
  if(!Number.isFinite(snapshot.cameraJump)){
    throw new Error('Camera evidence is unavailable')
  }
  if(snapshot.cameraJump>.8){
    throw new Error(`Camera discontinuity: ${snapshot.cameraJump}`)
  }
  if(state.nextBiome&&!snapshot.distantVisibility.nextBiome){
    throw new Error('Upcoming biome is not visible early')
  }
  if(state.nextBiome&&!(snapshot.biomeWeights[state.nextBiome]>.01)){
    throw new Error(
      `${state.nextBiome} is not visually weighted during ${state.name}: `+
      snapshot.biomeWeights[state.nextBiome],
    )
  }
  if(state.handoff){
    state.handoff.transports.forEach(name=>
      assertWeight(snapshot.transportWeights,name,'Transport'),
    )
    state.handoff.biomes.forEach(name=>
      assertWeight(snapshot.biomeWeights,name,'Biome'),
    )
  }
}

const browser=await chromium.launch({headless:true})
try{
  await rm(outputRoot,{recursive:true,force:true})
  await mkdir(outputRoot,{recursive:true})
  const context=await browser.newContext({viewport,deviceScaleFactor:1})
  await context.addInitScript(()=>{
    const failures=[]
    window.__journeyConsoleFailures=failures
    const stringify=value=>{
      if(value instanceof Error) return value.stack||value.message
      if(typeof value==='string') return value
      try{return JSON.stringify(value)}catch{return String(value)}
    }
    const record=(type,values)=>{
      const message=`${type}: ${values.map(stringify).join(' ')}`
      if(!message.includes('ReadPixels')) failures.push(message)
    }
    const originalWarn=console.warn.bind(console)
    const originalError=console.error.bind(console)
    console.warn=(...values)=>{record('warning',values);originalWarn(...values)}
    console.error=(...values)=>{record('error',values);originalError(...values)}
    addEventListener('error',event=>record('pageerror',[event.error||event.message]))
    addEventListener('unhandledrejection',event=>record('unhandledrejection',[event.reason]))
  })
  const page=await context.newPage()
  const externalFailures=[]
  page.on('console',message=>{
    if(['error','warning'].includes(message.type())&&!isIgnoredConsoleMessage(message.text())){
      externalFailures.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror',error=>externalFailures.push(`pageerror: ${error.message}`))

  await page.goto(baseUrl,{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Start'}).waitFor({timeout:20000})
  await page.getByRole('button',{name:'Start'}).click()
  await page.waitForFunction(()=>typeof window.__journeyQA==='function',{timeout:20000})
  await page.locator('.journey__canvas').waitFor({state:'visible',timeout:20000})
  await page.evaluate(captureTravel=>{
    const track=document.querySelector('.experience__track')
    if(!track) throw new Error('Journey track is unavailable')
    track.style.height=`${innerHeight+captureTravel}px`
  },captureTravel)
  await page.addStyleTag({content:`
    body.visual-qa-webgl .experience__grade,
    body.visual-qa-webgl .chapter,
    body.visual-qa-webgl .chapter-counter,
    body.visual-qa-webgl .scroll-signal,
    body.visual-qa-webgl .edge-controls,
    body.visual-qa-webgl .cursor-dot,
    body.visual-qa-webgl .cursor-ring { visibility:hidden !important; }
  `})
  await page.waitForTimeout(900)

  const results=[]
  for(const state of captureStates){
    await page.evaluate(()=>window.__resetJourneyQA?.())
    await page.evaluate(async ({progress})=>{
      const track=document.querySelector('.experience__track')
      if(!track) throw new Error('Journey track is unavailable')
      const travel=Math.max(1,track.offsetHeight-innerHeight)
      const origin=scrollY
      const destination=track.offsetTop+travel*progress
      const distance=Math.abs(destination-origin)
      const duration=Math.min(2600,Math.max(1200,900+distance*.08))
      document.documentElement.style.scrollBehavior='auto'
      await new Promise(resolve=>{
        let startedAt
        const advance=timestamp=>{
          if(startedAt===undefined) startedAt=timestamp
          const time=Math.min(1,(timestamp-startedAt)/duration)
          const blend=time*time*time*(time*(time*6-15)+10)
          scrollTo(0,origin+(destination-origin)*blend)
          if(time<1) requestAnimationFrame(advance)
          else resolve()
        }
        requestAnimationFrame(advance)
      })
    },{progress:state.progress})
    await page.waitForFunction(({phase,nextBiome,handoff})=>{
      const snapshot=window.__journeyQA?.()
      if(!snapshot||snapshot.phase!==phase) return false
      if(nextBiome&&!(snapshot.biomeWeights[nextBiome]>.01)) return false
      if(handoff){
        if(!handoff.transports.every(name=>snapshot.transportWeights[name]>.05)) return false
        if(!handoff.biomes.every(name=>snapshot.biomeWeights[name]>.05)) return false
      }
      return true
    },{
      phase:state.phase,
      nextBiome:state.nextBiome,
      handoff:state.handoff,
    },{timeout:15000})
    await page.waitForFunction(()=>{
      const debug=window.__journeyQA?.().visualDebug
      if(!debug) return false
      const distance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]))
      return distance(debug.camera,debug.desiredCamera)<.35&&
        distance(debug.cameraTarget,debug.desiredTarget)<.35
    },null,{timeout:cameraSettleTimeout})
    await page.waitForTimeout(180)

    const snapshot=await page.evaluate(()=>window.__journeyQA())
    const layout=await page.evaluate(()=>{
      const overlayElement=document.querySelector('.chapter')||
        document.querySelector('.chapter-counter')
      const rect=overlayElement?.getBoundingClientRect()
      const chapter=document.querySelector('.chapter')
      const performanceElement=document.querySelector('.chapter--social-performance')
      const performanceRect=performanceElement?.getBoundingClientRect()
      const performance=performanceElement?{
        handle:performanceElement
          .querySelector('.social-performance__header>a')
          ?.textContent?.replace('↗','').trim()||'',
        source:performanceElement
          .querySelector('.social-performance__source')
          ?.textContent?.trim()||'',
        labels:[...performanceElement.querySelectorAll('dt')]
          .map(node=>node.textContent?.trim()||''),
        values:[...performanceElement.querySelectorAll('dd')]
          .map(node=>node.getAttribute('aria-label')?.split(': ').slice(1).join(': ')||''),
        itemFontSize:parseFloat(getComputedStyle(
          performanceElement.querySelector('dt'),
        ).fontSize),
        rect:{
          left:Math.round(performanceRect.left),
          top:Math.round(performanceRect.top),
          right:Math.round(performanceRect.right),
          bottom:Math.round(performanceRect.bottom),
        },
      }:null
      const brandCards=chapter
        ?[...chapter.querySelectorAll('.brand-value-card')].map(card=>{
          const cardRect=card.getBoundingClientRect()
           return{
             title:card.querySelector('h1,h2')?.textContent?.trim()||'',
             items:[...card.querySelectorAll('li')].map(
               item=>item.textContent?.trim()||'',
             ),
             itemFontSize:parseFloat(
               getComputedStyle(card.querySelector('li')).fontSize,
             ),
             rect:{
              left:Math.round(cardRect.left),
              top:Math.round(cardRect.top),
              right:Math.round(cardRect.right),
              bottom:Math.round(cardRect.bottom),
            },
          }
         })
         :[]
      const expectedControls=['edge-controls','chapter-counter','scroll-signal']
      const controls=expectedControls.map(name=>{
        const control=document.querySelector(`.${name}`)
        const controlRect=control?.getBoundingClientRect()
        return{
          name,
          rect:controlRect?{
            left:Math.round(controlRect.left),
            top:Math.round(controlRect.top),
            right:Math.round(controlRect.right),
            bottom:Math.round(controlRect.bottom),
          }:null,
        }
      })
      return{
        horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
        content:chapter?{
          title:chapter.querySelector('h1')?.textContent?.trim()||'',
          creatorCard:chapter.classList.contains('chapter--creator-card'),
          body:chapter.querySelector('.chapter__body')?.textContent?.trim()||'',
          items:[
            ...chapter.querySelectorAll(
              '.operations-proof span, .creator-pillars span',
            ),
          ].map(item=>item.textContent?.trim()||''),
          brandCards,
          performance,
        }:null,
        controls,
        overlay:rect?{
          left:Math.round(rect.left),
          top:Math.round(rect.top),
          right:Math.round(rect.right),
          bottom:Math.round(rect.bottom),
          clipped:rect.left<0||rect.top<0||rect.right>innerWidth||rect.bottom>innerHeight,
        }:null,
      }
    })
    if(layout.horizontalOverflow){
      throw new Error(`Horizontal overflow at ${state.name}`)
    }
    if(requested==='mobile'&&!layout.overlay){
      throw new Error(`Mobile overlay is missing at ${state.name}`)
    }
    if(layout.overlay?.clipped){
      throw new Error(`${requested} overlay is clipped at ${state.name}`)
    }
    for(const control of layout.controls){
      if(!control.rect){
        throw new Error(`${state.name} is missing ${control.name}`)
      }
      if(
        !Object.values(control.rect).every(Number.isFinite)||
        control.rect.right<=control.rect.left||
        control.rect.bottom<=control.rect.top
      ){
        throw new Error(`${state.name} has invalid ${control.name} bounds`)
      }
    }
    if(state.content){
      if(layout.content?.title!==state.content.title){
        throw new Error(`${state.name} content title mismatch`)
      }
      if(layout.content.creatorCard!==state.content.creatorCard){
        throw new Error(`${state.name} creator card mismatch`)
      }
      if(layout.content.body!==state.content.body){
        throw new Error(`${state.name} content body mismatch`)
      }
      if(
        JSON.stringify(layout.content.items)!==
        JSON.stringify(state.content.items)
      ){
        throw new Error(`${state.name} content items mismatch`)
      }
      if(state.content.performance){
        const performance=layout.content.performance
        if(!performance){
          throw new Error(`${state.name} performance evidence is unavailable`)
        }
        if(!Number.isFinite(performance.itemFontSize)){
          throw new Error(`${state.name} performance type evidence is unavailable`)
        }
        for(const key of ['handle','source','labels','values']){
          if(
            JSON.stringify(performance[key])!==
            JSON.stringify(state.content.performance[key])
          ){
            throw new Error(`${state.name} performance ${key} mismatch`)
          }
        }
        if(requested==='mobile'&&performance.itemFontSize<10){
          throw new Error(
            `Mobile performance type is too small: ${performance.itemFontSize}px`,
          )
        }
        for(const control of layout.controls){
          if(rectanglesOverlap(performance.rect,control.rect)){
            throw new Error(
              `${state.name} performance card overlaps ${control.name}`,
            )
          }
        }
      }
      if(state.content.brandCards){
        const actualCards=layout.content.brandCards.map(({title,items})=>({
          title,
          items,
        }))
        if(
          JSON.stringify(actualCards)!==
          JSON.stringify(state.content.brandCards)
        ){
          throw new Error(`${state.name} brand card content mismatch`)
        }
        for(const card of layout.content.brandCards){
          if(
            card.rect.left<0||
            card.rect.top<0||
            card.rect.right>viewport.width||
            card.rect.bottom>viewport.height
          ){
            throw new Error(`${requested} brand card is clipped at ${state.name}`)
          }
          if(requested==='mobile'&&card.itemFontSize<10){
            throw new Error(`Mobile brand-card type is too small: ${card.itemFontSize}px`)
          }
          for(const control of layout.controls){
            if(rectanglesOverlap(card.rect,control.rect)){
              throw new Error(
                `${state.name} brand card overlaps ${control.name}`,
              )
            }
          }
        }
        const [offer,reasons]=layout.content.brandCards
        if(
          requested==='desktop'&&!(
            offer.rect.left<viewport.width*.5&&
            offer.rect.top<viewport.height*.5&&
            reasons.rect.right>viewport.width*.5&&
            reasons.rect.bottom>viewport.height*.5
          )
        ){
          throw new Error('Desktop brand cards lost their diagonal composition')
        }
        if(requested==='mobile'&&!(offer.rect.top<reasons.rect.top)){
          throw new Error('Mobile brand cards are not stacked in reading order')
        }
      }
    }
    assertSnapshot(snapshot,state,externalFailures)

    const pagePath=path.join(outputRoot,`${state.name}-page.png`)
    const webglPath=path.join(outputRoot,`${state.name}-webgl.png`)
    await page.screenshot({path:pagePath})
    await page.evaluate(()=>document.body.classList.add('visual-qa-webgl'))
    await page.locator('.journey__canvas').screenshot({path:webglPath})
    await page.evaluate(()=>document.body.classList.remove('visual-qa-webgl'))
    results.push({
      name:state.name,
      progress:state.progress,
      viewport,
      phase:snapshot.phase,
      biomeWeights:snapshot.biomeWeights,
      transportWeights:snapshot.transportWeights,
      visibleMembers:snapshot.visibleMembers,
      distantVisibility:snapshot.distantVisibility,
      cameraJump:snapshot.cameraJump,
      consoleFailures:snapshot.consoleFailures,
      audioControls:snapshot.audioControls,
      opening:snapshot.opening,
      visualDebug:snapshot.visualDebug,
      layout,
      screenshots:{page:pagePath,webgl:webglPath},
    })
  }

  console.log(JSON.stringify({
    project:requested,
    viewport,
    stateCount:results.length,
    outputRoot,
    states:results,
  },null,2))
}finally{
  await browser.close()
}
