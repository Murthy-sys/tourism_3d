import { chromium } from '@playwright/test'

const requested=process.argv[2]||'desktop'
const viewport=requested==='mobile'?{width:390,height:844}:{width:1440,height:900}
const browser=await chromium.launch({headless:true})
const page=await browser.newPage({viewport})
const messages=[]
page.on('console',m=>{if(['error','warning'].includes(m.type())&&!m.text().includes('ReadPixels'))messages.push(`${m.type()}: ${m.text()}`)})
page.on('pageerror',e=>messages.push(`pageerror: ${e.message}`))
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'})
await page.getByRole('button',{name:'Start'}).waitFor({timeout:15000})
await page.getByRole('button',{name:/sound/i}).click()
await page.getByRole('button',{name:'Start'}).click()
await page.waitForTimeout(1400)

const track=page.locator('.experience__track')
const height=await track.evaluate(el=>el.offsetHeight)
const states=[['opening-drive',.08],['who-we-are',.25],['ambassador-to-jeep',.39],['jungle-jeep',.48],['jeep-to-boat',.60],['water-boat',.66],['boat-to-trek',.72],['ice-trek',.82],['contact',.96]]
const seen=[]
for(const [name,progress] of states){
  await page.evaluate(({y})=>{document.documentElement.style.scrollBehavior='auto';scrollTo(0,y)},{y:(height-viewport.height)*progress})
  await page.waitForTimeout(850)
  const heading=await page.locator('.chapter h1').count()?await page.locator('.chapter h1').innerText():null
  const activePlan=await page.locator('.monument-plan-actions button.active strong').count()?await page.locator('.monument-plan-actions button.active strong').innerText():null
  seen.push({name,heading,activePlan})
  await page.screenshot({path:`/tmp/ambassador-india-${requested}-${name}.png`})
}

const sound=page.getByRole('button',{name:'Toggle ambient sound'})
const soundStarted=await sound.evaluate(el=>el.classList.contains('sound-toggle--on'))
await sound.click()
const soundMuted=await sound.evaluate(el=>!el.classList.contains('sound-toggle--on'))
await sound.click()
const soundResumed=await sound.evaluate(el=>el.classList.contains('sound-toggle--on'))

await page.getByRole('button',{name:'Open journey menu'}).click()
const menuItems=await page.locator('.journey-menu__items button').count()
await page.screenshot({path:`/tmp/ambassador-india-${requested}-menu.png`})
await page.getByRole('button',{name:'Plans'}).click()
await page.waitForTimeout(1500)
const menuJump=await page.locator('.chapter h1').innerText()
await page.getByRole('button',{name:'Open journey menu'}).click()
await page.getByRole('button',{name:'Plan a Trip'}).click()
const dialog=page.locator('.booking-overlay')
await dialog.waitFor()
await page.screenshot({path:`/tmp/ambassador-india-${requested}-booking.png`})
await page.getByLabel('Full name').fill('QA Traveller')
await page.getByLabel('Email').fill('qa@example.com')
await page.getByLabel('Plan or destination').fill('Heritage India')
await page.getByRole('button',{name:'Request itinerary'}).click()
const bookingSubmitted=await page.getByText('Journey request received').isVisible()
const result={requested,seen,soundStarted,soundMuted,soundResumed,menuItems,menuJump,bookingSubmitted,horizontalOverflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),fixedNavbar:await page.locator('.navbar').count(),conventionalSections:await page.locator('#services,#destinations,#testimonials,footer').count(),messages}
console.log(JSON.stringify(result,null,2))
await browser.close()
