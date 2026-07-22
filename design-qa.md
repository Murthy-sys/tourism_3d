# Continuous Landscape Design QA

Date: 2026-07-23

## Acceptance result

Task 7 passes at 1440×900 and 390×844. The browser probe reports exactly one guide, three tourists, zero snow/ice objects, and four walkers on the trail in every captured landscape state. Representative Ambassador and moving-jeep smoke states remain on screen, while both handoffs retain two weighted landscape zones and both transport centers inside the viewport. Menu navigation, booking submission, no-audio, overflow, WebGL fallback, and console/page-error checks also pass.

## Automated coverage

- Browser-visible `window.__journeyQA()` reports progress, phase, guide/tourist/ice counts, walkers on the route, live zone/transport weights, and projected party/transport visibility.
- The six required frames are captured in order: `forest-water-transition`, `water-corridor`, `water-hill-transition`, `hill-reveal`, `trekking-party`, and `hill-contact`.
- Every frame asserts `{guides:1,tourists:3,iceObjects:0,walkersOnTrail:4}`, normalized zone weights, a live WebGL canvas, no fallback, no horizontal overflow, and a non-trivial screenshot.
- Each handoff asserts both adjacent zone weights and transport weights exceed `.05`, and both transport centers project inside the viewport.
- The trekking frame asserts one visible guide plus three visible tourists on desktop, and one guide plus at least two tourists on mobile.
- Entry/interaction checks assert on-screen Ambassador and moving-jeep smoke states with transport weights `> .95`, five menu actions, a successful Plans jump, a submitted booking, zero sound controls, zero `<audio>` elements, no legacy navbar/sections, and `messages:[]`.

## Transition evidence

| Frame | Desktop weights | Mobile weights | Visual inspection |
| --- | --- | --- | --- |
| Forest → water | forest `.3164`, water `.6836`; jeep `.3164`, boat `.6836` | forest `.3169`, water `.6831`; jeep `.3169`, boat `.6831` | Jeep, boat, shared landing, reeds, rocks, and both banks remain visible in one composition. The following water frame preserves the same channel and boat, so the change reads as a crossfade rather than a pop. |
| Water corridor | water `1`; boat `1` | water `1`; boat `1` | The teal boat, seated rower, paired oars, reflective channel, shallows, shore, rocks, and jetties remain legible without hull/shore clipping. |
| Water → hills | water `.5624`, hills `.4376`; boat `.5624`, party `.4376` | water `.5630`, hills `.4370`; boat `.5630`, party `.4370` | Boat, hill landing, hikers, forested slopes, and layered ridges coexist. The adjacent hill reveal retains the dock faintly while the party gains weight, avoiding a hard scene switch. |

The table evaluates the required screenshot pairs. Fine-grained continuity at the `.62` and `.75` phase boundaries is covered separately by transition-weight, transport-position, and mobile-camera boundary unit probes rather than inferred from the wider screenshot spacing.

## Landscape and party inspection

- Forest density: the outgoing jungle retains layered trees, rocks, reeds, marsh edge, and the jeep through the first landing. Nothing vanishes before the water corridor establishes the opposite bank.
- Water depth: the broad channel, darker central water, pale shallow margins, reflections, reeds, rocks, jetties, and wake give the boat a readable waterline and depth hierarchy on both viewports.
- Hill silhouettes: displaced green/earth slopes, three softened background ridges, valley mist, scattered forest, exposed rocks, winding trail, and the lodge create a non-icy hill-country profile.
- Trekking-party composition: one ochre-pack guide leads three differently colored tourists. Desktop shows all four in the `trekking-party` frame; mobile reports and visibly shows the guide plus all three tourists, with the minimum guide-plus-two requirement exceeded.
- Trail placement: `walkersOnTrail:4` in every frame, with feet and poles visually following the pale winding route through hill reveal and party frames.
- Legacy cleanup: `iceObjects:0` in every browser snapshot; no glacier, snow, or ice foreground/midground/background appears in any accepted screenshot.

## Desktop — 1440×900

