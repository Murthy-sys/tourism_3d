# Subject-Locked Transport Camera Design

## Goal

Make the trekkers, boat, and jeep the primary visual subject throughout their
respective travel stages on both mobile and desktop.

## Camera Composition

- Keep the active transport close to the screen center throughout its stage.
- Aim slightly ahead along the route so the upcoming landscape remains visible.
- Use transport-specific composition:
  - Trekkers: a wider, elevated trailing view that keeps the full party visible.
  - Boat: a lower, closer trailing view that preserves water and shoreline
    context.
  - Jeep: a moderately elevated trailing view that shows both the vehicle and
    the forest route ahead.
- Preserve smooth damping so route turns and terrain elevation do not create
  camera shaking or abrupt corrections.
- Use the same subject-lock principle on desktop and mobile, with distances
  adjusted for each viewport.

## Transitions

- Preserve the existing opening coach composition.
- Blend smoothly from the coach opening into the trekker camera.
- Keep transport handoffs continuous when the active subject changes from
  trekkers to boat and from boat to jeep.
- Preserve the existing journey routes, travel timing, scroll timing, and
  chapter timing.

## Scope

- Change camera framing and target calculation only.
- Do not change transport models, party membership, terrain, water, forest,
  lighting, materials, colors, UI content, or overlays.
- Preserve the adaptive mobile rendering behavior and first-frame readiness.

## Verification

- Unit-test that each active transport becomes the camera's primary target.
- Verify each transport remains close to the viewport center at representative
  points along its route.
- Verify camera movement and handoffs remain within the existing jump limits.
- Verify the coach opening frame remains unchanged.
- Run the focused camera tests, full test suite, and production build.
- Capture representative mobile and desktop travel frames when an approved
  browser surface is available; otherwise name visual capture as a limitation.

