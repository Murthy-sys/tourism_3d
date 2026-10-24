# XYZ Travellers | Tourism Management Site

A React + Vite site with a continuous Three.js travel journey: descend from clouds to
the coach, trek through hills, cross the river, drive through forest, then step out at
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
- `src/three/`: environment geometry, vehicles, people, cameras, and animation.
- `src/three/finaleConfig.js`: waterfall location, viewpoint, and finale timing.
- `src/three/realisticTravellers.js`: shared skinned human asset, pose adaptation, and asset lifetime.
- `src/three/realisticVehicles.js`: leased detailed bus/jeep assets with independent materials and wheel assemblies.
- `src/three/natureAssets.js`: shared, locally hosted PBR surface and HDR sky loading.
- `src/three/riverConfig.js`: irregular river cross sections shared by water and terrain.
- `src/three/naturalWater.js`: throttled planar landscape reflections over physical water materials.
- `public/models/`: locally hosted traveller model and its CC0 source/license details.
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
- The Start gate waits for detailed assets and the first rendered scene. Individual
  asset failures retain local procedural fallbacks; a 12-second asset deadline prevents a stuck gate.
- The gate and page shell load independently of the 3D engine, so loading feedback
  can paint before the larger scene modules arrive.
- The introduction begins above the clouds, pitches down continuously, and arrives at
  the coach beside a 5.6 m access road. Its asphalt and shoulders follow the exact terrain triangles.
- Phones, limited hardware, Data Saver, and slow connection hints select compact local
  textures and models. `node scripts/prepare-compact-assets.mjs` rebuilds these variants
  from the full assets without a runtime decoder: nature maps total 1.20 MiB and the
  rigged traveller is 2.65 MiB. Missing browser hints retain the normal desktop budget.
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
- The river widens to approximately 34–39 m across its main reach, with blue depth
  shading, shallow gravel edges and advected currents. Water,
  gravel bars, hills and forest use the same shoreline sampler to avoid overlapping layers.
- Trees reuse six branching growth forms and instanced distant groves. Water captures
  real scenery at 512 px / 20 Hz on desktop and 256 px / 10 Hz on mobile; normal ripples
  continue at the render rate. Shared textures and reflection targets are disposed on exit.
- Water normals use cached analytic wave derivatives, avoiding a triangle-normal rebuild
  every frame. River and waterfall sightlines have terrain/vegetation regression coverage.
- Run `npm test` for unit/integration coverage. `scripts/visual-qa.mjs` includes
  `waterfall-disembark`, `waterfall-quote`, and `waterfall-contact` capture states.
