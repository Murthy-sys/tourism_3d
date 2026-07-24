import { readFileSync } from 'node:fs'
import { describe,expect,it } from 'vitest'

const source=readFileSync('scripts/visual-qa.mjs','utf8')

describe('visual QA fail-closed corpus',()=>{
  it('captures every approved trailhead beat before the retained journey states',()=>{
    ;[
      "name:'trailhead-establishing'",
      "name:'travelers-beside-coach'",
      "name:'trailhead-departure'",
      "name:'mountain-entry'",
      "name:'brand-collaboration-overview'",
      "name:'distant-water-reveal'",
      "name:'mountain-water-handoff'",
      "name:'water-corridor'",
      "name:'distant-forest-reveal'",
      "name:'water-forest-handoff'",
      "name:'forest-finale'",
    ].forEach(name=>expect(source).toContain(name))
  })

  it('fails closed on coach framing, stationary placement, party framing, and departure weight',()=>{
    expect(source).toContain('snapshot.opening.coach.mounted')
    expect(source).toContain('snapshot.opening.coach.fullyFramed')
    expect(source).toContain('snapshot.opening.coach.rendered')
    expect(source).toContain('snapshot.opening.fullyFramedMembers')
    expect(source).toContain('snapshot.opening.departureWeight')
    expect(source).toContain('Coach world matrix changed')
    expect(source).toContain("hasOwnProperty.call(snapshot.transportWeights,'coach')")
  })

  it('verifies the live brand overview and creator card content',()=>{
    expect(source).toContain("title:'Destination stories. Brand impact.'")
    expect(source).toContain("title:'Karnataka, experienced deeply.'")
    expect(source).toContain('layout.content.creatorCard')
    expect(source).toContain('body:WHO_WE_ARE.body')
    expect(source).toContain('items:BRAND_CAPABILITIES')
    expect(source).toContain('items:WHO_WE_ARE.creator.pillars')
    expect(source).toContain('layout.content.body!==state.content.body')
    expect(source).toContain('JSON.stringify(layout.content.items)')
  })

  it('rejects clipped overlays at both approved viewports',()=>{
    expect(source).toContain('if(layout.overlay?.clipped)')
  })

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

  it('normalizes travel so every approved progress sample lands on an exact pixel',()=>{
    expect(source).toContain('const captureTravel=10000')
    expect(source).toContain('track.style.height=`${innerHeight+captureTravel}px`')
  })
})
