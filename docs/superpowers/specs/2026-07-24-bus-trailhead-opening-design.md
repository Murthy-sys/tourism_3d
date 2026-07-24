# Bus Trailhead Opening — Design Specification

## Objective

Replace the current high mountain opening with a ground-level tourism arrival scene while preserving the existing continuous mountain → water → forest journey.

The experience begins in a natural gravel trailhead clearing. A modern premium Indian tourist coach is already parked with its passenger door open, and one guide with three tourists stands beside it in trekking gear. As the user scrolls, the group forms into a walking line, leaves the bus behind, and enters the existing mountain trail without a cut, scene replacement, or hard visibility change.

## Approved experience

1. The user clicks Start and sees a ground-level establishing view of the full parked coach and all four travelers.
2. The coach remains stationary throughout the experience.
3. The guide and three tourists begin in natural standing positions beside the open passenger door.
4. Early scroll blends the group from the standing arrangement into the existing guide-led trekking formation.
5. The clearing narrows into a foothill path while natural ridges gradually fill the frame.
6. The camera continues into the current mountain trek.
7. The mountain-to-water handoff, water journey, water-to-forest handoff, forest jeep journey, business content, booking and contact experience continue unchanged.

## Retained requirements

- Work only on `main`; do not merge or cherry-pick `feature/continuous-realistic-landscape`.
- Preserve the environment order mountain → water → forest.
- Preserve the traveler order trekking party → boat → jeep.
- Preserve one guide and three tourists through every active traveler representation.
- Preserve Who We Are, plans, trip routes, booking, contact and menu behavior.
- Preserve the current no-audio behavior and do not add a sound control.
- Preserve desktop, mobile, reduced-motion and WebGL fallback behavior.
- Keep upcoming environments visible before their handoff boundaries.
- Visual quality remains more important than performance optimization.

## Non-goals

- The bus does not drive into the scene.
- Travelers do not animate through the doorway.
- The bus does not become an active expedition transport.
- There is no bus-to-trekker cross-fade or vehicle handoff.
- Later water and forest scenes are not redesigned by this feature.
- No external audio, narration or vehicle sound is added.

## Continuous-world layout

Add two authoritative landmarks before the current mountain route:

- `trailheadStart`: the standing area beside the bus.
- `mountainEntry`: the point where the clearing becomes the established mountain trail.

The existing mountain start, mountain landing, forest landing and forest end landmarks remain authoritative for the rest of the journey.

Extend the mountain terrain backward far enough to contain the coach, clearing and departure path. Flatten only the immediate coach turnout, then blend its elevation and surface detail continuously into the foothills. The bus, clearing, mountain, water and forest remain in the same shared Three.js scene.

The parked bus stays mounted and naturally leaves the camera frustum as the party advances. It must not disappear through a progress-triggered visibility toggle.

## Trailhead environment

The opening clearing uses:

- irregular gravel and compacted earth;
- subtle tire marks and damp patches;
- grass, weeds and small stones around the edges;
- a clear walking route from the bus to the foothill path;
- scattered bushes and trees that frame rather than obstruct the coach;
- distant natural hill silhouettes visible on the horizon.

The clearing must read as a real trailhead rather than a paved plaza, decorative card or monument platform. Its route and vegetation clearances must prevent the bus, travelers and camera from intersecting scenery.

## Modern tourist coach

Create a dedicated procedural coach builder with realistic modern proportions and a coherent full-vehicle silhouette. The coach includes:

- long premium body with shaped front and rear;
- panoramic tinted side windows and windscreen;
- roof and lower body trim;
- wheel arches, four road wheels and visible tires;
- mirrors, headlights, tail lights and grille details;
- an open passenger door;
- visible entry steps and a dark interior threshold;
- subtle neutral tourism livery without third-party branding.

The coach uses physically lit materials with controlled roughness, glass response, metallic trim and grounded tire materials. It must sit correctly on the clearing surface, cast a stable shadow and remain fully visible in the initial desktop and mobile framing.

The coach is static scenery. It is not included in expedition transport weights, active-transport selection or traveler continuity counts.

## Traveler staging and departure

At zero progress, the guide and three tourists use four explicit standing positions beside the passenger door:

