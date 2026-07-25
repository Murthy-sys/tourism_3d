# Adaptive Mobile Rendering Design

## Goal

Make the mobile 3D journey appear smooth and clean without visible pixel
breakup, while protecting lower-powered phones from sustained rendering lag.

## Evidence

The current mobile renderer disables WebGL antialiasing and caps its internal
pixel ratio at `1.25`, even when the phone has a high-density display. This
reduces GPU work, but it also produces visibly jagged silhouettes and coarse
pixels around the coach, travelers, terrain edges, trees, and other detailed
geometry.

Desktop rendering already uses antialiasing and a pixel ratio of up to `2`, so
the defect is isolated to the mobile renderer profile rather than the scene
assets or CSS layout.

## Design

### Initial quality

- Enable WebGL antialiasing on mobile.
- Derive the mobile starting pixel ratio from the device pixel ratio.
- Cap capable mobile devices at `1.75`.
- Never render below `1.25`.
- Leave the desktop pixel-ratio and shadow configuration unchanged.

### Adaptive performance

- Measure render-frame duration using a rolling sample rather than reacting to
  a single frame.
- Ignore the startup warm-up period so shader compilation and initial asset
  preparation do not trigger a false downgrade.
- Downgrade only after sustained slow rendering:
  `1.75` to `1.5`, then `1.5` to `1.25`.
- Apply a cooldown after each adjustment so resolution cannot oscillate or
  flicker during ordinary scroll and camera movement.
- Do not upgrade resolution during the active session. A reload starts a fresh
  device-aware evaluation.
- Reapply the selected pixel ratio through the existing resize path.

### Scope

- Preserve all scene geometry, colors, materials, lighting, cameras, routes,
  motion timing, content, and mobile layout.
- Do not enable mobile shadows or desktop geometry density.
- Do not add a post-processing pipeline or another full-screen render pass.
- Preserve reduced-motion behavior and the existing first-frame readiness
  contract.

## Verification

- Unit-test device-aware starting pixel ratios and their upper and lower bounds.
- Unit-test that isolated slow frames do not reduce quality.
- Unit-test sustained-slow-frame downgrades, minimum quality, and cooldown
  stability.
- Verify the focused renderer tests, full test suite, and production build.
- Capture and inspect a mobile opening frame and an in-motion frame when an
  approved browser surface is available; visual verification is otherwise a
  named limitation.

