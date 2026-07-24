# Bus Trailhead + Mountain → Water → Forest Design QA

Final result: **passed**.

## Acceptance coverage

- Desktop viewport: `1440×900`.
- Mobile viewport: `390×844`.
- Thirteen deterministic scroll states: trailhead establishing (`0`), travelers beside coach (`.035`), trailhead departure (`.08`), mountain entry (`.12`), brand collaboration overview (`.21`), transparent creator profile (`.24`), paired brand-value cards / distant water reveal (`.26`), mountain-water handoff (`.35`), water corridor (`.50`), distant forest reveal (`.59`), water-forest handoff (`.67`), forest finale (`.84`), and social performance (`.91`).
- Fifty-two final captures: full-page and isolated-WebGL evidence for every state at both viewports.
- Screenshot roots:
  - Desktop: `/tmp/tourist-management-bus-qa-final/desktop`
  - Mobile: `/tmp/tourist-management-bus-qa-final/mobile`
  - Focused card/opening evidence: `/tmp/tourist-management-card-qa`
  - Social performance evidence: `/tmp/tourist-management-social-qa/desktop/social-performance-page.png` and `/tmp/tourist-management-social-qa/mobile/social-performance-page.png`

## Fail-closed runtime evidence

Every approved state verifies:

- Exact phase, active biome, active transport, material overlap during handoffs, and early visibility of the next environment.
- One guide plus three tourists on the active journey transport.
- Stable coach world placement, correct opening departure weight, and full coach/party framing at the opening beats.
- Observed camera movement at or below the `.8` discontinuity limit.
- No console failures, no audio controls, no horizontal overflow, and no clipped overlay on desktop or mobile.
- Paired cards clear the menu, chapter counter, and scroll cue geometrically; mobile item type is measured from computed styles and must remain at least `10px`.
- Correct full-page and WebGL screenshots written only after runtime assertions pass.

The four portfolio beats additionally compare the live DOM against the exact source content:

- “Destination stories. Brand impact.” plus the full collaboration-positioning body and all nine approved promotion services.
- “Karnataka, experienced deeply.” inside the transparent creator card plus the exact eight requested coverage pillars, in order.
- “What We Offer” and “Why Brands Should Work With Us” as two separate glass cards, with all nine services and all six brand reasons in the approved order.
- “Reach that moves people.” compares the profile handle and public-estimate source against the authoritative exports, plus all six labels and their final accessible displays. The `.91` capture remains forest-jeep, rejects dashboard/control overlap, and requires metric labels to measure at least `10px` on mobile.
- Cold desktop software-WebGL startup can render at 3–4 FPS; QA therefore allows `90s` for the camera to settle while retaining the existing `.35` position/target thresholds and `.8` discontinuity limit.

## Visual acceptance

- The opening starts in open hill country with the parked tourist coach, guide, and three tourists fully readable. A foreground vegetation fragment discovered during final inspection was removed by protecting a six-unit opening-camera bubble.
- The Who We Are content explains the portfolio’s offer to tourism boards, hotels, resorts, travel companies, adventure brands, and government tourism departments rather than presenting only a travel montage.
- The next scroll beat presents the creator story in a translucent, blurred glass card. Desktop and mobile versions remain within the viewport; mobile typography was increased after review.
- The following beat presents a prominent diagonal desktop composition—offer at the top-left and brand reasons at the bottom-right—then stacks the same two cards in reading order on mobile without clipping the menu, counter, or scroll cue. Review raised mobile labels from `8px` to a responsive `10.92px` at the approved viewport.
- Mountain, reflective-water, and dense-forest environments remain in the approved order with trekker → boat → jeep handoffs and no camera snap.
- Water, landing, party, boat occupants, forest route, and complete jeep remain readable in their approved compositions.
- The Social Media Performance beat keeps its two-column glass dashboard legible at both `1440×900` and `390×844`: Followers (`156K+`) and Engagement (`46.7%`) are final at `.91`; Total Reach, Reel Views, Viral Reels, and Audience Insights remain explicitly `Updating soon`. Reelax's `815.7K` is a general average-views figure, so it is intentionally not presented as reel-only views. Its profile and source note are `@sanchari.kannadiga` and `Public estimates · July 2026`.
- Background audio and sound controls remain absent.

## Automated verification

- `npm test -- --run`: passed, 24 files and 184 tests.
- `npm run build`: passed, 54 modules transformed.
- `git diff --check`: passed.
- The existing Vite bundle-size advisory remains non-blocking.
- Contact package evidence: `/tmp/tourist-management-package-qa/desktop/contact-packages-page.png` and `/tmp/tourist-management-package-qa/mobile/contact-packages-page.png`
