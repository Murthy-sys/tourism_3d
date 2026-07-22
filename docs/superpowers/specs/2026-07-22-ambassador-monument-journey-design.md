# Ambassador-Led Monument Journey

## Status

Approved visual direction. This specification refines and supersedes the relevant presentation details in `2026-07-22-fullscreen-india-3d-journey-design.md`. The continuous full-screen journey, compact menu, booking overlay, and India-wide tourism scope remain in force.

## Objective

Raise the WanderLux experience from an interface layered over a procedural landscape to a cinematic, vehicle-led 3D journey. Visual fidelity takes priority over download size. After the visitor selects Start, a high-detail vintage Ambassador-style car with a visible traveller must lead the experience. Content appears only after an initial uninterrupted driving sequence and is staged as part of realistic three-dimensional environments rather than conventional flat cards.

The experience may follow the storytelling rhythm and interaction model of `https://sebastien-lempens.com/`, but it must use original scenery, copy, models, branding, and code.

## Experience Sequence

### 1. Start and Vehicle Arrival

- Start opens directly into the 3D world.
- A detailed vintage Ambassador-style car enters or is already moving through the opening landscape.
- The car includes a visible traveller, rotating wheels, working suspension motion, headlights, glass, chrome, body paint, and grounded shadows.
- Camera motion initially prioritizes the car and environment. No company information panel appears during this opening interval.
- The first scroll range is an uninterrupted drive establishing scale, atmosphere, and direction.

### 2. Who We Are

- The car arrives at a nationwide travel-operations pavilion set within a refined Indian heritage environment. It must not be labelled or framed as specifically South Indian.
- The scene depicts realistic tourism-company activity through desks, route maps, luggage, vehicles, guide meeting points, itinerary displays, and staff/traveller silhouettes.
- Content is physically integrated into the pavilion through architectural lettering, projection surfaces, signage, or material panels rather than a floating webpage card.
- The message explains that WanderLux designs, coordinates, and manages travel across India.
- Operational proof points include destination specialists, stays and transport coordination, verified guides and local partners, documentation and permit help, 24/7 journey support, and custom planning for individuals, families, groups, and corporate travel.
- Primary copy:

  > We don’t simply book holidays. We design, coordinate and manage journeys across India—from the first conversation to the moment you return home.

### 3. Plans as 3D Monuments

- The Ambassador resumes its journey after Who We Are.
- Three plans appear as distinct, explorable architectural installations rather than DOM card grids:
  1. Southern Discovery
  2. Heritage India
  3. Himalayan Adventure
- Each installation has its own monument language, environment, materials, depth, lighting, route inscription, duration, trip style, and Plan This Journey interaction.
- Plan information may use semantic HTML for accessibility, but its visible placement must align with and feel embedded in the 3D monument.
- Selecting a plan opens the existing full-screen booking overlay with the plan prefilled.

### 4. Contact Finale

- The vehicle reaches a final pavilion overlooking a dramatic Indian landscape at blue hour.
- Contact copy and actions are integrated into the pavilion architecture, not presented as a conventional card or footer.
- The finale includes Plan Your India Journey, email contact, availability, and support details.
- The car and traveller remain visible as the journey’s closing visual anchor.

## Visual Direction

- Favor believable scale, recognizable architecture, physically based materials, high-quality lighting, contact shadows, atmospheric fog, and cinematic depth of field where supported.
- Use detailed locally stored 3D assets with clear reuse or creation rights. Do not hotlink third-party models.
- When an appropriate licensed model cannot be sourced, create an original high-detail Three.js asset or generate a compliant replacement rather than showing a placeholder.
- Avoid flat card grids, generic glass panels, abstract boxes standing in for monuments, and simple spheres standing in for the traveller or vehicle.
- Retain the reference-inspired restrained typography: short statements, large display type, small uppercase labels, generous negative space, and reveals synchronized with camera arrival.

## Sound

- Start with sound enabled only when the visitor explicitly chooses it at the entry gate.
- The fixed Sound control must reflect the real audio state.
- Clicking Sound while audio is playing immediately fades the master output to silence and stops audible playback.
- Clicking again resumes the ambient soundtrack from the current experience state.
- Audio state must remain synchronized across the gate and the journey control.
- Browser audio restrictions and unavailable audio must fail silently without breaking entry or navigation.

## Architecture

- Replace the sphere traveller with a reusable Ambassador vehicle group or loaded GLTF scene.
- Add a vehicle controller for route position, heading, wheel rotation, suspension motion, lighting, and visibility.
- Expand the journey timeline with a vehicle-only opening interval before Who We Are.
- Create scene groups for the travel-operations pavilion, three plan monuments, and the contact pavilion.
- Keep accessible copy and actions in React, positioned against 3D anchors and activated by the shared normalized journey progress.
- Keep the existing booking overlay and menu navigation, adapting chapter targets to the revised timeline.
- Centralize audio state so the gate and fixed sound control cannot disagree.

## Responsive Behavior

- Desktop receives the complete high-fidelity scene and camera choreography.
- Mobile retains the same vehicle, required environments, plan selection, and contact journey. Camera framing and asset level of detail may adapt, but required content and recognizable monuments must not be removed.
- Reduced-motion mode uses controlled camera cuts and minimal vehicle movement while preserving every scene.

## Testing and QA

- Add unit tests for the revised timeline, initial vehicle-only interval, vehicle transform calculations, and synchronized sound state.
- Test that Sound produces a zero master gain when disabled and restores it when enabled.
- Test plan selection and booking prefill after the monument conversion.
- Capture desktop and mobile states for Start, opening drive, Who We Are, each plan monument, Contact, menu, and booking.
- Compare reference and implementation presentation qualities at matching viewport sizes.
- Treat a missing Ambassador, simple placeholder vehicle, content appearing before the opening drive, flat visible plan/contact cards, generic block monuments, non-working sound mute, broken booking, unreadable copy, or mobile omission as release-blocking.

## Acceptance Criteria

1. A detailed vintage Ambassador-style car with a visible traveller leads the experience immediately after Start.
2. The opening includes a meaningful vehicle-only journey before company content appears.
3. Who We Are depicts realistic nationwide tourism-management work without South India-specific positioning.
4. Plans are presented as three distinct 3D architectural installations, not a flat card grid.
5. Contact is integrated into a 3D finale pavilion, not a conventional card or footer.
6. Copy is concise, cinematic, original, and visually integrated with the scene.
7. The Sound control audibly mutes and resumes the real ambient audio and accurately displays its state.
8. Booking, menu navigation, desktop, mobile, reduced motion, and accessibility remain functional.
9. Automated tests, production build, browser interaction QA, and visual comparison pass before handoff.

## Scope Boundaries

- No backend booking or payment system.
- No free-driving game controls.
- No copying of the reference site’s proprietary assets, characters, audio, or source code.
- No conventional header, stacked webpage sections, card-grid replacement, or footer after entry.
