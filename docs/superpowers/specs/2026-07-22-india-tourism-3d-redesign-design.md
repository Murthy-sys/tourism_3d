# India Tourism 3D Redesign

## Objective

Redesign the existing Wanderlux tourism-management portal around a cinematic, tourism-focused 3D hero inspired by the immersive presentation quality of Sébastien Lempens' portfolio. Retain the existing content sections and booking flow. The result must feel like an original Indian tourism journey, not a copy of the reference site's Paris setting or proprietary assets.

## Approved Direction

Use a curated, low-poly “India in miniature” diorama as the opening experience. The journey begins in South India and travels north through representative landmarks and landscapes. The existing marquee, services, destinations, statistics, testimonials, booking, and footer sections remain in place and receive a matching visual redesign.

The experience prioritizes cinematic composition, depth, lighting, camera movement, and environmental motion. A conventional hero with a decorative 3D object is not sufficient.

## Journey

The scroll-driven route is:

1. Kerala backwaters
2. Tamil temple architecture
3. Hampi and the Deccan
4. Goa coast
5. Mumbai and the Gateway of India
6. Rajasthan desert and forts
7. Agra and the Taj Mahal
8. Varanasi ghats
9. Himalayan finale

This is a curated regional story rather than an exhaustive model of every Indian attraction. The existing destinations section carries the broader tourism catalogue.

## Opening Experience

### Preloader and Entry Gate

- Retain the current loading and sound-entry sequence.
- Restyle it as a premium travel departure screen.
- Preserve a clear sound choice and an immediate way to enter.
- Do not block the experience longer than asset loading requires.

### Three-Dimensional Hero

- Fill the viewport with an original Three.js low-poly India diorama.
- Begin over Kerala at warm sunrise and move north as the page scrolls.
- Use a guided camera. Pointer movement provides restrained parallax but no free-flight controls.
- Connect regions with a visible travel route and a small explorer vehicle or equivalent travel motif.
- Use environmental motion such as water, mist, birds, foliage, flags, and distant atmospheric particles.
- Present concise regional checkpoints with a destination name, one supporting line, and an “Explore destination” action.
- Keep the portal name, sound control, menu, scroll cue, and booking action as minimal overlays.
- Conclude in the Himalayas, then transition smoothly into the conventional page sections.

### Visual Language

- Use cinematic sunrise-to-dusk lighting with strong foreground, middle-ground, and background separation.
- Move through Himalayan blue, sandstone gold, tropical green, river blue, and coastal dusk tones while keeping the full scene cohesive.
- Favor low-poly forms with carefully controlled materials and shadows.
- Use typography and translucent interface panels sparingly so the 3D world remains primary.
- Do not reuse, trace, hotlink, or approximate the reference site's proprietary character, city, landmark models, or artwork.

## Retained Portal Sections

Keep the existing page order and functionality:

1. Marquee
2. Services
3. Destinations
4. Statistics
5. Testimonials
6. Booking
7. Footer

Restyle these sections with the hero's design system: sandstone and twilight colors, subtle glass surfaces, map and route motifs, cinematic reveals, and appropriate depth. Preserve readable content, clear calls to action, and the existing tourism-management purpose.

Destination checkpoint actions in the 3D hero should connect to the relevant destination content in the existing page rather than introduce new routes or backend behavior.

## Technical Architecture

### Scene Modules

Replace the current monolithic hero scene with focused modules:

- Scene shell: renderer, camera, lights, resize handling, lifecycle, and quality settings.
- Regional scenes: South India, Deccan and Goa, West and North, Ganges, and Himalayas.
- Landmark primitives: reusable architecture, terrain, water, vegetation, transport, and atmosphere components.
- Journey controller: scroll progress, camera path, checkpoint activation, palette changes, and transition into page content.
- Overlay layer: labels, progress, controls, and calls to action rendered as accessible HTML.

Each module must have one clear responsibility and be disposable without leaking event listeners, animation frames, or GPU resources.

### State and Data Flow

- Treat normalized scroll progress as the source of truth for journey state.
- Derive camera position, camera target, active region, atmosphere, overlay copy, and route progress from that value.
- Keep landmark and checkpoint data declarative so labels and section links are not embedded in rendering logic.
- Preserve React ownership of interface state such as the loader phase, sound setting, navigation, and reduced-motion mode.

### Performance

- Cap renderer pixel ratio.
- Reuse geometry and materials and instance repeated objects where practical.
- Keep texture use limited and optimized; prefer geometry and gradients where visually appropriate.
- Lazy-initialize noncritical effects.
- Reduce object density, shadows, particles, and post-processing on small or low-power devices.
- Pause rendering when the page is hidden and clean up every Three.js resource on unmount.
- Maintain smooth interaction on common desktop hardware and a stable simplified experience on mobile.

## Responsive and Accessible Behavior

- Desktop receives the full guided 3D journey.
- Mobile retains the same route and art direction with a shorter camera path and reduced scene complexity.
- All interactive overlays must be keyboard accessible and use visible focus states.
- Respect `prefers-reduced-motion` with minimal camera movement and nonessential motion disabled.
- If WebGL initialization fails, render a polished static cinematic fallback while keeping navigation, destination links, and booking usable.
- Maintain sufficient text contrast against every scene state.

## Error Handling

- Keep the current page usable if a 3D asset or optional effect fails.
- Display the static fallback if renderer creation fails or context is lost and cannot be restored.
- Avoid loader deadlocks by completing entry after a bounded wait even when an optional asset fails.
- Report development-time scene failures clearly in the console without exposing technical errors to visitors.

## Verification

Before handoff:

- Run the production build.
- Check the entry gate, sound toggle, menu, scroll journey, every checkpoint action, retained content sections, and booking form.
- Verify desktop and mobile layouts.
- Verify reduced-motion and WebGL fallback behavior.
- Check for console errors, resource leaks, layout overflow, text contrast, cropped content, and broken focus order.
- Compare the rendered hero against the approved reference qualities: full-screen composition, meaningful depth, cinematic lighting, environmental motion, minimal overlays, and smooth guided camera travel.
- Treat broken interactions, severe frame drops, missing scene regions, unreadable overlays, or a conventional non-immersive hero as release-blocking defects.

## Scope Boundaries

- No backend or new booking-management features.
- No exhaustive 3D model of every Indian tourism spot.
- No new routes unless required to preserve an existing link.
- No proprietary reference assets.
- No uncontrolled free-roaming game mechanics.
- No visual redesign unrelated to the tourism journey or retained sections.

## Acceptance Criteria

The redesign is accepted when:

1. The existing portal sections and booking interaction remain available.
2. The opening experience presents a continuous South-to-North Indian tourism journey.
3. The hero visibly includes the approved regional sequence and a travel-route motif.
4. Scroll drives a smooth, guided 3D camera and matching content checkpoints.
5. The experience has cinematic depth, lighting, atmosphere, and environmental motion comparable in ambition to the reference.
6. Desktop, mobile, reduced-motion, and WebGL-fallback experiences are usable.
7. The production build passes and primary interactions work without console errors.
