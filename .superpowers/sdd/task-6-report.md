# Task 6 Report: Desktop and Mobile Visual Acceptance

## Status

Complete.

## Scope

- Added fail-closed desktop/mobile visual QA for seven required journey states.
- Added live runtime evidence for phase, active biome and transport weights, active-vehicle occupants, projected biome visibility, observed camera continuity, console failures, audio controls, and visual camera diagnostics.
- Inspected and repaired the mountain, water, handoff, and forest compositions at `1440×900` and `390×844`.
- Recorded the final evidence in `design-qa.md`.

## Critical repairs

- Grounded all visible hikers against the measured mountain terrain/deck surface and kept the four-person formation readable.
- Reframed the mobile mountain sequence with an elevated three-quarter camera so all four hikers and the trail remain in frame.
- Corrected water ground coverage, shore continuity, wake, boat placement, and incoming forest visibility.
- Subdivided and lowered the ridge backdrops so a narrow mobile frustum cannot expose viewport-sized triangles.
- Added visible four-person boat and jeep groups, and staged the jeep from live bounds so it cannot intersect the docked boat.
- Preserved live animated opacity while applying biome weights.
- Increased water depth/transmission/reflection separation, basin coverage, and varied shoreline detail.
- Increased layered forest density while retaining full-crown sightline protection and using a smaller undergrowth-only camera bubble.
- Replaced repeated loop-like roots and vines with grounded roots and short canopy strands.
- Capped observed runtime camera corrections below the acceptance threshold on both render qualities.
- Replaced the remaining upright ridge architecture with horizontal displaced heightfields.
- Removed world-weight alpha fading from environment and transport meshes; only negligible presences are visibility-gated, while lighting/atmosphere carry handoffs.
- Trimmed water and forest ground to their physical corridor boundaries, lowered mountain terrain beneath the water handoff edge, and kept staged transports opaque and separated.
- Made `visibleMembers` require ancestor visibility, meaningful transport weight, renderable material opacity, and projection into the live camera frustum.
- Lowered the mobile forest framing and increased varied mid/far trunks and undergrowth.
- Recentered the desktop water rail on measured boat bounds and tightened the mobile boat camera while keeping the full hull and four occupants rendered.
- Increased animated water relief and specular/reflection contrast without changing the continuous ribbon topology.
- Reframed the mobile forest finale from a close rear three-quarter angle so the jeep and existing canopy fill the portrait viewport without adding occluding crowns.

## Visual QA

- Desktop: seven of seven states passed at `1440×900`.
- Mobile: seven of seven states passed at `390×844`.
- Party: one guide and three tourists in every state.
- Handoffs: both adjacent biome and transport weights exceed `.05`.
- Camera: maximum observed runtime correction is `.78` (limit `.8`).
- Runtime: no console failures and no audio controls.
- Layout: no mobile clipping or horizontal overflow.
- Captures:
  - `/tmp/tourist-management-visual-qa/desktop`
  - `/tmp/tourist-management-visual-qa/mobile`

All 28 final page/WebGL captures were generated successfully, and every state implicated by the independent review was inspected after the architectural repairs. No blocking ridge sheet, ghosted handoff, shoreline overlap, foreground occlusion, route obstruction, floating person, vehicle collision, camera snap, unreadable overlay, or clipped mobile composition remains.

## TDD evidence

- QA/runtime regressions first failed for hidden-party counting, scene-root visibility, missing camera evidence, inactive keys, stale output, and missing mobile overlay handling; the focused suite then passed `15/15`.
- Vehicle/controller regressions first failed for animated opacity replacement and colliding forest handoff bounds; the focused suite then passed `28/28`.
- Scene regressions first failed for `16.4746`-unit ridge triangle edges, opaque/flat water layers, missing shore detail, and an `8.2978`-unit undergrowth void; the focused suite then passed `31/31`.
- Architectural regressions then failed for vertical ridge surfaces, alpha-faded biome/vehicle meshes, false-positive rendered-member counts, river/forest ground overlap, weak water reflection/depth, mountain terrain above the water handoff edge, sparse mobile forest layers, and high mobile forest framing; the focused suite passed `59/59` after repair.
- Final composition regressions failed first for the distant desktop/mobile water cameras, weak surface relief/specular parameters, and the high, distant mobile jeep camera; the focused camera/water/forest suite passed `52/52` after repair.

