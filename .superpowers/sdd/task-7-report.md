# Task 7 Report — Desktop/mobile visual acceptance

## Status

Complete. Desktop and mobile acceptance pass for all six required landscape frames, representative Ambassador and moving-jeep smoke states, menu navigation, and booking submission. The browser probes report exactly one guide, three tourists, zero snow/ice objects, and four walkers on the trail. Both handoffs retain the two adjacent zones and transports, and the trekking party satisfies the desktop/mobile framing requirements.

## Commit

- `a241ad3 Verify continuous realistic landscape`
- Parent before Task 7: `3500631 Harden landscape transitions and cleanup`

## Implementation

- Replaced the legacy nine-frame logger in `scripts/visual-qa.mjs` with strict desktop/mobile acceptance assertions for:
  - `forest-water-transition` at `.595`
  - `water-corridor` at `.66`
  - `water-hill-transition` at `.725`
  - `hill-reveal` at `.77`
  - `trekking-party` at `.82`
  - `hill-contact` at `.96`
- Added browser-visible `window.__journeyQA()` instrumentation for live progress/phase, guide/tourist/ice counts, route placement, zone/transport weights, and projected party/transport centers.
- Added representative Ambassador `.08` and jungle-jeep `.48` screenshots and assertions so the final browser suite guards existing car and jeep behavior as well as the required boat frame.
- Added unit coverage for QA counters, responsive FOV, mobile handoff framing, desktop/mobile party composition, and continuous mobile trek entry.
- Widened the mobile hill-party camera, centered the desktop hill frame on the complete party, and added a smooth mobile forest-to-water target offset after screenshots exposed framing defects.
- Replaced stale ice/single-trekker evidence in `design-qa.md` with the final continuous-landscape evidence and explicit limits for screen-center automation versus manual legibility review.

## Red/green evidence

- Missing QA snapshot initially failed the new counter test; adding `getExpeditionQASnapshot` made it pass.
- The initial mobile party projection reported one guide and zero tourists; the widened mobile framing made the guide plus all three tourists visible.
- The initial desktop party projection reported only three of four walkers; centering the keyframe target on the party formation made all four visible.
- Initial mobile handoff projections clipped incoming/outgoing transports; the responsive `64°` FOV and smooth handoff offset brought both centers into frame.
- The post-review Ambassador viewport assertion failed red because the QA hook projected expedition transports only; including the Ambassador in the screen snapshot made desktop and mobile browser runs green.

## Final verification

- `npm test -- --run` — exit `0`; 19 files, 89 tests passed.
- `npm run build` — exit `0`; 54 modules transformed. Vite emitted only the existing advisory for a JavaScript chunk over 500 kB.
- `QA_BASE_URL=http://127.0.0.1:55548/ node scripts/visual-qa.mjs desktop` — exit `0`; `failures:[]`, `messages:[]`.
- `QA_BASE_URL=http://127.0.0.1:55548/ node scripts/visual-qa.mjs mobile` — exit `0`; `failures:[]`, `messages:[]`.
- Both modes: `soundControlsBeforeStart:0`, `soundControls:0`, `audioElementsBeforeStart:0`, `audioElements:0`, `menuItems:5`, successful Plans jump, `bookingSubmitted:true`, `horizontalOverflow:false`, `fixedNavbar:0`, and `conventionalSections:0`.
- `git diff --cached --check` — exit `0` before commit.

## Visual inspection

All 20 final production screenshots were opened at original resolution:

- Desktop: Ambassador smoke, jungle-jeep smoke, six required landscape frames, menu, booking.
- Mobile: Ambassador smoke, jungle-jeep smoke, six required landscape frames, menu, booking.

Observed acceptance:

- Forest/water and water/hill frames read as intentional shared-landing crossfades without a hard switch.
- Forest density, marsh edge, water depth/shallow margins, jetties, layered hill silhouettes, and the winding trail remain legible on both viewports.
- Desktop shows the complete guide-led four-person party; mobile visibly shows the guide and all three tourists.
- The mobile menu reflows to two columns and the booking form remains vertically scrollable without horizontal clipping.
- No glacier, snow, or ice geometry appears.

## Review

