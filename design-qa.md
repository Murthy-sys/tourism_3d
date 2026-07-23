# Mountain → Water → Forest Design QA

Final result: **passed**.

## Acceptance method

- Desktop viewport: `1440×900`.
- Mobile viewport: `390×844`.
- Fail-closed states: mountain opening (`.08`), distant water reveal (`.26`), mountain/water handoff (`.35`), water corridor (`.50`), distant forest reveal (`.59`), water/forest handoff (`.67`), and forest finale (`.84`).
- Every state asserted its phase, biome and transport weights, one guide plus three tourists, early next-biome visibility, camera jump `≤ .8`, no console failures, and zero audio controls.
- Both handoffs required both neighboring biome weights and both neighboring transport weights to exceed `.05`.
- Mobile additionally asserted no horizontal overflow and no clipped chapter overlay.
- All 28 final captures (full page and isolated WebGL for seven states at both viewports) were inspected for blocking visual defects.

Screenshot roots:

- Desktop: `/tmp/tourist-management-visual-qa/desktop`
- Mobile: `/tmp/tourist-management-visual-qa/mobile`

Each row below has matching `<state>-page.png` and `<state>-webgl.png` captures in its screenshot root.

## Desktop evidence — 1440×900

| State | Progress | Phase | Biomes M/W/F | Transports trekker/boat/jeep | Party | Next biome | Camera jump | Runtime |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| `mountain-opening` | `.08` | `mountain-trek` | `1 / 0 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `.000` | clean |
| `distant-water-reveal` | `.26` | `mountain-trek` | `.942 / .058 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `.088` | clean |
| `mountain-water-handoff` | `.35` | `trek-to-boat` | `.235 / .765 / 0` | `.5 / .5 / 0` | `1 + 3` | water visible | `.000` | clean |
| `water-corridor` | `.50` | `water-boat` | `0 / 1 / 0` | `0 / 1 / 0` | `1 + 3` | forest visible | `.198` | clean |
| `distant-forest-reveal` | `.59` | `water-boat` | `0 / .973 / .027` | `0 / 1 / 0` | `1 + 3` | forest visible | `.129` | clean |
| `water-forest-handoff` | `.67` | `boat-to-jeep` | `0 / .407 / .593` | `0 / .5 / .5` | `1 + 3` | forest visible | `.000` | clean |
| `forest-finale` | `.84` | `forest-jeep` | `0 / 0 / 1` | `0 / 0 / 1` | `1 + 3` | complete | `.000` | clean |

Visual acceptance:

- The mountain trail supports all four planted hikers and retains textured terrain, ridges, vegetation, route, and landing.
- Water reads as a continuous reflective corridor with shoreline, docks, wake, rower, hull, and oars.
- The forest remains dense and varied while keeping the track and complete jeep readable.
- Incoming environments appear before their handoffs; both environments and transports remain legible during overlap.
- No giant foreground occluder, route obstruction, floating person, vehicle/deck collision, hard fade line, camera snap, unreadable overlay, or clipped composition remains.

## Mobile evidence — 390×844

| State | Progress | Phase | Biomes M/W/F | Transports trekker/boat/jeep | Party | Next biome | Camera jump | Layout/runtime |
| --- | ---: | --- | --- | --- | --- | --- | ---: | --- |
| `mountain-opening` | `.08` | `mountain-trek` | `1 / 0 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `.000` | clean |
| `distant-water-reveal` | `.26` | `mountain-trek` | `.942 / .058 / 0` | `1 / 0 / 0` | `1 + 3` | water visible | `.088` | clean |
| `mountain-water-handoff` | `.35` | `trek-to-boat` | `.235 / .765 / 0` | `.5 / .5 / 0` | `1 + 3` | water visible | `.000` | clean |
| `water-corridor` | `.50` | `water-boat` | `0 / 1 / 0` | `0 / 1 / 0` | `1 + 3` | forest visible | `.199` | clean |
| `distant-forest-reveal` | `.59` | `water-boat` | `0 / .973 / .027` | `0 / 1 / 0` | `1 + 3` | forest visible | `.129` | clean |
| `water-forest-handoff` | `.67` | `boat-to-jeep` | `0 / .407 / .593` | `0 / .5 / .5` | `1 + 3` | forest visible | `.000` | clean |
| `forest-finale` | `.84` | `forest-jeep` | `0 / 0 / 1` | `0 / 0 / 1` | `1 + 3` | complete | `.000` | clean |

Visual acceptance:

- The mobile mountain opening uses an elevated three-quarter camera: all four hikers are fully framed on the trail and terrain fills the lower half.
- The later mountain and first-handoff views retain the complete separated party and readable trail/landing.
- The boat, rower, oars, shorelines, and incoming forest remain readable across all water states.
- The forest finale shows the complete jeep; protected camera clearances prevent any foreground tree or undergrowth object from covering more than 20% of the composition.
- Every mobile overlay is within the viewport; there is no horizontal overflow, console warning/error, or sound control.

## Repairs verified during acceptance

- Added live `window.__journeyQA()` evidence, camera-settlement checks, fail-closed console capture, exact viewport/state selection, and paired full-page/WebGL captures.
- Reframed the mobile trekking party with a wider elevated camera and mobile field of view.
- Protected desktop and mobile forest camera corridors from full tree crowns and undergrowth footprints.
- Invalidated Three.js material programs whenever biome blending changes `transparent`, eliminating stale opaque geometry during later states.
- Retained frame-rate-independent camera damping and verified the final rail stays below the `.8` discontinuity limit.

## Automated verification

- `npm test -- --run --exclude '.worktrees/**'`: passed, 20 files and 103 main-worktree tests.
- `npm run build`: passed, 51 modules transformed. The existing chunk-size advisory remains non-blocking.
- `git diff --check`: passed.
- The unexcluded `npm test -- --run` also discovers `.worktrees/continuous-landscape` and fails five of that worktree's React tests because its React copy is mixed with the root renderer. All 103 tests belonging to this main worktree pass.
