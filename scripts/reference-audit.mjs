import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const output = '/tmp/sebastien-reference-audit'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const consoleMessages = []
page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) consoleMessages.push(`${message.type()}: ${message.text()}`)
})
await page.goto('https://sebastien-lempens.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${output}/01-entry.png` })

const accept = page.getByText('Accept', { exact: true })
if (await accept.isVisible().catch(() => false)) await accept.click()
const start = page.getByText('start', { exact: true })
if (await start.isVisible().catch(() => false)) await start.click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${output}/02-opening.png` })

const steps = []
for (let index = 0; index < 9; index += 1) {
  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(550)
  const text = await page.locator('body').innerText().catch(() => '')
  steps.push({ index: index + 1, text: text.replace(/\s+/g, ' ').slice(0, 500) })
  await page.screenshot({ path: `${output}/${String(index + 3).padStart(2, '0')}-journey.png` })
}

await page.mouse.move(1370, 65)
await page.mouse.click(1370, 65)
await page.waitForTimeout(600)
await page.screenshot({ path: `${output}/15-menu.png` })
const menuText = await page.locator('body').innerText().catch(() => '')

console.log(JSON.stringify({ output, url: page.url(), steps, menuText: menuText.replace(/\s+/g, ' ').slice(0, 1200), consoleMessages }, null, 2))
await browser.close()
