import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import readline from 'node:readline'

const output = '/tmp/sebastien-reference-audit'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('https://sebastien-lempens.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
console.log('READY')

let capture = 1
async function report(label) {
  await page.waitForTimeout(1000)
  const path = `${output}/${String(capture).padStart(2, '0')}-${label}.png`
  await page.screenshot({ path })
  capture += 1
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1400)
  console.log(JSON.stringify({ label, path, text }))
}

const input = readline.createInterface({ input: process.stdin, terminal: false })
input.on('line', async (line) => {
  try {
    if (line === 'status') await report('status')
    if (line === 'start') {
      await page.evaluate(() => document.querySelector('.cookie-cta-accept')?.click())
      await page.evaluate(() => [...document.querySelectorAll('button, a, div')].find((element) => element.textContent?.trim().toLowerCase() === 'start')?.click())
      await report('opening')
    }
    if (line === 'step') { await page.mouse.wheel(0, 1200); await report('journey') }
    if (line === 'menu') { await page.mouse.click(1370, 65); await report('menu') }
    if (line === 'quit') { await browser.close(); process.exit(0) }
  } catch (error) { console.log(JSON.stringify({ error: error.message })) }
})