## Final verification

- `npm test -- --run`: passed, 21 files and 119 tests.
- `npm run build`: passed, 51 modules transformed.
- `git diff --check`: passed.
- Final desktop corpus: seven of seven states and 14 images.
- Final mobile corpus: seven of seven states and 14 images.

## Remaining blockers

None.

## Independent Review Root-Cause Analysis

The first Task 6 acceptance corpus was rejected. The failures came from six
shared causes rather than isolated screenshot defects:

1. **Mountain backdrop geometry, not party framing.** The mobile elevated
   camera looks down the mountain route correctly, but `createRidgeGeometry`
   constructs each distant ridge as a single vertical two-vertex strip per
   column. Those broad, low-resolution panels enter the narrow mobile frustum
   as giant triangular polygons. Moving the party camera only changed which
   panel dominated the image.
2. **Insufficient water coverage and optical layering.** The backing basin
   ended inside the reviewed handoff frustum, while the river was a nearly
   uniform opaque ribbon whose depth, Fresnel reflection, specular variation,
   and shoreline relief did not separate at the reviewed cameras.
3. **Shared landmark was treated as a shared vehicle pose.** The boat route
   ends and jeep route begins at the same forest-landing coordinate. During
   `boat-to-jeep`, both vehicles are updated to that identical anchor and then
   alpha blended, producing a physical collision and a ghosted seam. A shared
   route landmark needs distinct dock and shore staging poses derived from
   real bounds.
4. **QA measured scene ownership instead of rendered continuity.**
   `visibleMembers` always reads the hidden trekking-party children, even
   while the active boat and jeep contain one visible person. Likewise,
   `distantVisibility` reads `world.visible`, which is intentionally always
   true. Neither value proves that the active transport occupants or next
   biome are projected, materially weighted, and rendered.
5. **Camera and corpus checks were theoretical or non-operative.**
   `cameraJump` samples static keyframes rather than observed runtime camera
   movement, `resetQAMetrics` is empty, a missing mobile overlay bypasses the
   clipping check, state assertions do not require the active biome/transport
   weights, and screenshots are written before acceptance assertions without
   clearing the old corpus.
6. **Blend reset overwrote animation and forest clearance removed density.**
   World animation updates live wake/foam/mist opacity, but
   `applyBlendWeight` replaces it with captured base opacity instead of
   multiplying the current animated value. In the forest, the same `8.2`
   world-unit camera exclusion used for full crowns is also applied to every
   undergrowth footprint, emptying the reviewed camera corridor and exposing
   repeated distant silhouettes.

The exact root test failure has a separate configuration cause: Vitest scans
`.worktrees/continuous-landscape`, then mixes that worktree's React copy with
the root renderer. The main suite is green only when manually excluded, so
the repository test configuration itself must exclude `.worktrees/**`.

## Final Architectural Resolution

The review symptoms were removed at their shared boundaries:

1. Distant landforms are now horizontal displaced terrain layers rather than
   upright ridge panels.
2. Biome and transport handoffs no longer alpha-fade whole mesh trees.
   Geometry stays at base opacity while local illumination, shadows, and
   atmosphere blend; roots are hidden only below a negligible weight.
3. The river basin, mountain water edge, and forest ground have non-overlapping
   physical extents, and the water layers now provide stronger depth,
   reflectivity, clearcoat, and shoreline variation.
4. The mobile forest uses a lower camera target and denser varied near/mid/far
   vegetation to reduce empty sky without blocking the jeep route.
5. QA occupant counts now describe rendered reality by requiring visible
   ancestors, meaningful transport presence, material opacity, and frustum
   projection.
6. The final water rail uses a low tracking angle centered on measured boat
   bounds, with stronger animated relief and specular contrast; the mobile
   forest uses a close rear three-quarter jeep angle instead of adding
   foreground vegetation.
