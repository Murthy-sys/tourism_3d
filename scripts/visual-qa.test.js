import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const source=readFileSync('scripts/visual-qa.mjs','utf8')

describe('visual QA fail-closed corpus',()=>{
  it('clears stale output and validates evidence before writing screenshots',()=>{
    expect(source).toContain('await rm(outputRoot')
    expect(source.indexOf('assertSnapshot(snapshot,state,externalFailures)'))
      .toBeLessThan(source.indexOf('await page.screenshot'))
  })

  it('rejects missing or non-finite runtime camera evidence',()=>{
    expect(source).toContain('Number.isFinite(snapshot.cameraJump)')
    expect(source).toContain('Camera evidence is unavailable')
  })

  it('requires active biome, active transport, and a present mobile overlay',()=>{
    expect(source).toContain('state.activeBiome')
    expect(source).toContain('state.activeTransport')
    expect(source).toContain("requested==='mobile'&&!layout.overlay")
  })
})
