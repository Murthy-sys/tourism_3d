# XYZ Travellers | Tourism Management Site

A React + Vite site with a continuous Three.js travel journey: descend from clouds to
a busy city, board a coach, travel to the mountain trailhead, trek through hills,
follow a winding river, drive through forest, then step out at
a waterfall viewpoint. The final travel quote appears before the demo contact details.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Structure

- `src/App.jsx`: loading, Start gate, cloud arrival, and journey lifecycle.
- `src/components/`: scene canvas, chapter content, menu, and local enquiry form.
- `src/journey/chapters.js`: chapter timing, packages, finale quote, and contact reveal.
- `src/journey/scrollTimeline.js`: distance-weighted native scrolling and reversible menu destinations.
- `src/three/`: environment geometry, vehicles, people, cameras, and animation.
- `src/three/cityWorld.js`: batched city architecture, commuters, boarding and traffic.
- `src/three/cityCrowd.js`: anatomical city pedestrians sharing the preloaded traveller assets.
- `src/three/cityJourney.js`: coach route, road contact samples, camera and departure timing.
- `src/three/journeySpatial.js`: extended river and forest coordinates without scaling scenery.
- `src/three/finaleConfig.js`: waterfall location, viewpoint, and finale timing.
- `src/three/realisticTravellers.js`: shared skinned human asset, pose adaptation, and asset lifetime.
- `src/three/realisticVehicles.js`: leased detailed bus/jeep assets with independent materials and wheel assemblies.
- `src/three/natureAssets.js`: shared, locally hosted PBR surface and HDR sky loading.
- `src/three/scenePreparation.js`: cancellable texture uploads and complete journey GPU preparation before Start.
- `src/journey/journeyFonts.js`: local font loading and document-level font reuse.
- `src/three/riverConfig.js`: irregular river cross sections shared by water and terrain.
- `src/three/naturalWater.js`: throttled planar landscape reflections over physical water materials.
- `src/three/staticScenery.js`: spatial batching of repeated scenery while preserving query proxies.
- `src/three/forestWildlife.js`: grounded roaming deer and boar using textured anatomical models.
- `src/three/realisticWildlife.js`: leased wildlife downloads with timeout and shared texture ownership.
- `src/three/wildlifeRig.js`: gentle skeletal motion and terrain contact for the wildlife assets.
- `public/models/`: locally hosted people, vehicles and wildlife with source/license details.
- `public/textures/nature/`: optimized CC0 surface maps, foliage, and HDRs with source attribution.
- `src/data.js`: brand and dummy contact details.
- `src/index.css`: responsive styling.

## Notes

- Contact details are inert demo placeholders. `BookingOverlay.jsx` previews enquiries
  locally without sending them or opening an external messaging account.
- Swap `src/data.js` content and the accent color in `src/index.css` (`--accent`) to rebrand.
- The waterfall stop uses the existing four jeep riders. Scroll reversal returns them
  to their seats; reduced motion keeps all stages accessible without decorative motion.
- Vehicles turn toward their actual route movement on scroll reversal. The final
  hillside encloses the viewpoint, with a carved outflow beyond the travellers.
- Start stays locked until all human, vehicle, wildlife, landscape, sky and font
  assets are loaded, decoded and prepared for rendering. The loading screen shows
  completed work; failed downloads offer Retry without opening an incomplete scene.
  A 120-second inactivity watchdog resets whenever bytes arrive, allowing slow
  downloads to finish. Abandoned downloads and preparation work are cancelled.
- Before Start, the renderer uploads textures and prepares eleven representative
  journey states, including shadows, reflections and passenger transitions. The
  initial scene is restored before the first visible frame and readiness signal.
  Restoration preserves authored rotation angles and order so later character
  animations retain their original facing direction.
- The gate and page shell load independently of the 3D engine, so loading feedback
  can paint before the larger scene modules arrive.
- The introduction begins above the clouds, pitches down continuously, and arrives at
  the city boulevard. Four travellers board before the same coach follows a 5.6 m
  access road to the existing mountain stop. Asphalt and shoulders follow the terrain
  triangles; cached wheel-contact samples set the coach height, pitch and roll.
- Opening stages are city (0–.025), boarding (.025–.045), drive (.045–.105),
  trailhead (.105–.14), and trek departure (.14–.19). Scrolling backward restores each stage.
