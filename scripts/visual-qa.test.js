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
      "name:'creator-profile'",
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

  it('verifies the live brand overview, creator card, and paired brand cards',()=>{
    expect(source).toContain("title:'Destination stories. Brand impact.'")
    expect(source).toContain("title:'Karnataka, experienced deeply.'")
    expect(source).toContain("title:'What We Offer'")
    expect(source).toContain("title:'Why Brands Should Work With Us'")
    expect(source).toContain('layout.content.creatorCard')
    expect(source).toContain('body:WHO_WE_ARE.body')
    expect(source).toContain('items:BRAND_CAPABILITIES')
    expect(source).toContain('items:BRAND_REASONS')
    expect(source).toContain('items:WHO_WE_ARE.creator.pillars')
    expect(source).toContain('layout.content.body!==state.content.body')
    expect(source).toContain('JSON.stringify(layout.content.items)')
    expect(source).toContain("chapter.querySelectorAll('.brand-value-card')")
    expect(source).toContain('JSON.stringify(actualCards)')
    expect(source).toContain('offer.rect.left<viewport.width*.5')
    expect(source).toContain('reasons.rect.bottom>viewport.height*.5')
    expect(source).toContain('offer.rect.top<reasons.rect.top')
    expect(source).toContain('itemFontSize')
    expect(source).toContain('card.itemFontSize<10')
    expect(source).toContain('layout.controls')
    expect(source).toContain('rectanglesOverlap(card.rect,control.rect)')
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

  it('allows only cold targeted desktop captures extra camera settle time without weakening accuracy',()=>{
    expect(source).toContain("const isColdTargetedDesktop=requested==='desktop'&&Boolean(requestedState)")
    expect(source).toContain('const cameraSettleTimeout=isColdTargetedDesktop?90000:45000')
    expect(source).toContain('distance(debug.camera,debug.desiredCamera)<.35')
    expect(source).toContain(
      'distance(debug.cameraTarget,debug.desiredTarget)<.35',
    )
    expect(source).toContain('timeout:cameraSettleTimeout')
  })

  it('verifies the social performance dashboard before Contact',()=>{
    expect(source).toContain("name:'social-performance'")
    expect(source).toContain('progress:.91')
    expect(source).toContain('labels:SOCIAL_MEDIA_METRICS.map')
    expect(source).toContain('values:SOCIAL_MEDIA_METRICS.map')
    expect(source).toContain('accessibleValues:SOCIAL_MEDIA_METRICS.map')
    expect(source).toContain("document.querySelector('.chapter--social-performance')")
    expect(source).toContain("querySelectorAll('dd span[aria-hidden=\"true\"]')")
    expect(source).toContain('accessibleValues:[...performanceElement.querySelectorAll(\'dd\')]')
    expect(source).toContain('layout.content.performance')
    expect(source).toContain('performance.itemFontSize<10')
    expect(source).toContain('performance.handleFontSize<10')
    expect(source).toContain('performance.sourceFontSize<10')
    expect(source).toContain('rectanglesOverlap(performance.rect,control.rect)')
  })

  it('fails closed when required controls or performance geometry are unavailable',()=>{
    expect(source).toContain(
      "const expectedControls=['edge-controls','chapter-counter','scroll-signal']",
    )
    expect(source).toContain('if(!control.rect)')
    expect(source).toContain('Object.values(control.rect).every(Number.isFinite)')
    expect(source).toContain('control.rect.right<=control.rect.left')
    expect(source).toContain('control.rect.bottom<=control.rect.top')
    expect(source).toContain('if(!performance)')
    expect(source).toContain('if(!performance.rect)')
    expect(source).toContain('Object.values(performance.rect).every(Number.isFinite)')
    expect(source).toContain('performance.rect.right<=performance.rect.left')
    expect(source).toContain('performance.rect.bottom<=performance.rect.top')
    expect(source).toContain('performance.rect.left<0')
    expect(source).toContain('performance.rect.right>viewport.width')
    expect(source).toContain("performance.display==='none'")
    expect(source).toContain("['hidden','collapse'].includes(performance.visibility)")
    expect(source).toContain('!Number.isFinite(performance.opacity)||performance.opacity<=.05')
    expect(source).toContain('Number.isFinite(performance.itemFontSize)')
    expect(source).toContain('Number.isFinite(performance.handleFontSize)')
    expect(source).toContain('Number.isFinite(performance.sourceFontSize)')
  })

  it('verifies the responsive Contact package catalog',()=>{
    expect(source).toContain("name:'contact-packages'")
    expect(source).toContain('progress:.97')
    expect(source).toContain(
      "name:'contact-packages',\n    progress:.97,\n    phase:'contact'",
    )
    expect(source).toContain('packages:TREK_PACKAGES.map')
    expect(source).toContain("chapter.querySelectorAll('.package-card')")
    expect(source).toContain('packageCard.itemFontSize<10')
    expect(source).toContain('rectanglesOverlap(packageCard.rect,control.rect)')
  })
})
