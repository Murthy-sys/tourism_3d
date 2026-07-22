import {mkdir,stat} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from '@playwright/test'

const requested=process.argv[2]||'desktop'
if(!['desktop','mobile'].includes(requested))throw new Error(`Unknown QA mode "${requested}". Use desktop or mobile.`)

const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:4173/'
const viewport=requested==='mobile'?{width:390,height:844}:{width:1440,height:900}
const screenshotDir=path.resolve(process.env.QA_SCREENSHOT_DIR||`/tmp/continuous-landscape-qa/${requested}`)
const states=[
  {name:'forest-water-transition',progress:.595,handoff:{zones:['forest','water'],transports:['jeep','boat']}},
  {name:'water-corridor',progress:.66},
  {name:'water-hill-transition',progress:.725,handoff:{zones:['water','hills'],transports:['boat','trekker']}},
  {name:'hill-reveal',progress:.77},
  {name:'trekking-party',progress:.82},
  {name:'hill-contact',progress:.96},
]

await mkdir(screenshotDir,{recursive:true})
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport})
const messages=[]
const failures=[]
const check=(condition,message)=>{if(!condition)failures.push(message)}
page.on('console',message=>{
  if(['error','warning'].includes(message.type())&&!message.text().includes('ReadPixels'))messages.push(`${message.type()}: ${message.text()}`)
})
page.on('pageerror',error=>messages.push(`pageerror: ${error.message}`))

