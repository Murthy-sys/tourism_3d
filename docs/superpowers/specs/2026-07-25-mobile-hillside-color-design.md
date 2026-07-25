# Mobile Hillside Color Correction

## Goal

Make the large green hillside in the mobile opening read as natural terrain
rather than a bright, flat ribbon, and prevent it from depth-occluding the
coach.

## Evidence

The supplied mobile screenshot shows a broad saturated green slope running
diagonally behind the coach. The mesh is the main `hill-terrain` heightfield.
Its low-slope vertices remain close to the pure grass base color and become
brighter under the opening light, while the narrow mobile view compresses the
surface into a visually uniform band.

The follow-up screenshot confirms a separate spatial defect: the mobile opening
camera is at `y=5.1`, while terrain between the camera and coach reaches roughly
`y=5–8`. The camera-to-coach sightline therefore passes through the hillside,
so correct depth rendering draws earth over the coach roof.

## Design

- Preserve the terrain mesh, coach placement, traveler placement, and route.
- Use a mobile-specific muted olive grass base with warmer earth and neutral
  rock tones.
- Increase subtle multiscale color variation on mobile so the large slope has
  natural surface breakup without visible noise or striping.
- Blend a small amount of soil into broad low-slope areas so no large region
  remains a single saturated green.
- Preserve the existing desktop palette and all terrain geometry.
- Raise the mobile opening camera above the maximum near-ridge sightline and
  retune its target just enough to keep the complete coach and all four
  travelers framed.
- Preserve later mobile transport camera frames and the existing `.045–.12`
  blend into trekking movement.

## Verification

Add a terrain-color test that verifies the mobile palette is less saturated
than desktop grass and still has meaningful vertex-color variation. Run the
hill-world tests, full suite, and mobile opening visual QA when a browser capture
surface is available. Camera tests must verify minimum ridge clearance, complete
coach framing, and unchanged later transport frames.
