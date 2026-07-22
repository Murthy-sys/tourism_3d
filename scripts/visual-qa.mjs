import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {chromium} from '@playwright/test'
import {analyzeRgbaPixels,CANVAS_ISOLATION_STYLE,FRAME_CONTRACTS,validateCanvasEvidence,validateFrameContract} from './visual-qa-core.mjs'

const requested=process.argv[2]||'desktop'
if(!['desktop','mobile'].includes(requested))throw new Error(`Unknown QA mode "${requested}". Use desktop or mobile.`)

const baseUrl=process.env.QA_BASE_URL||'http://127.0.0.1:4173/'
const viewport=requested==='mobile'?{width:390,height:844}:{width:1440,height:900}
const screenshotDir=path.resolve(process.env.QA_SCREENSHOT_DIR||`/tmp/continuous-landscape-qa/${requested}`)
const states=[
  'forest-water-transition','water-corridor','water-hill-transition','hill-reveal','trekking-party','hill-contact',
].map(name=>({name,progress:FRAME_CONTRACTS[name].progress}))

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

  const captureCanvasEvidence=async name=>{
    const canvas=page.locator('.journey__canvas')
    const screenshot=path.join(screenshotDir,`${name}-canvas.png`)
    const png=await canvas.screenshot({path:screenshot,style:CANVAS_ISOLATION_STYLE})
    const presentation=await canvas.evaluate(element=>{
      const style=getComputedStyle(element),rect=element.getBoundingClientRect()
      return{
        visible:style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)>.05&&rect.width>0&&rect.height>0,
        width:rect.width,
        height:rect.height,
      }
    })
    const sample=await page.evaluate(async base64=>{
      const image=new Image()
      image.src=`data:image/png;base64,${base64}`
      await image.decode()
      const canvas=document.createElement('canvas')
      canvas.width=32;canvas.height=32
      const context=canvas.getContext('2d',{willReadFrequently:true})
      context.drawImage(image,0,0,32,32)
      return Array.from(context.getImageData(0,0,32,32).data)
    },png.toString('base64'))
    const pixels=analyzeRgbaPixels(Uint8ClampedArray.from(sample),32,32)
    return{screenshot,presentation,pixels}
  }

  const captureVehicleSmoke=async(name,progress)=>{
    await scrollToProgress(progress)
    const qa=await page.evaluate(()=>window.__journeyQA())
    const screenshot=path.join(screenshotDir,`${name}-smoke.png`)
    await page.screenshot({path:screenshot})
    const canvas=await captureCanvasEvidence(`${name}-smoke`)
    return{qa,screenshot,canvas}
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
    const canvas=await captureCanvasEvidence(state.name)
    const frame={...state,heading,activePlan,qa,horizontalOverflow,fallback,canvasSize,screenshot,canvas}
    seen.push(frame)

    validateFrameContract(state.name,qa,requested).forEach(failure=>check(false,failure))
    validateCanvasEvidence(canvas).forEach(failure=>check(false,`${state.name}: ${failure}`))
    check(!horizontalOverflow,`${state.name}: horizontal overflow detected`)
    check(fallback===0,`${state.name}: WebGL fallback rendered`)
    check(canvasSize.width>0&&canvasSize.height>0,`${state.name}: canvas has no render dimensions`)
  }

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
  validateCanvasEvidence(ambassadorSmoke.canvas).forEach(failure=>check(false,`opening Ambassador: ${failure}`))
  check(jeepSmoke.qa.phase==='jungle-jeep'&&jeepSmoke.qa.transportWeights.jeep>.95,'moving jeep smoke state did not render')
  check(jeepSmoke.qa.transports.find(transport=>transport.name==='jeep')?.visible,'moving jeep center is outside the viewport')
  validateCanvasEvidence(jeepSmoke.canvas).forEach(failure=>check(false,`moving jeep: ${failure}`))
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
      canvas:[ambassadorSmoke.canvas.screenshot,jeepSmoke.canvas.screenshot,...seen.map(frame=>frame.canvas.screenshot)],
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
