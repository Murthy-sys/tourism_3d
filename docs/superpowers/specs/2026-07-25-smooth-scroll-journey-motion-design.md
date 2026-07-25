# Smooth Scroll Journey Motion Design

## Goal

Make trekkers, boat, jeep, camera, atmosphere, and biome transitions move
smoothly together during fast or uneven scrolling on every device.

## Evidence

The supplied mobile recording is approximately 19.4 seconds at 60 FPS. Visible
judder occurs while transports and scenery advance during fast scrolling.

The current scroll handler sends raw progress directly into the 3D journey.
Transport and world state therefore jump to each new scroll position
immediately, while the camera separately damps toward that jumped position.
This lets the subject and camera move at different rates even when rendering
continues at normal frame cadence.

## Design

- Store raw scroll input as the target 3D progress.
- Maintain a separate rendered progress inside the Three.js animation loop.
- Advance rendered progress toward target progress using elapsed wall time,
  not frame count.
- Use the same rendered progress for transports, camera framing, atmosphere,
  and biome transitions so they remain synchronized.
- Limit progress velocity during large mobile swipes while keeping ordinary
  scrolling responsive.
- Use a slightly stronger mobile stabilization profile and a lighter desktop
  profile.
- Snap rendered progress directly to target progress when reduced-motion mode
  is active.
- Preserve menu destinations, chapter content, scroll length, routes, camera
  composition, adaptive resolution, and first-frame readiness.

## Performance

- Do not add another animation loop, render pass, or React update loop.
- Reuse the existing Three.js requestAnimationFrame loop and clock delta.
- Clamp suspension-sized frame intervals so returning from an inactive tab
  cannot cause a large progress leap.
- Stop calculating progress movement when rendered and target progress have
  converged.

## Verification

- Unit-test time-based convergence at simulated 20, 30, 60, and 120 FPS.
- Unit-test bounded response to a large fast-scroll jump.
- Verify mobile and desktop profiles converge within a responsive duration.
- Verify reduced-motion snaps without added interpolation.
- Verify transport and camera resolution consume the same rendered progress.
- Run focused journey tests, the full suite, and the production build.
- Use the supplied recording as diagnosis evidence; capture a new comparison
  only when an approved browser surface is available.