- Self-review: staged scope contained the eight intended Task 7 implementation/test/evidence files; `.superpowers/` remained untracked and was not committed.
- Focused review initially found missing browser-level Ambassador/jeep regression coverage and overbroad wording around screen-center visibility. Both were repaired.
- Focused re-review: no remaining Critical or Important findings.

## Remaining visual concerns

No acceptance-blocking visual defect remains. The real-time low-poly/original geometry is less photorealistic than licensed vehicle assets, scanned terrain textures, and HDR lighting could provide; this is optional polish rather than a Task 7 failure. The mobile contact composition lets the party cross the lodge/CTA stage, but the copy and controls remain legible in the accepted screenshot.

## Rejection repair — supersedes the acceptance claims above

The rejected implementation was repaired with fail-closed QA and materially richer landscape geometry. Earlier claims that party counts were present in every state, that full-page screenshot size proved canvas rendering, and that environmental realism was optional are superseded.

- Party visibility now requires an attached root in the active scene, a renderable mesh, visible ancestors, and effective material opacity above `.05`. Negative tests detach, empty, hide, and zero-opacity roots.
- World weights now require attached renderable roots. A detached-world negative test proves metadata cannot keep a zone active.
- Forbidden snow/ice/glacier scanning covers the complete scene, including object/material names and nested metadata. A scene-level `snow-overlay` mutation fails.
- Stable semantics are explicit and negative-tested: water-corridor = water/boat; hill-reveal = hills/trekker; hill-contact = hills/trekker. Hill reveal moved to stable progress `.79` after the first real browser run correctly rejected residual water/boat weight at `.77`.
- Canvas evidence now uses overlay-isolated WebGL screenshots and an RGBA opacity/luminance/color histogram. Hidden and blank canvas evidence fails; full-page byte size is not an acceptance signal.
- Hills gained 58/34 bushes, 150/88 grass clumps, and 50/30 stone/earth/flower details on desktop/mobile. Forest and water gained layered shrub/reed/stone/root/tree handoff banks and wet bank shelves.

The first repaired browser pass intentionally failed the stale `.77` hill semantics and the contact aggregate-center assumption. Contract tests were added before the `.79` and contact-viewport corrections. A later screenshot inspection found React overlays contaminating element screenshots; an isolation-style test was added red-first before rerunning both viewports.

Final repaired visual evidence:

- Desktop full pages: `/tmp/continuous-landscape-qa-repair/desktop/{ambassador-smoke,jungle-jeep-smoke,forest-water-transition,water-corridor,water-hill-transition,hill-reveal,trekking-party,hill-contact,menu,booking}.png`
- Desktop isolated canvases: `/tmp/continuous-landscape-qa-repair/desktop/{ambassador-smoke,jungle-jeep-smoke,forest-water-transition,water-corridor,water-hill-transition,hill-reveal,trekking-party,hill-contact}-canvas.png`
- Mobile full pages: `/tmp/continuous-landscape-qa-repair/mobile/{ambassador-smoke,jungle-jeep-smoke,forest-water-transition,water-corridor,water-hill-transition,hill-reveal,trekking-party,hill-contact,menu,booking}.png`
- Mobile isolated canvases: `/tmp/continuous-landscape-qa-repair/mobile/{ambassador-smoke,jungle-jeep-smoke,forest-water-transition,water-corridor,water-hill-transition,hill-reveal,trekking-party,hill-contact}-canvas.png`

All 36 repaired images were opened and inspected. Both browser commands exited `0` with `failures:[]`.

Fresh repaired verification:

- `npm test -- --run` — exit `0`; 20 files and 111 tests passed.
- `npm run build` — exit `0`; 54 modules transformed; only Vite's existing chunk-size advisory was emitted (`712.26 kB`, gzip `200.09 kB`).
- `QA_BASE_URL=http://127.0.0.1:49384 QA_SCREENSHOT_DIR=/tmp/continuous-landscape-qa-repair/desktop node scripts/visual-qa.mjs desktop` — exit `0`, `failures:[]`.
- `QA_BASE_URL=http://127.0.0.1:49384 QA_SCREENSHOT_DIR=/tmp/continuous-landscape-qa-repair/mobile node scripts/visual-qa.mjs mobile` — exit `0`, `failures:[]`.
- Repair commit: `a6db2e1 Harden visual acceptance and landscape detail` (14 files, 532 insertions, 142 deletions).
