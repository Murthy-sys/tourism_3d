# Trailhead Side-Mountain Clearance Design

## Goal

Keep the green side-mountain terrain physically behind the bus at the opening so
its edge does not touch or overlap the bus silhouette on mobile or desktop.

## Root Cause

The green surface is the main hill terrain. Its trailhead flattening/cutout blends
back into the natural mountain too close to the coach’s front-right area. From the
opening camera angles, that rising terrain edge meets the bus roof/nose silhouette.

## Correction

Adjust only the trailhead terrain opening around the coach nose:

- Preserve the existing coach position, scale, heading, and materials.
- Preserve the existing camera framing.
- Preserve the mountain color and terrain outside the trailhead.
- Expand the flattened opening just enough on the bus-front side that the natural
  terrain begins behind the complete coach silhouette.
- Blend the expanded opening smoothly into the existing mountain heightfield.
- Do not use render-order or depth-test overrides; the geometry must be physically
  correct.

## Testing

- Add a terrain clearance regression test using the production coach pose and
  footprint.
- Confirm the relevant terrain samples remain at or below the trailhead floor
  around the coach nose.
- Keep existing terrain, gravel, trailhead, and coach tests passing.
- Capture and inspect opening frames at the production mobile and desktop camera
  angles.

## Scope

Only the terrain-height calculation and its focused regression coverage may
change. The bus, camera, route, vegetation, cards, menu, and other journey stages
remain unchanged.
