# Stylized-Realism Transport and People — Design Specification

## Objective

Upgrade the bus, trekking party, boat, jeep, and all visible occupants so they
read as a cohesive cinematic travel scene rather than a collection of toy-like
procedural objects. Preserve the current journey, camera behavior, transitions,
content, and interaction while materially improving form, proportion, surface
response, posing, and motion.

## Approved visual direction

Use polished cinematic stylized realism. Shapes remain clean and optimized for
real-time rendering, but their construction and behavior must be believable.
Avoid photorealistic texture density, exaggerated cartoon proportions, and
simple primitives that visibly stand in for finished anatomy or vehicle parts.

Use the
[Quaternius Animated Men Pack](https://quaternius.com/packs/animatedmen.html)
only as an art-direction reference for:

- readable human silhouettes;
- natural adult proportions;
- simplified but complete facial and anatomical forms;
- clean clothing layers;
- clear joint articulation; and
- smooth, readable animation.

Do not copy, download, import, redistribute, or modify the Quaternius models.
All delivered people and vehicles remain original project assets.

## Scope and preserved behavior

The visual upgrade covers:

- the parked premium tourist coach;
- the guide and three tourists at the trailhead and on the trek;
- the rowing boat, guide/rower, and three tourists;
- the jungle jeep, guide/driver, and three tourists; and
- subject-specific shadows, materials, contact, and secondary motion.

Preserve:

- the existing trailhead → mountain → water → forest journey;
- the current chapter ranges and transport handoffs;
- one guide and exactly three tourists throughout the journey;
- existing route curves, subject-locked camera system, and mobile safe-card
  placement;
- reduced-motion behavior;
- customer-facing copy, cards, menu, booking, and contact flows; and
- current synchronous model creation without an external runtime asset
  dependency.

## Shared art system

### Shape language and scale

Use softened manufactured forms for vehicles and clean, lightly simplified
anatomy for people. Major silhouettes must be correct before small details are
added. Vehicle wheel size, ground clearance, glass area, seating position, and
occupant scale must remain plausible relative to one another.

Human proportions should use approximately seven to seven-and-a-half heads of
height. Heads, hands, and feet may be enlarged only slightly for readability at
the existing camera distance. Avoid oversized spherical heads, capsule-only
torsos, floating limbs, and passengers scaled down to fit incorrect interiors.

### Materials

Use restrained physical materials with role-specific roughness:

- painted vehicle panels use subtle clearcoat and moderate roughness;
- rubber, fabric, skin, hair, wood, glass, and metal remain visibly distinct;
- large surfaces receive gentle color or roughness variation;
- glass has visible thickness or layered framing and does not resemble a flat
  opaque blue panel;
- skin and clothing stay mostly matte; and
- saturated accent colors remain controlled so the subjects do not resemble
  plastic toys.

All primary meshes cast appropriate shadows. Vehicle bodies, wheels, feet, and
the boat hull receive shadows or contact cues appropriate to their environment.

### Detail hierarchy

Spend geometry where it affects the silhouette or explains construction.
Secondary details should reinforce scale: seams, handles, mirrors, wipers,
lights, steps, rails, fittings, straps, collars, cuffs, and shoe soles. Tiny
details that cannot survive the active camera distance are out of scope.

## People system

Build one reusable articulated person factory with role, clothing palette,
equipment, pose, and animation options. It should create original characters
that share an art direction without looking duplicated.

Each person includes:

- shaped head, jaw, ears, nose, and restrained eye forms;
- neck, shoulders, torso, pelvis, upper/lower arms, elbows, hands, upper/lower
  legs, knees, and feet;
- hairstyle variation and optional facial hair;
- layered jacket or shirt, trousers or shorts, and shoes with soles;
- role-appropriate equipment such as backpacks, roll mats, or walking poles;
  and
- named articulation pivots required by walking, standing, rowing, driving,
  and seated poses.

The guide and three tourists retain distinct palettes and silhouettes. Vary
height, build, hair, clothing layers, pack shapes, and resting pose within a
narrow range so they remain one believable group.

### Poses and motion

Standing poses use asymmetrical weight distribution, relaxed elbows, varied
head direction, and planted feet. Walking uses alternating hip and shoulder
motion, bent knees and elbows, restrained vertical bounce, stable head motion,
pack follow-through, and walking-pole timing. Feet should not visibly skate at
representative QA states.

Seated occupants bend at the hips and knees, align with bench or seat height,
and keep feet and hands in plausible positions. Do not achieve fit by uniformly
shrinking complete passengers.

The rower coordinates torso lean, shoulders, elbows, hands, and oars through
one rowing phase. The jeep driver maintains a stable seated pose with hands
aligned to the steering wheel and subtle body response to vehicle motion.

Reduced-motion mode keeps complete, natural poses and route movement while
removing gait bounce, rowing exaggeration, and secondary oscillation.

## Premium tourist coach

Retain the existing overall length, role, location, open door, and wheel contact
contract. Refine the coach into a believable modern premium Indian tourist bus:

- curved front mask, windscreen surround, roof transition, and rear treatment;
- shaped lower body, wheel arches, fenders, and bumpers;
- separate headlamp, running-light, tail-light, grille, and registration areas;
- properly proportioned tires, recessed rims, hubs, and wheel wells;
- framed side glazing with believable pillar spacing;
- mirrors with support arms, windscreen wipers, handles, panel seams, and
  luggage-door divisions;
- a dimensional open entry, threshold, and stairwell; and
- a restrained visible interior with driver area, steering wheel, dashboard,
  and seat silhouettes where the camera can see through the glass.

Keep the current cream, charcoal, and bronze identity, but lower the visual
uniformity with controlled roughness differences and darker recessed areas.

## Rowing boat

Retain the teal open-boat identity, two oars, wake, current route, and water
handoff. Refine it with:

- a genuinely hollow hull silhouette with visible wall thickness;
- shaped bow, stern, keel line, gunwales, ribs, floor, and benches;
- oarlocks, collars, fittings, and better shaft/blade transitions;
- damp lower-hull response and restrained edge wear;
- one articulated guide/rower and three naturally seated tourists;
- varied passenger clothing and poses; and
- believable waterline, soft contact shadowing, wake origin, roll, and pitch.

The hull must not resemble a solid extruded block. Passengers must remain
readable without appearing miniature relative to the boat.

## Jungle jeep

Retain the open expedition-jeep identity, four occupants, spare wheel, roll
cage, forest route, and wheel animation. Replace the box-stack silhouette with:

- shaped hood, grille, windscreen frame, cabin tub, rear body, and bumpers;
- distinct fenders and wheel arches around larger off-road tires;
- visible underbody clearance and restrained suspension components;
- headlights, tail lights, handles, hinges, mirrors, and tow points;
- dimensional seats, dashboard, steering wheel, and footwell;
- canvas roof and roll cage with believable supports;
- a correctly seated guide/driver and three correctly scaled tourists; and
- a rear spare wheel mounted with plausible hardware.

Wheel rotation continues to derive from distance travelled. Add restrained
suspension and occupant response without introducing arcade-like bouncing.

## Architecture

Keep the existing public model and controller contracts stable. Make focused
internal improvements:

- extract shared stylized-person construction and pose helpers into a dedicated
  module;
- let trekking, boat, jeep, and trailhead staging configure the shared person
  factory rather than maintaining unrelated human implementations;
- keep coach geometry isolated in `tourCoach.js`;
- keep boat and jeep builders behind their existing
  `createExpeditionBoat`/`createExpeditionJeep` interfaces;
- expose named joints and contact anchors through `userData`;
- reuse materials and geometries where doing so does not create unwanted visual
  duplication; and
- dispose shared resources through the existing scene teardown path.

No network request or asynchronous model loader is required for these original
procedural assets.

## Performance and responsive detail

Desktop uses the full silhouette and construction detail. Mobile may reduce
radial segments and omit non-silhouette micro-details, but it must preserve:

- correct proportions;
- complete anatomy and jointed poses;
- vehicle-defining parts;
- distinct material classes;
- one guide and three tourists; and
- natural ground, seat, and water contact.

Reuse geometry and material instances where safe, avoid per-frame allocations
in animation updates, and keep animation work limited to named pivots. Existing
adaptive pixel-ratio behavior remains unchanged.

## Testing

### Unit coverage

Extend tests to verify:

- the shared person factory creates complete named articulation and role data;
- each travel stage exposes one guide and three tourists;
- coach, boat, and jeep retain their current root names and required
  `userData` contracts;
- new wheels, seats, steering, oars, and contact anchors exist;
- walking, rowing, and vehicle updates change the intended pivots;
- reduced-motion updates preserve natural poses without secondary motion;
- wheel/ground, foot/ground, occupant/seat, and boat/water offsets remain
  within defined tolerances; and
- mobile and desktop quality modes preserve required silhouette parts.

### Visual QA

Capture desktop and mobile frames for:

- the trailhead establishing view;
- the party standing beside the open coach;
- the walking party;
- the trek-to-boat handoff;
- the active rowing boat;
- the boat-to-jeep handoff; and
- the active forest jeep.

Review each frame for plausible scale, recognizable silhouettes, complete
occupant count, natural poses, contact, material separation, shadow quality,
camera clearance, card clearance, and intersections. A subject still reading
as a toy, blockout, or collection of primitives is release-blocking.

Run the full unit suite, production build, and existing interaction/visual QA.
Menu, cards, booking, contact, scrolling, mobile layout, and reduced-motion
behavior must not regress.

## Out of scope

- Photorealistic scanned people or vehicles.
- Importing the referenced Quaternius models.
- Adding a runtime asset download pipeline.
- Replacing the environment, camera system, chapter order, or written content.
- Adding audio, narration, or new controls.
- Increasing detail that is invisible at the journey's active camera distance.
