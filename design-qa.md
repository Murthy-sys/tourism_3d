# Bus Trailhead + Mountain → Water → Forest Design QA

Final result: **passed**.

## Acceptance coverage

- Desktop viewport: `1440×900`.
- Mobile viewport: `390×844`.
- Eleven deterministic scroll states: trailhead establishing (`0`), travelers beside coach (`.035`), trailhead departure (`.08`), mountain entry (`.12`), brand collaboration overview (`.21`), transparent creator card / distant water reveal (`.26`), mountain-water handoff (`.35`), water corridor (`.50`), distant forest reveal (`.59`), water-forest handoff (`.67`), and forest finale (`.84`).
- Forty-four final captures: full-page and isolated-WebGL evidence for every state at both viewports.
- Screenshot roots:
  - Desktop: `/tmp/tourist-management-bus-qa-final/desktop`
  - Mobile: `/tmp/tourist-management-bus-qa-final/mobile`
  - Focused card/opening evidence: `/tmp/tourist-management-card-qa`

## Fail-closed runtime evidence

Every approved state verifies:

- Exact phase, active biome, active transport, material overlap during handoffs, and early visibility of the next environment.
- One guide plus three tourists on the active journey transport.
- Stable coach world placement, correct opening departure weight, and full coach/party framing at the opening beats.
- Observed camera movement at or below the `.8` discontinuity limit.
- No console failures, no audio controls, no horizontal overflow, and no clipped overlay on desktop or mobile.
- Correct full-page and WebGL screenshots written only after runtime assertions pass.

The two portfolio beats additionally compare the live DOM against the exact source content:

- “Destination stories. Brand impact.” plus the full collaboration-positioning body and all six brand capabilities.
- “Karnataka, experienced deeply.” inside the transparent creator card plus the exact eight requested coverage pillars, in order.

## Visual acceptance

- The opening starts in open hill country with the parked tourist coach, guide, and three tourists fully readable. A foreground vegetation fragment discovered during final inspection was removed by protecting a six-unit opening-camera bubble.
- The Who We Are content explains the portfolio’s offer to tourism boards, hotels, resorts, travel companies, adventure brands, and government tourism departments rather than presenting only a travel montage.
- The next scroll beat presents the creator story in a translucent, blurred glass card. Desktop and mobile versions remain within the viewport; mobile typography was increased after review.
- Mountain, reflective-water, and dense-forest environments remain in the approved order with trekker → boat → jeep handoffs and no camera snap.
- Water, landing, party, boat occupants, forest route, and complete jeep remain readable in their approved compositions.
- Background audio and sound controls remain absent.

## Automated verification

- `npm test -- --run`: passed, 23 files and 169 tests.
- `npm run build`: passed, 53 modules transformed.
- `git diff --check`: passed.
- The existing Vite bundle-size advisory remains non-blocking.
