# Realistic Journey Models — Design Specification

## Objective

Replace the current stylized procedural retro car, boat, and trekker with high-detail, fully three-dimensional assets. The result must preserve the existing cinematic India journey, environmental transitions, interface, written content, menu, and booking experience while materially increasing realism.

## Approved visual direction

### Opening car

- Match the foreground vehicle in `amb1.jpeg`: a modern white retro EV rather than the classic Ambassador behind it.
- Use a glossy pearl-white body, smooth closed grille, circular LED headlamps, black panoramic roof, dark glazing, realistic rubber tires, and silver disc-style wheels.
- Preserve the existing moving-car role, traveller visibility, wheel rotation, route following, and Ambassador-to-jeep handoff.

### Water transport

- Match `boat3d.jpeg` in composition while increasing realism.
- Use a teal open rowing boat with visible hull thickness, seating, gunwales, fittings, and wet-surface response.
- Include a seated traveller wearing an orange top and operating two oars with teal shafts and orange blades.
- Animate a believable rowing cycle: shoulders, elbows, hands, torso, and oars move together while the boat rocks subtly and follows the existing water route.

### Trekker

- Match `trekker 3d.jpeg` in silhouette and palette while increasing anatomical, fabric, and equipment detail.
- Use a yellow technical shirt, dark trekking shorts or trousers appropriate to the ice environment, purple backpack, rolled sleeping mat, hiking shoes, and a natural wooden walking stick.
- Use a rigged walking animation with alternating arm and leg motion, planted feet, body weight shift, backpack follow-through, and walking-stick contact timing.

## Asset strategy

- Source royalty-free or permissively licensed GLTF/GLB base assets from reputable libraries.
- Record each external asset's source URL, author, and license in an attribution document.
- Prefer complete high-resolution assets with PBR texture sets: base color, normal, roughness, metallic, and ambient occlusion where available.
- Adapt materials, proportions, colors, accessories, and animation to the approved references. Do not place the supplied JPEGs directly in the experience.
- If no suitable licensed model exists for a specific subject, build or combine detailed original geometry without lowering the visual target.

## Runtime architecture

- Add a dedicated asset loader with shared caching and predictable model URLs.
- Keep each subject behind the existing creation/update interface so the expedition controller and journey state remain stable.
- Normalize model scale, forward axis, origin, shadows, and material color space at load time.
- Display the current procedural subject only while its detailed replacement is loading or if loading fails. A failed external asset must not break the journey.
- Preload all three detailed assets from the entry gate so they are ready before their chapters become visible.

## Lighting and integration

- Enable cast and receive shadows on appropriate meshes.
- Tune car clearcoat and glass for the opening environment without making the body mirror-like.
- Tune the boat for wet reflections and retain the existing wake system.
- Add snow response and cool rim lighting to the trekker while retaining readable clothing colors.
- Preserve current desktop and mobile framing, adjusting model-local offsets only where necessary.

## Animation and transitions

- Retain route progress and all staged vehicle handoffs.
- Car wheels rotate from distance travelled; steering orientation follows route curvature where the asset supports it.
- Boat rowing is synchronized to travel and becomes restrained when reduced-motion is requested.
- Trekker uses a looped rig animation or a procedural rig update with stick planting synchronized to footsteps.
- Reduced-motion mode retains readable poses and route movement without secondary oscillation.

## Quality requirements

- No flat billboards or JPEG cutouts.
- No card-based substitutes for the three subjects.
- All subjects remain real 3D objects under scene lighting and camera parallax.
- Materials must avoid obvious stretching, missing textures, inverted normals, or low-resolution blur at the existing camera distance.
- The visual upgrade must not remove or simplify the jungle, water, ice, monument, menu, text, plans, contact, or booking experiences.

## Testing and acceptance

- Unit tests verify model contracts, named anchors, route compatibility, animation state, and fallback behavior.
- Loader tests verify success, caching, and failure fallback.
- Desktop and mobile visual QA capture the opening car, water boat, ice trekker, and each handoff.
- Acceptance requires no console errors, no horizontal overflow, working menu and booking flows, and zero background-audio controls.
- External asset attribution and licensing records must be present before the models are committed for release.

## Out of scope

- Changes to journey copy, chapter order, menu structure, booking fields, or environmental audio.
- Replacing the jungle jeep unless required solely to keep the car-to-jeep handoff visually coherent.
- Reintroducing any background sound or sound controls.
