# Mountain–Water–Forest Journey — Design Specification

## Objective

Rebuild the cinematic expedition as one uninterrupted, realistic landscape in this exact order:

1. Natural mountain and hill country
2. Reflective water corridor
3. Dense forest

The journey must reveal upcoming environments well before the traveler reaches their boundary. Transitions must feel geographically continuous and visually smooth, with no hard world switches, late pop-in, or vehicle crossing unsuitable terrain.

## Retained experience

- Retain the full-screen cinematic journey, menu, Who We Are, plans, trip routes, booking, and contact experiences.
- Retain the existing copy and overlay interactions unless a scene-order label must change for accuracy.
- Retain desktop and mobile support.
- Retain the current no-audio behavior and omit sound controls.
- Visual quality remains more important than performance optimization.

## Removed experience

- Remove every monument and monument-specific path obstruction from the expedition.
- Remove the Ambassador car from the cinematic journey.
- Remove the car-to-jeep handoff.
- Remove icy, snowy, Himalayan, or artificial cone-mountain imagery.
- Remove abrupt visibility toggles that hide the next biome until the camera is close.

## Continuous-world layout

All three biomes coexist in a shared coordinate system and remain renderable throughout the journey. Broad transition belts overlap their geometry, vegetation, lighting, fog, and color palettes.

### Mountain opening

- The opening view begins inside natural green hill country with broad ridges, irregular rock faces, valleys, saddles, and atmospheric background layers.
- Terrain uses multiple scales of deterministic displacement rather than cone-shaped primitives.
- Grass, soil, exposed rock, bushes, scattered trees, loose stones, mist pockets, and trail-edge vegetation create natural surface detail.
- A guide leads three tourists along a terrain-following trail.
- The distant water corridor is visible from mountain overlooks before the trekking party reaches the landing.

### Mountain-to-water transition

- The trekking trail descends gradually toward a visible shoreline landing.
- Hill slopes flatten into wet banks, rocks, reeds, mud, and shallow water.
- Terrain, trekking party, boat, and water remain simultaneously visible across the handoff.
- The camera follows a shared shoreline landmark while the active traveler blends from trekking party to boat.
- Trekker opacity, boat opacity, camera target, fog, exposure, and movement speed use synchronized smoothstep curves.

### Water journey

- Use a believable river or elongated lake, not a flat blue plane.
- Add animated surface normals or layered wave deformation, environment reflections, Fresnel response, depth coloring, shoreline shallows, foam and wake accents, wet rocks, reeds, bank shadows, and reflected sky/terrain colors.
- Retain the realistic teal rowing boat and articulated rowing motion.
- Use curved banks and foreground shoreline elements to give the water scale and depth.
- Dense forest silhouettes and canopy layers become visible down the water corridor well before the boat reaches the forest landing.

### Water-to-forest transition

- Water narrows gradually into a forest inlet.
- Reeds, roots, wet stones, overhanging branches, and increasingly dense vegetation bridge the environments.
- Boat, landing, shoreline, forest, and waiting jeep remain simultaneously visible through the handoff.
- The boat docks at a physical landing and the traveler continues in the jeep.
- Camera position, target, fog, lighting, exposure, and travel speed blend across a wide transition range without a cut or sudden reveal.

### Dense forest finale

- The jeep is the only road vehicle in the journey.
- Build a dense, layered forest with irregular trunks, branching silhouettes, multiple canopy heights, vines, ferns, shrubs, ground cover, fallen timber, rocks, puddles, damp soil, sun shafts, and low mist.
- Vary vegetation scale, rotation, tint, species silhouette, and clustering so it does not resemble repeated rows or decorative cards.
- Keep the jeep path unobstructed while surrounding it with near, mid, and far vegetation layers.
- The ending content and contact destination remain integrated with the forest journey without introducing monument geometry.

## Visibility and transition rules

- Do not use binary biome visibility toggles during expedition travel.
- Keep all biome roots active; manage prominence through distance, fog, level of detail, material weight, and camera composition.
- Extend camera far plane and environmental bounds enough for the next biome to be recognizable from the current biome.
- Use large overlap zones rather than transitions triggered only at the boundary.
- Use continuous smoothstep or smootherstep curves for world weight, vehicle handoff, camera rail, target rail, lighting, fog, and exposure.
- Preserve continuous forward motion and prevent camera snapping when menu navigation changes progress.
- Prewarm or compile scene materials before the journey starts so first entry into water or forest does not visibly stall.

## Vehicle and traveler sequence

The sequence is fixed:

1. Guide and three tourists trek through the mountain zone.
2. The party reaches the shoreline and hands off to the rowing boat.
3. The boat travels through the water corridor and docks at the forest inlet.
4. The jeep continues through the dense forest.

Only the active transport receives primary framing. Inactive transports remain staged at their physical handoff location and fade naturally without moving through incompatible terrain.

## Architecture

- Reorder the journey state and chapter mapping to mountain → water → forest.
- Replace legacy monument and Ambassador dependencies in the expedition path.
- Keep focused builders for terrain, water, forest, trekking party, boat, and jeep.
- Add shared transition-landmark data so environment builders, transport routes, and camera rails use the same landing coordinates.
- Expose deterministic transition weights and QA snapshots for vehicle visibility, biome visibility, camera continuity, and distant next-biome visibility.
- Dispose replaced geometry and materials cleanly when the journey unmounts.

## Error handling and fallbacks

- If advanced water shader features are unavailable, use a layered physically based water material that preserves reflection, depth color, ripples, and shoreline contrast.
- If high-density vegetation must be reduced on mobile, preserve foreground detail, canopy silhouette, transition landmarks, and distant biome visibility before reducing secondary background instances.
- WebGL context loss continues to use the existing fallback experience.

## Testing and acceptance

- Unit tests verify the exact mountain → water → forest order.
- Tests verify the active sequence is trekking party → boat → jeep and that Ambassador/monument expedition weights are absent.
- Transition tests verify continuous weights, overlap duration, physical landing alignment, and camera continuity.
- Visibility tests verify water is visible before the mountain landing and forest is visible before the water landing.
- Terrain tests reject cone-like profiles and verify trail conformance for the guide and tourists.
- Water tests verify reflective/depth materials, surface motion, shoreline shallows, and boat wake.
- Forest tests verify minimum near/mid/far vegetation density, variation, and a collision-free jeep route.
- Existing menu, plans, routes, booking, contact, reduced-motion, mobile, and no-audio tests remain green.
- Desktop and mobile visual QA must capture the mountain opening, distant water reveal, mountain-to-water handoff, water corridor, distant forest reveal, water-to-forest handoff, and dense forest finale.
- Acceptance requires no monuments, no Ambassador car, no hard biome pop, no late biome reveal, no vehicle crossing unsuitable terrain, no camera snap, no obvious repeated vegetation rows, no flat/artificial water appearance, no artificial cone hills, and no console errors.
