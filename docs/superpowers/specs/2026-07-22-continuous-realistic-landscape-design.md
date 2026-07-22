# Continuous Realistic Landscape — Design Specification

## Objective

Replace the abrupt forest-to-water and water-to-mountain switches with one visually continuous expedition landscape. Increase environmental density and realism, replace the icy cone-shaped mountains with lush realistic Indian hill country, and expand the single trekker into a guide-led tourist group.

## Scope retained

- Retain the current opening car, jungle jeep, upgraded teal rowboat, interface, menu, plans, contact experience, and booking flow. Update only snow/Himalaya-specific plan copy so it accurately describes lush hill country.
- Retain staged transport handoffs, but make each handoff occur at a visible physical location inside the continuous landscape.
- Retain the complete removal of background audio and sound controls.
- Visual quality takes priority over performance optimization.

## Continuous landscape

The expedition environments will coexist as connected zones inside one coordinate system instead of appearing and disappearing as isolated scene groups.

### Forest zone

- Use a dense layered canopy with varied trunks, branches, leaf clusters, undergrowth, vines, ferns, fallen timber, rocks, damp soil, puddles, and low mist.
- Vary tree scale, rotation, color, crown silhouette, and spacing to avoid repeated rows.
- Keep the jeep route readable while surrounding it with foreground and background vegetation.

### Forest-to-water transition

- The mud track gradually becomes wetter and narrower.
- Tree density reduces near the water while reeds, wet rocks, roots, and marsh vegetation increase.
- A timber landing and shoreline provide a physical jeep-to-boat handoff.
- Forest, shoreline, water, jeep, and boat remain simultaneously visible through the transition range.

### Water zone

- Preserve the upgraded teal rowing boat, seated orange-clad rower, articulated oars, and wake.
- Improve water depth cues with layered reflections, subtle wave deformation, shoreline shallows, wet rocks, reeds, and bank shadows.
- Shape the water as a river/lake corridor that leads toward the hill valley rather than a disconnected flat plane.

### Water-to-hills transition

- Water gradually narrows toward a river landing.
- Banks rise progressively into grass-covered slopes and exposed rock.
- Tree species and density shift from wet shoreline vegetation to hill forest.
- A second landing provides the boat-to-trek handoff.
- Water, valley, hills, boat, guide, and tourists remain simultaneously visible through the transition range.

## Realistic hill country

- Remove the snow, glacier, drifting snow, icy shelter, and cone-based peaks.
- Build continuous terrain from displaced grid geometry with multiple noise scales and deterministic shaping.
- Use broad foothills, irregular ridgelines, saddles, valleys, steep faces, and distant overlapping hill layers.
- Blend grass, dark soil, and exposed rock through slope- and height-aware vertex colors or layered materials.
- Add scattered bushes, hill trees, grass clumps, rocks, and mist pockets with density variation.
- Create a winding trail that conforms to the terrain surface and leads to a hill lodge/contact destination.
- Use atmospheric perspective: distant hills are lighter, cooler, and less contrasty than foreground slopes.

## Trekking party

- Replace the single trekker with a party of four people.
- One guide leads the group and is visually distinct through clothing, pack, and confident forward posture.
- Three tourists follow at varied route offsets and spacing.
- Each person has individual clothing colors, backpack details, walking phase, stride length, body sway, and pole timing.
- The group follows the same trail while maintaining natural separation through curves.
- Feet and poles follow sampled terrain height so nobody floats above or clips through the slope.
- Reduced-motion mode preserves walking progression but removes secondary sway and exaggerated limb motion.

## Transition system

- Replace binary world visibility with continuous per-zone opacity, fog, density, and camera-target blending.
- Use smoothstep easing for forest-to-water and water-to-hills transition weights.
- Preserve route progress and current chapter timing unless small timing extensions are needed to make handoffs readable.
- Camera positions and targets interpolate through shared landmarks rather than jumping between world origins.
- Lighting, fog color, background color, and exposure blend continuously between zone palettes.

## Architecture

- Add a deterministic terrain utility for height sampling, surface creation, and trail placement.
- Add a landscape controller that owns all three connected zones and exposes transition weights.
- Split hill terrain, vegetation, and trekking-party construction into focused modules.
- Preserve existing vehicle update interfaces so car, jeep, and boat logic does not need unrelated rewrites.
- Preserve named scene anchors used by unit and visual QA.

## Error handling and fallbacks

- If advanced terrain material features are unavailable, fall back to vertex-colored standard materials while retaining terrain geometry.
- If shadows are unavailable, preserve form through directional lighting, ambient occlusion-like vertex darkening, and fog depth.
- A WebGL context loss continues to invoke the existing fallback behavior.

## Testing and acceptance

- Unit tests verify deterministic terrain heights, non-conical hill profiles, connected zone bounds, smooth transition weights, and trail height conformance.
- Trekking tests verify four members, one guide, three tourists, unique animation phases, stable spacing, and terrain-following feet/poles.
- Existing vehicle, boat, menu, booking, and no-audio tests remain green.
- Desktop and mobile visual QA captures both handoffs, the water corridor, the hill reveal, the trekking party, and contact lodge.
- Acceptance requires no hard world pop, no visible snow/ice environment, no cone-shaped mountains, no floating trekkers, no horizontal overflow, and no console errors.