- Both landing-centered handoffs keep outgoing and incoming transport centers inside frame.
- The complete party is centered across the hill trail instead of framing only the guide.
- The contact lodge and layered hill silhouettes remain clear, while the CTA, menu, and booking form stay legible as the party approaches the lodge.
- Result: `soundControls:0`, `audioElements:0`, `menuItems:5`, `menuJump:"Three ways into India."`, `bookingSubmitted:true`, `horizontalOverflow:false`, `fixedNavbar:0`, `conventionalSections:0`, `messages:[]`, `failures:[]`.

## Mobile — 390×844

- A 64° portrait camera and a smooth midpoint offset during the jeep-to-boat handoff keep both transport centers readable without a boundary jump.
- The water-to-hill handoff shows the boat at left and the guide-led party at right against continuous hills; both transport centers pass the viewport projection check.
- The party frame contains one visible guide and three visible tourists; the hill reveal contains one guide and at least two tourists.
- Menu cards reflow to two columns, the booking form remains vertically scrollable, and neither state introduces horizontal overflow.
- Result: `soundControls:0`, `audioElements:0`, `menuItems:5`, `menuJump:"Three ways into India."`, `bookingSubmitted:true`, `horizontalOverflow:false`, `fixedNavbar:0`, `conventionalSections:0`, `messages:[]`, `failures:[]`.

## Accepted screenshots

Desktop frames:

- `/tmp/continuous-landscape-qa/desktop/ambassador-smoke.png`
- `/tmp/continuous-landscape-qa/desktop/jungle-jeep-smoke.png`
- `/tmp/continuous-landscape-qa/desktop/forest-water-transition.png`
- `/tmp/continuous-landscape-qa/desktop/water-corridor.png`
- `/tmp/continuous-landscape-qa/desktop/water-hill-transition.png`
- `/tmp/continuous-landscape-qa/desktop/hill-reveal.png`
- `/tmp/continuous-landscape-qa/desktop/trekking-party.png`
- `/tmp/continuous-landscape-qa/desktop/hill-contact.png`
- `/tmp/continuous-landscape-qa/desktop/menu.png`
- `/tmp/continuous-landscape-qa/desktop/booking.png`

Mobile frames:

- `/tmp/continuous-landscape-qa/mobile/ambassador-smoke.png`
- `/tmp/continuous-landscape-qa/mobile/jungle-jeep-smoke.png`
- `/tmp/continuous-landscape-qa/mobile/forest-water-transition.png`
- `/tmp/continuous-landscape-qa/mobile/water-corridor.png`
- `/tmp/continuous-landscape-qa/mobile/water-hill-transition.png`
- `/tmp/continuous-landscape-qa/mobile/hill-reveal.png`
- `/tmp/continuous-landscape-qa/mobile/trekking-party.png`
- `/tmp/continuous-landscape-qa/mobile/hill-contact.png`
- `/tmp/continuous-landscape-qa/mobile/menu.png`
- `/tmp/continuous-landscape-qa/mobile/booking.png`

Every file above was opened and visually inspected after the final production rebuild.

## Verification commands

```bash
npm test -- src/three/indiaJourney.test.js src/three/journeyData.test.js src/three/expeditionController.test.js
npm test -- --run
npm run build
npm run preview -- --host 127.0.0.1 --port 55548 --strictPort
QA_BASE_URL=http://127.0.0.1:55548/ node scripts/visual-qa.mjs desktop
QA_BASE_URL=http://127.0.0.1:55548/ node scripts/visual-qa.mjs mobile
git diff --check
```

## Evidence limits and optional polish

The screen-space center probes are framing guardrails, not automated occlusion or visible-area verdicts; handoff and party legibility is accepted through the manual inspection recorded above. The screenshot audit verifies responsive composition, visible transitions, interaction states, and obvious contrast/overflow defects; it does not claim full WCAG or assistive-technology compliance. Licensed hero-grade vehicle models, scanned terrain textures, and HDR lighting could raise photorealism beyond the accepted original real-time geometry, but no remaining concern blocks this acceptance.

Final result: passed.