- the guide stands nearest the start of the walking route;
- the tourists form a loose, readable group beside the coach;
- every traveler remains grounded through boot-height sampling;
- backpacks and trekking equipment remain visible.

The standing arrangement blends into the route formation with one shared smootherstep departure weight. Position, heading, limb pose and walking amplitude transition together:

- standing pose at the initial frame;
- subtle idle movement only when reduced motion is off;
- gradual turn toward the trail;
- smooth convergence into the existing guide-led line;
- full walking cycle after the party clears the bus.

No traveler teleports, overlaps the coach, slides across the ground or begins by walking in place.

## Progress and camera choreography

The new opening occupies only the early portion of the existing `mountain-trek` phase. Later expedition boundaries remain unchanged.

- Progress `0.000–0.045`: parked-coach establishing view and standing party.
- Progress `0.045–0.120`: departure across the clearing and entry into the foothill path.
- Progress `0.120–0.280`: established mountain trek leading to the existing shoreline handoff.
- Progress `0.280–1.000`: retain the current mountain-to-water, water, forest and contact boundaries exactly.

The camera uses three continuous opening beats:

1. **Trailhead establishing frame** — low three-quarter view containing the complete coach and all four travelers.
2. **Departure frame** — camera tracks the group as the coach recedes and the path begins to rise.
3. **Mountain entry frame** — the existing mountain-follow composition takes over as the ridges fill the view.

Camera position and target use the existing smootherstep rail and damping rules. The transition into the current mountain camera must remain below the established camera-jump limit and must not snap when the user scrolls quickly or uses the menu.

Desktop uses the cinematic keyframe rail. Mobile receives an explicit opening composition that contains the complete coach and party, then blends into the existing mobile trekking-party framing.

## Component boundaries

- `terrain.js` owns the additional shared trailhead landmarks and opening-height contract.
- A focused trailhead builder owns the clearing, surface details and collision/clearance metadata.
- A focused coach builder owns coach geometry, materials and disposal-ready root data.
- `hillWorld.js` connects the trailhead terrain to the existing mountain route.
- `trekkingParty.js` owns standing positions, idle pose and standing-to-walking formation blending.
- `expeditionController.js` stages the bus opening without adding another transport or biome.
- `journeyData.js` owns the added opening camera keyframes while preserving later phase boundaries.
- `indiaJourney.js` owns desktop/mobile camera blending and QA evidence.

Builders expose deterministic metadata so tests can inspect ground contact, clearances, staging positions and camera targets without depending on screenshots alone.

## Reduced motion and fallback behavior

Reduced-motion mode:

- keeps the coach stationary;
- removes secondary idle sway;
- retains scroll-controlled position and formation changes;
- uses the same continuous camera path with reduced secondary movement.

If WebGL initialization or context recovery fails, the existing CSS fallback remains responsible for the experience. The bus opening does not introduce an independent fallback or external asset dependency.

## Testing and acceptance

Automated tests verify:

- the coach contains the required body, glazing, wheels, mirrors, lights, open door and entry steps;
- the coach is planted on the trailhead surface and does not intersect the travelers or walking route;
- the clearing blends continuously into the mountain terrain;
- exactly one guide and three tourists occupy distinct standing positions at zero progress;
- standing positions blend monotonically into the walking route;
- boots remain planted during staging and departure;
- the party does not walk in place at zero progress;
- the bus is not present in expedition transport weights;
- the transport order remains trekker → boat → jeep;
- mountain-to-water, water and forest progress boundaries remain unchanged;
- all biome roots remain continuously mounted;
- desktop and mobile opening camera movement stays within the camera-jump limit;
- no audio element or sound control is introduced;
- disposal remains complete and idempotent.

Desktop and mobile visual QA capture:

- parked-coach establishing frame;
- travelers beside the coach;
- departure into the foothill path;
- first full mountain composition.

Acceptance requires:

- the complete bus and all four travelers are readable in the opening;
- no top-of-mountain opening angle;
- no vehicle or traveler clipping;
- no hard scene switch, camera snap or terrain pop;
- no flat decorative platform or monument styling;
- a smooth open-space-to-mountain progression;
- no regressions in the existing mountain, water, forest or retained business-content scenes.