- The city uses ten detailed people on desktop and six on mobile, including four
  boarding travellers. They share the existing human geometry and textures, with
  independent clothes, grounded walking poses and reduced-motion support.
- Compact local textures and models are the default. Limited hardware adjusts scene
  detail while retaining the complete scenery, including the compact sky panorama.
  `node scripts/prepare-compact-assets.mjs` rebuilds these variants
  from the full assets without a runtime decoder: nature maps total 1.20 MiB and the
  rigged traveller is 2.65 MiB. Missing browser hints retain compact downloads.
- Native scrolling spans 27.2 viewport heights of travel, with extra distance for
  the coach, river and forest. Wheel/touch follows the native position with a short
  220 ms ease, then stops instead of draining a queue of travel. Deliberate chapter
  seeks retain their paced transitions. Copy follows rendered progress.
- Native scroll is the single position source. Wheel/touch interrupts a menu seek;
  manual input never creates a long automatic chapter journey.
  Camera anchors exclude walking and boat bobbing, and a delayed frame advances
  motion by at most 50 ms while quality adaptation still measures actual frame time.
- Bebas Neue and variable Manrope are served locally and decoded before Start.
  Original SIL Open Font License notices are included in `public/fonts/`.
- Device capability controls scene detail independently of viewport camera composition.
  Desktop and mobile resolution adapt after sustained frame pressure. Hidden scenes,
  the waiting start gate, and settled reduced-motion views stop continuous rendering.
- Traveller textures are sized for the web. To rebuild from the original licensed
  GLB on macOS, run `node scripts/prepare-traveller.mjs /path/to/source.glb`.
- Detailed vehicles merge static parts and use native glTF mesh quantization, with
  a lighter bus interior on mobile. `scripts/prepare-vehicles.mjs` rebuilds the
  optimized GLBs; provenance and license details are in `public/models/LICENSE.txt`.
- Nature surfaces use photographed albedo, normal and roughness maps. Rebuild the
  optimized texture package with `node scripts/prepare-nature-assets.mjs /path/to/source`.
  Source asset pages and licenses are listed in `public/textures/nature/LICENSE.txt`.
- The boat route spans 104 m with a 14–16 m main channel continuing beyond both docks, muted
  freshwater shading, shallow gravel edges and advected currents. The forest drive
  spans 92 m before the waterfall clearing. Trees and vehicles retain their size. Water,
  gravel bars, hills and forest use the same shoreline sampler to avoid overlapping layers.
- Trees reuse six branching growth forms and instanced distant groves, with denser
  understory and four woodland animals walking around protected clearings. Their
  distance-driven gait plants each hoof through the stance, with alternating lifted
  steps, smooth turns and staggered pauses. Reduced motion holds them still.
  Static scenery is spatially batched.
- Full green crowns combine photographed leafy shoots and overlapping inner foliage
  while preserving the existing triangle budgets and camera/road clearances.
- The boat is present at its dock before boarding and stays at the far dock after
  arrival. Only passengers transition between travel stages. The complete waterfall
  remains present independently of chapter progress, with natural distance haze.
- The wildlife uses licensed deer and boar meshes with embedded coat, normal and
  roughness maps, totalling about 1.25 MiB. `scripts/prepare-wildlife.mjs` rebuilds
  the optimized models; author credits and CC BY 4.0 terms are in `public/models/LICENSE.txt`.
  Failed wildlife downloads keep Start locked and offer Retry, avoiding primitive substitutes.
- Water captures real scenery at 384 px / 15 Hz on desktop and 192 px / 8 Hz on mobile,
  with at most one reflection capture per frame across all surfaces. Stationary views
  refresh less often; normal ripples continue at the render rate. Shared textures and
  reflection targets are disposed on exit.
- Water normals use cached analytic wave derivatives, avoiding a triangle-normal rebuild
  every frame. River and waterfall sightlines have terrain/vegetation regression coverage.
- Run `npm test` for unit/integration coverage. `scripts/visual-qa.mjs` includes
  city, boarding, road, river, forest and waterfall capture states. `QA_STATE` accepts
  a comma-separated selection; `QA_REDUCED_MOTION=1` captures deterministic static
  views, while the default verifies frame-to-frame camera continuity. `QA_BASE_URL`
  selects the running dev or production preview and `QA_OUTPUT_DIR` selects the output.
