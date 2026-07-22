# Multi-Vehicle Expedition Worlds

## Status

Approved refinement of the Ambassador-led monument journey. This specification replaces the three isolated plan monuments with three complete destination environments and vehicle transitions.

## Objective

Turn the Plans chapter into a cinematic expedition through three materially different worlds:

1. A dense jungle explored by jeep.
2. A broad water landscape crossed by boat.
3. Realistic ice mountains explored by a traveller trekking on foot.

The vintage Ambassador remains the opening vehicle and carries the traveller through the initial journey and Who We Are pavilion.

## Sequence

### Opening and Who We Are

- Preserve the vintage Ambassador, visible traveller, vehicle-only opening, and nationwide tourism-operations pavilion.
- After the Who We Are scene, the Ambassador reaches a transition checkpoint where the first expedition begins.

### Plan 1: Jungle Expedition

- Replace the Southern Discovery monument with a complete jungle environment.
- Include layered tropical vegetation, large trees, vines, rocks, wet ground, mist, shafts of light, and a rough forest track.
- Transition the traveller from the Ambassador into an open expedition jeep.
- The jeep moves along the track with turning wheels, suspension response, headlights, and a visible traveller.
- Integrate the plan name, route, duration, and booking action into a believable trailhead sign or ranger outpost rather than a floating card.

### Plan 2: Water Journey

- Transition from the jungle track to a river, lake, or backwater landing.
- The traveller leaves the jeep and boards a detailed boat.
- Include reflective animated water, shoreline vegetation, rock formations, landing structures, atmospheric haze, wake motion, and water lighting.
- The boat follows a curved water route with gentle pitch, roll, and a visible traveller.
- Integrate plan information into a jetty, carved river marker, or waterside structure.

### Plan 3: Himalayan Trek

- Transition from water into a high-altitude ice landscape.
- Build layered snow and ice mountains with cliffs, glaciers, ridgelines, snow materials, fog, cold directional light, and drifting snow.
- The traveller leaves all vehicles and continues on foot.
- Animate a readable trekking cycle with arms, legs, body lean, backpack, walking pole, and footprints or a marked trail where feasible.
- Integrate plan and contact direction into a base-camp marker, stone cairn, or mountain shelter.

### Contact Finale

- The trek reaches the existing final pavilion, upgraded to fit the ice landscape.
- The traveller remains standing or resting near the pavilion with the mountain route visible behind them.
- Contact actions remain accessible semantic controls aligned with the environment.

## Visual Requirements

- Each world must fill the viewport and have believable foreground, midground, background, lighting, atmosphere, and surface variation.
- Avoid isolated objects on empty ground planes.
- Avoid generic boxes as substitutes for trees, boats, mountains, shelters, or signs.
- Use original detailed Three.js geometry and physically based materials, or locally stored models/textures with clear rights.
- Use environment-specific color grading: humid greens and warm shafts for jungle, blue-green reflections and golden haze for water, and cold blue-white light for the mountains.
- Camera paths must reveal scale and vehicle movement before displaying plan copy.

## Vehicle and Character System

- Add a shared expedition controller that chooses Ambassador, jeep, boat, or trekker by journey phase.
- Only the active vehicle or trekker is visible.
- Preserve the same traveller identity across transitions through consistent clothing and colors.
- Use explicit handoff intervals so vehicles do not pop instantly between frames.
- Jeep follows a terrain route; boat follows a water spline; trekker follows a mountain path.

## Content and Interaction

- Plans remain Southern Discovery, Heritage India, and Himalayan Adventure unless the user later changes their names.
- Each plan retains duration, route, style, and Plan This Journey booking action.
- Copy remains short and cinematic.
- Menu navigation lands at the correct expedition phase.
- Booking opens with the active plan prefilled.

## Sound

- Preserve the working master sound control.
- Add procedural or licensed local environmental layers where feasible: jungle ambience, water movement, and mountain wind.
- Muting Sound must silence every active layer, not only the base ambience.

## Responsive and Accessibility

- Desktop and mobile both retain jungle, jeep, water, boat, ice mountains, and trekking traveller.
- Mobile may use reduced vegetation and snow counts but must not remove the required world or active transport.
- Reduced-motion mode uses slower or stepped movement while preserving scene sequence.
- Plan and contact actions remain keyboard-accessible semantic HTML.

## Verification

- Unit-test phase-to-expedition mapping, active transport visibility, route transforms, boat movement, and trek cycle state.
- Capture desktop and mobile screenshots for Ambassador, jungle jeep, water boat, ice trekker, and contact finale.
- Verify each environment fills the screen and reads distinctly without plan copy.
- Verify plan selection, booking prefill, menu jumps, sound mute/resume, reduced motion, overflow, and console output.
- Run the full automated suite and production build.

## Acceptance Criteria

1. The Ambassador remains in the opening and Who We Are journey.
2. The first plan is a dense jungle world with a moving jeep and visible traveller.
3. The second plan is a reflective water world with a moving boat and visible traveller.
4. The third plan is a convincing ice-mountain world with a traveller trekking on foot.
5. Vehicle and traveller transitions are staged rather than instantaneous visual pops.
6. Each world uses real depth, atmosphere, surface variation, and environment-specific lighting.
7. Plan copy and actions are integrated into physical environmental structures.
8. Contact remains inside the upgraded Himalayan finale.
9. Sound control, booking, menu, desktop, and mobile remain functional.
10. Automated tests, production build, and visual QA pass.

## Scope Boundaries

- No free-driving controls or game mechanics.
- No backend booking or payment system.
- No copied proprietary assets from the reference site.
- No removal of the approved Ambassador opening or tourism-operations pavilion.
