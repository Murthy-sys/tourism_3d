# Mobile Transport-Safe Card Placement Design

## Goal

Keep every mobile content card fully visible without covering the active trekkers,
boat, or jeep. Cards may cover low-priority scenery. Desktop placement remains
unchanged.

## Root Cause

The mobile card rules use fixed bottom offsets. The Three.js camera independently
frames each active transport, so the subject and fixed card can occupy the same
screen region during parts of the journey.

## Design

Use two bounded mobile placement zones:

- `top`: below the menu safe area and above the lower controls.
- `bottom`: above the chapter counter and scroll indicator.

Each content beat declares the safe zone that is opposite its active transport:

- Trekker-facing cards use the zone that leaves the trekking party unobstructed.
- Boat-facing cards use the zone that leaves the boat and occupants unobstructed.
- Jeep-facing cards use the zone that leaves the jeep unobstructed.

The placement is derived from the existing chapter and progress data. It does not
read Three.js coordinates or add per-frame DOM measurements. This keeps mobile
rendering lightweight and deterministic.

`ChapterContent` adds one mobile placement class to visible cards. CSS applies the
corresponding top or bottom inset only below the existing mobile breakpoint. The
card width and maximum height remain bounded by the viewport, and overflow is
allowed only inside the card when content cannot fit on a very short device.

Position changes use a short transform/position transition. Reduced-motion mode
disables that transition.

## Visual Priority

1. Keep the complete active trekkers, boat, or jeep visible.
2. Keep the card fully readable inside the viewport.
3. Keep the menu, chapter counter, and scroll indicator unobstructed.
4. Allow the card to cover sky, water, distant terrain, trees, or other
   low-priority scenery.

Cards must not shrink, collapse, or hide content to create clearance.

## Scope

Included:

- Mobile card placement for the Who We Are/creator cards.
- Mobile What We Offer placement during the boat journey.
- Mobile social-performance and package/contact card placement where an active
  transport could otherwise be covered.
- Smooth placement transitions and reduced-motion behavior.
- Automated placement-class and mobile viewport-boundary coverage.
- Mobile visual QA at representative trekker, boat, and jeep states.

Excluded:

- Camera or Three.js route changes.
- Desktop card placement changes.
- Content, typography, or card transparency changes.
- Continuous projection of 3D subject coordinates into DOM space.

## Testing

- Component tests verify that representative progress values assign the correct
  safe-zone class.
- CSS/visual QA verifies cards remain inside the mobile viewport.
- Representative screenshots verify trekkers, boat occupants, and jeep remain
  unobstructed.
- Existing unit tests and the production build must continue to pass.