let result
try{
  await page.goto(baseUrl,{waitUntil:'networkidle'})
  await page.getByRole('button',{name:'Start'}).waitFor({timeout:15000})
  const soundControlsBeforeStart=await page.getByRole('button',{name:/sound/i}).count()
  const audioElementsBeforeStart=await page.locator('audio').count()
  await page.getByRole('button',{name:'Start'}).click()
  await page.waitForFunction(()=>typeof window.__journeyQA==='function',undefined,{timeout:15000})
  await page.waitForTimeout(900)

  const track=page.locator('.experience__track')
  const height=await track.evaluate(element=>element.offsetHeight)
  const scrollToProgress=async progress=>{
    await page.evaluate(({height,viewportHeight,progress})=>{
      document.documentElement.style.scrollBehavior='auto'
      scrollTo(0,(height-viewportHeight)*progress)
    },{height,viewportHeight:viewport.height,progress})
    await page.waitForFunction(target=>Math.abs(window.__journeyQA().progress-target)<.002,progress,{timeout:5000})
    await page.waitForTimeout(900)
  }

  const captureVehicleSmoke=async(name,progress)=>{
    await scrollToProgress(progress)
    const qa=await page.evaluate(()=>window.__journeyQA())
    const screenshot=path.join(screenshotDir,`${name}-smoke.png`)
    await page.screenshot({path:screenshot})
    return{qa,screenshot,screenshotBytes:(await stat(screenshot)).size}
  }
  const ambassadorSmoke=await captureVehicleSmoke('ambassador',.08)
  const jeepSmoke=await captureVehicleSmoke('jungle-jeep',.48)

  const seen=[]
  for(const state of states){
    await scrollToProgress(state.progress)
    const heading=await page.locator('.chapter h1').count()?await page.locator('.chapter h1').innerText():null
    const activePlan=await page.locator('.monument-plan-actions button.active strong').count()
      ?await page.locator('.monument-plan-actions button.active strong').innerText()
      :null
    const qa=await page.evaluate(()=>window.__journeyQA())
    const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
    const fallback=await page.locator('.journey-fallback').count()
    const canvasSize=await page.locator('.journey__canvas').evaluate(canvas=>({width:canvas.width,height:canvas.height}))
    const screenshot=path.join(screenshotDir,`${state.name}.png`)
    await page.screenshot({path:screenshot})
    const screenshotBytes=(await stat(screenshot)).size
    const frame={...state,heading,activePlan,qa,horizontalOverflow,fallback,canvasSize,screenshot,screenshotBytes}
    seen.push(frame)

    check(qa.guides===1,`${state.name}: expected one guide, received ${qa.guides}`)
    check(qa.tourists===3,`${state.name}: expected three tourists, received ${qa.tourists}`)
    check(qa.iceObjects===0,`${state.name}: expected zero snow/ice objects, received ${qa.iceObjects}`)
    check(qa.walkersOnTrail===4,`${state.name}: expected all four walkers on the trail, received ${qa.walkersOnTrail}`)
    check(Math.abs(Object.values(qa.zoneWeights).reduce((sum,weight)=>sum+weight,0)-1)<.001,`${state.name}: zone weights are not normalized`)
    check(!horizontalOverflow,`${state.name}: horizontal overflow detected`)
    check(fallback===0,`${state.name}: WebGL fallback rendered`)
    check(canvasSize.width>0&&canvasSize.height>0,`${state.name}: canvas has no render dimensions`)
    check(screenshotBytes>10000,`${state.name}: screenshot is unexpectedly small (${screenshotBytes} bytes)`)

    if(state.handoff){
      const activeZones=Object.values(qa.zoneWeights).filter(weight=>weight>.05).length
      check(activeZones>=2,`${state.name}: fewer than two landscape zones exceed .05`)
      state.handoff.zones.forEach(name=>check(qa.zoneWeights[name]>.05,`${state.name}: ${name} zone weight does not exceed .05`))
      state.handoff.transports.forEach(name=>{
        check(qa.transportWeights[name]>.05,`${state.name}: ${name} transport weight does not exceed .05`)
        check(qa.transports.find(transport=>transport.name===name)?.visible,`${state.name}: ${name} transport center is outside the viewport`)
      })
    }
  }

  const partyFrame=seen.find(frame=>frame.name==='trekking-party')
  check(partyFrame.qa.visibleMembers.guides===1,'trekking-party: the guide is outside the viewport')
  check(
    partyFrame.qa.visibleMembers.tourists>=(requested==='mobile'?2:3),
    `trekking-party: expected ${requested==='mobile'?'at least two':'three'} visible tourists, received ${partyFrame.qa.visibleMembers.tourists}`,
  )

  const soundControls=await page.getByRole('button',{name:/sound/i}).count()
  const audioElements=await page.locator('audio').count()
  await page.getByRole('button',{name:'Open journey menu'}).click()
  const menuItems=await page.locator('.journey-menu__items button').count()
  const menuOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  const menuScreenshot=path.join(screenshotDir,'menu.png')
  await page.screenshot({path:menuScreenshot})
  await page.getByRole('button',{name:'Plans'}).click()
  await page.waitForFunction(()=>Math.abs(window.__journeyQA().progress-.65)<.02,undefined,{timeout:5000})
  await page.waitForTimeout(300)
  const menuJump=await page.locator('.chapter h1').innerText()

  await page.getByRole('button',{name:'Open journey menu'}).click()
  await page.getByRole('button',{name:'Plan a Trip'}).click()
  const dialog=page.locator('.booking-overlay')
  await dialog.waitFor()
  const bookingOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  const bookingScreenshot=path.join(screenshotDir,'booking.png')
  await page.screenshot({path:bookingScreenshot})
  await page.getByLabel('Full name').fill('QA Traveller')
  await page.getByLabel('Email').fill('qa@example.com')
  await page.getByLabel('Plan or destination').fill('Heritage India')
  await page.getByRole('button',{name:'Request itinerary'}).click()
  const bookingSubmitted=await page.getByText('Journey request received').isVisible()
  await page.waitForTimeout(300)

  const horizontalOverflow=seen.some(frame=>frame.horizontalOverflow)||menuOverflow||bookingOverflow
  const fixedNavbar=await page.locator('.navbar').count()
  const conventionalSections=await page.locator('#services,#destinations,#testimonials,footer').count()
  const frameNames=seen.map(frame=>frame.name)
  check(JSON.stringify(frameNames)===JSON.stringify(states.map(state=>state.name)),'captured frame names do not match the Task 7 contract')
  check(ambassadorSmoke.qa.phase==='ambassador'&&ambassadorSmoke.qa.transportWeights.ambassador>.95,'opening Ambassador smoke state did not render')
  check(ambassadorSmoke.qa.transports.find(transport=>transport.name==='ambassador')?.visible,'opening Ambassador center is outside the viewport')
  check(ambassadorSmoke.screenshotBytes>10000,`opening Ambassador screenshot is unexpectedly small (${ambassadorSmoke.screenshotBytes} bytes)`)
  check(jeepSmoke.qa.phase==='jungle-jeep'&&jeepSmoke.qa.transportWeights.jeep>.95,'moving jeep smoke state did not render')
  check(jeepSmoke.qa.transports.find(transport=>transport.name==='jeep')?.visible,'moving jeep center is outside the viewport')
  check(jeepSmoke.screenshotBytes>10000,`moving jeep screenshot is unexpectedly small (${jeepSmoke.screenshotBytes} bytes)`)
  check(soundControlsBeforeStart===0,`expected no entry sound control, received ${soundControlsBeforeStart}`)
  check(soundControls===0,`expected no journey sound control, received ${soundControls}`)
  check(audioElementsBeforeStart===0&&audioElements===0,`expected no audio elements, received ${audioElementsBeforeStart}/${audioElements}`)
  check(menuItems===5,`expected five menu actions, received ${menuItems}`)
  check(menuJump==='Three ways into India.',`Plans menu jump landed on "${menuJump}"`)
  check(bookingSubmitted,'booking form did not reach the success state')
  check(!horizontalOverflow,'horizontal overflow occurred during at least one QA state')
  check(fixedNavbar===0,`expected no fixed legacy navbar, received ${fixedNavbar}`)
  check(conventionalSections===0,`expected no conventional legacy sections, received ${conventionalSections}`)
  check(messages.length===0,`console/page messages were emitted: ${messages.join(' | ')}`)

  result={
    requested,
    baseUrl,
    viewport,
    screenshotDir,
    frameNames,
    seen,
    ambassadorSmoke,
    jeepSmoke,
    soundControlsBeforeStart,
    soundControls,
    audioElementsBeforeStart,
    audioElements,
    menuItems,
    menuJump,
    bookingSubmitted,
    horizontalOverflow,
    fixedNavbar,
    conventionalSections,
    messages,
    screenshotPaths:{
      smoke:[ambassadorSmoke.screenshot,jeepSmoke.screenshot],
      frames:seen.map(frame=>frame.screenshot),
      menu:menuScreenshot,
      booking:bookingScreenshot,
    },
    failures,
  }
}finally{
  await browser.close()
}

console.log(JSON.stringify(result,null,2))
if(failures.length)throw new Error(`Visual QA failed:\n- ${failures.join('\n- ')}`)
