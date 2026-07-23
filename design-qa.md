# Mountain → Water → Forest Design QA

Final result: **passed**.

## Acceptance method

- Desktop viewport: `1440×900`.
- Mobile viewport: `390×844`.
- Fail-closed states: mountain opening (`.08`), distant water reveal (`.26`), mountain/water handoff (`.35`), water corridor (`.50`), distant forest reveal (`.59`), water/forest handoff (`.67`), and forest finale (`.84`).
- Every state asserted its phase, active biome and transport weights, one guide plus three tourists on the active transport, observed camera movement `≤ .8`, no console failures, and zero audio controls.
- The two early-reveal states additionally required the upcoming biome to be materially weighted and projected into the live camera frustum.
- Both handoffs required both neighboring biome weights and both neighboring transport weights to exceed `.05`.
- Mobile additionally asserted no horizontal overflow and no clipped chapter overlay.
- All 28 final captures (full page and isolated WebGL for seven states at both viewports) were generated successfully. Every state implicated by the independent review was inspected after the architectural repairs.

Screenshot roots:

- Desktop: `/tmp/tourist-management-visual-qa/desktop`
- Mobile: `/tmp/tourist-management-visual-qa/mobile`
- Final targeted composition reruns: `/tmp/tourist-management-visual-qa-r5` through `/tmp/tourist-management-visual-qa-r8`.

Each row below has matching `<state>-page.png` and `<state>-webgl.png` captures in its screenshot root.

## Desktop evidence — 1440×900

| State | Progress | Phase | Biomes M/W/F | Transports trekker/boat/jeep | Party | Next biome | Camera jump | Runtime |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| `mountain-opening` | `.08` | `mountain-trek` | `1 / 0 / 0` | `1 / 0 / 0` | `1 + 3` | not required | `≤ .780` | clean |
| `distant-water-reveal` | `.26` | `mountain-trek` | `.942 / .058 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `≤ .780` | clean |
| `mountain-water-handoff` | `.35` | `trek-to-boat` | `.235 / .765 / 0` | `.5 / .5 / 0` | `1 + 3` | water visible | `≤ .780` | clean |
| `water-corridor` | `.50` | `water-boat` | `0 / 1 / 0` | `0 / 1 / 0` | `1 + 3` | not required | `≤ .780` | clean |
| `distant-forest-reveal` | `.59` | `water-boat` | `0 / .973 / .027` | `0 / 1 / 0` | `1 + 3` | forest visible | `≤ .780` | clean |
| `water-forest-handoff` | `.67` | `boat-to-jeep` | `0 / .407 / .593` | `0 / .5 / .5` | `1 + 3` | forest visible | `≤ .780` | clean |
| `forest-finale` | `.84` | `forest-jeep` | `0 / 0 / 1` | `0 / 0 / 1` | `1 + 3` | complete | `≤ .780` | clean |

Visual acceptance:

- The mountain trail supports all four planted hikers and retains textured terrain, horizontal displaced ridge heightfields, vegetation, route, and landing.
- Water reads as a continuous reflective corridor with visible depth, specular/reflection separation, irregular shoreline, docks, wake, rower, hull, and oars.
- The forest remains dense and varied while keeping the track and complete jeep readable.
- Incoming environments appear before their handoffs; live geometry and transports remain opaque and physically separated while atmosphere and lighting carry the blend.
- No upright ridge sheet, ghosted biome/transport, hard shoreline overlap, giant foreground occluder, route obstruction, floating person, vehicle/deck collision, hard fade line, camera snap, unreadable overlay, or clipped composition remains.

## Mobile evidence — 390×844

| State | Progress | Phase | Biomes M/W/F | Transports trekker/boat/jeep | Party | Next biome | Camera jump | Layout/runtime |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| `mountain-opening` | `.08` | `mountain-trek` | `1 / 0 / 0` | `1 / 0 / 0` | `1 + 3` | not required | `≤ .780` | clean |
| `distant-water-reveal` | `.26` | `mountain-trek` | `.942 / .058 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `≤ .780` | clean |
| `mountain-water-handoff` | `.35` | `trek-to-boat` | `.235 / .765 / 0` | `.5 / .5 / 0` | `1 + 3` | water visible | `≤ .780` | clean |
| `water-corridor` | `.50` | `water-boat` | `0 / 1 / 0` | `0 / 1 / 0` | `1 + 3` | not required | `≤ .780` | clean |
| `distant-forest-reveal` | `.59` | `water-boat` | `0 / .973 / .027` | `0 / 1 / 0` | `1 + 3` | forest visible | `≤ .780` | clean |
| `water-forest-handoff` | `.67` | `boat-to-jeep` | `0 / .407 / .593` | `0 / .5 / .5` | `1 + 3` | forest visible | `≤ .780` | clean |
| `forest-finale` | `.84` | `forest-jeep` | `0 / 0 / 1` | `0 / 0 / 1` | `1 + 3` | complete | `≤ .780` | clean |

Visual acceptance:

- The mobile mountain opening uses an elevated three-quarter camera: all four hikers are fully framed on the trail and terrain fills the lower half.
- The later mountain and first-handoff views retain the complete separated party and readable trail/landing.
- The boat, rower, oars, depth/reflection layers, irregular shorelines, and incoming forest remain readable across all water states.
- The lower forest camera gives the complete jeep and denser near/mid/far vegetation priority over open sky; protected camera clearances preserve the route.
- Every mobile overlay is within the viewport; there is no horizontal overflow, console warning/error, or sound control.

## Repairs verified during acceptance

- Made `window.__journeyQA()` report the active transport's rendered occupants, materially weighted/frustum-projected worlds, and observed camera movement; reset now clears the real runtime metrics.
- Made capture fail closed on active weights, missing/clipped mobile overlays, stale screenshots, console failures, camera evidence, and early next-biome visibility.
- Replaced upright ridge sheets with subdivided horizontal displaced heightfields and added a regression that rejects broad vertical ridge panels.
- Kept world and vehicle geometry at its base rendered opacity during handoffs; only negligible presences are visibility-gated while atmosphere, local lights, and shadows carry the transition.
- Counted party members only when their full ancestor chain, active transport weight, renderable material opacity, and camera-frustum projection all make them genuinely visible.
- Strengthened water depth/specular/reflection separation, trimmed its physical basin to the river corridor, varied the shoreline, and lowered mountain terrain beneath the handoff water edge.
- Lowered and tightened the desktop and mobile boat-tracking cameras around the measured hull center, increased animated surface relief to `.11`, lowered physical-surface roughness to `.06`, and raised the reflection layer to `.24`.
- Started forest ground at the shared forest landing, increased mobile near/mid/far trees and undergrowth, and changed the mobile finale to a close rear three-quarter jeep view that fills the frame without adding foreground crowns.
- Capped observed camera corrections below the `.8` discontinuity limit on both render qualities.
- Excluded `.worktrees/**` in Vitest configuration so the exact repository command tests only this worktree.

## Automated verification

- `npm test -- --run`: passed, 21 files and 119 tests.
- `npm run build`: passed, 51 modules transformed. The existing chunk-size advisory remains non-blocking.
- `git diff --check`: passed.
