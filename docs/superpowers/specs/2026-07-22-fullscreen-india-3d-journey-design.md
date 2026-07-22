# Full-Screen India Tourism 3D Journey

## Status

This specification supersedes `2026-07-22-india-tourism-3d-redesign-design.md`. The prior decision to retain conventional webpage sections is withdrawn. The portal becomes one continuous full-screen 3D tourism experience.

## Objective

Rebuild the WanderLux tourism-management portal as an immersive, scroll-driven India journey matching the presentation model of `https://sebastien-lempens.com/`: a preloader, start gate, continuous 3D world, guided camera, content presented inside the world, character/vehicle transitions, a compact visual menu, sound control, and a cinematic ending.

The implementation must use original Indian tourism scenery and must not copy proprietary models, characters, artwork, branding, or source code from the reference.

## Reference Experience Requirements

The reference audit established these required patterns:

1. A character/vehicle-led 3D preloader.
2. A start gate recommending sound and desktop.
3. A full-screen opening vista with no conventional header.
4. A guided camera that advances through the world with scroll.
5. Introductory typography integrated into the environment.
6. An About panel staged at a meaningful physical location.
7. Character and vehicle movement connecting chapters.
8. Skills/services represented as a dedicated physical zone.
9. Work/projects presented within the same 3D world.
10. A Contact and credits finale.
11. Only menu and sound controls remain fixed.
12. A compact menu provides direct chapter navigation.

## India Tourism Journey

### Chapter 1: Preloader

- Show a stylized traveller moving across an India route line with regional silhouettes appearing behind them.
- Display real loading progress when possible and a bounded fallback when optional assets fail.
- Include subtle award-style trust marks only if the portal has legitimate corresponding credentials; otherwise show tourism categories such as Heritage, Nature, Culture, and Adventure.

### Chapter 2: Start Gate

- Present “Begin your journey through India”.
- Offer sound on/off before entry.
- Recommend desktop for the richest experience without blocking mobile.
- Use landmark silhouettes to preview the route from South India to the Himalayas.

### Chapter 3: Home / South India Opening

- Open on a cinematic Kerala backwater environment at sunrise.
- Include water, palms, a houseboat, temple silhouette, atmospheric sky, and a traveller character.
- Display the WanderLux identity and a short tourism-management promise.
- Keep the menu and sound controls at the upper-right edge; do not display a conventional navbar.

### Chapter 4: Who We Are

- Move the camera to a staged South Indian heritage location.
- Present a translucent, framed content panel physically aligned with the scene.
- Explain who WanderLux is, the portal’s India focus, its travel-management role, and traveller support.
- Place the traveller and vehicle beside the panel to make the chapter part of the world rather than a webpage overlay.

### Chapter 5: What We Do

- Transition through the environment with the traveller vehicle.
- Enter a physical “Travel Services Zone”.
- Represent services as landmarks, signs, gates, or environmental installations:
  - Curated tour packages
  - Stays and transport
  - Visa and documentation
  - Local guides and concierge
  - Custom itineraries
  - Group and corporate travel
- Reveal service detail on focus, hover, or chapter progression.

### Chapter 6: Travel Plans

- Present tourism plans as large physical 3D displays within the world.
- Include at least three plans:
  - Southern Discovery
  - Heritage India
  - Himalayan Adventure
- Each plan shows duration, representative destinations, trip style, and a “Plan this journey” action.
- Selecting a plan opens the booking overlay with the destination/plan prefilled.

### Chapter 7: Trip Routes

- Make the South-to-North route the central travel sequence:
  1. Kerala
  2. Tamil Nadu
  3. Hampi and the Deccan
  4. Goa
  5. Mumbai
  6. Rajasthan
  7. Agra
  8. Varanasi
  9. Himalayas
- Move the camera and traveller continuously through representative low-poly environments.
- Display concise location names and one supporting line inside each environment.
- Provide route progress and allow the menu to jump to the route chapter.

### Chapter 8: Stories and Trust

- Present traveller stories, service statistics, and support promises as objects or displays in the world.
- Use the existing testimonial content after adapting it to Indian routes.
- Keep text short enough to read without stopping the journey for long periods.

### Chapter 9: Booking Overlay

- Open booking as a full-screen cinematic overlay above the still-running 3D world.
- Dim and blur the world without unloading it.
- Include name, email, selected plan/destination, dates, travellers, and message.
- Preserve form validation, success confirmation, reset behavior, keyboard access, focus containment, Escape-to-close, and return focus.
- The overlay can open from plans, routes, the menu, or the finale.

### Chapter 10: Contact and Finale

- End in the Himalayas at blue hour with the traveller looking over the landscape.
- Present contact action, booking action, tourism support details, credits, and privacy/legal links.
- Keep the finale inside the 3D experience; do not append a conventional footer.

## Fixed Interface

- Show only a compact menu control and sound control during the journey.
- The menu opens as a cinematic overlay while the 3D scene remains visible beneath it.
- Menu chapters:
  - Home
  - Who We Are
  - What We Do
  - Plans
  - Trip Routes
  - Stories
  - Plan a Trip
  - Contact
- Selecting a chapter animates the camera/progress to that chapter and closes the menu.
- The logo may appear within the Home scene, but it must not become a conventional persistent header.

## Architecture

### Journey Controller

- One normalized progress model drives camera position, camera target, traveller animation, chapter activation, environment visibility, and overlay content.
- Menu navigation animates this same progress model rather than scrolling to separate HTML sections.
- Chapter metadata remains declarative and maps IDs to progress ranges, menu labels, environment groups, and accessible titles.

### Scene Structure

- Scene shell owns the renderer, camera, lighting, fog, resize lifecycle, quality settings, context loss, pause/resume, and cleanup.
- Environment groups own South India, services, plans, route regions, stories, and Himalayas.
- Reusable primitives own terrain, water, vegetation, buildings, signs, route lines, displays, traveller, and vehicle.
- An HTML interface layer owns accessible chapter copy, menu, sound, booking, focus management, and fallback content.

### State

- React owns entry state, sound, menu state, booking state, selected plan, reduced-motion state, fallback state, and active chapter.
- Three.js owns render objects and time-based animation but receives state through a narrow scene API.
- Opening or closing menu/booking pauses scroll-driven progress without destroying the scene.

## Responsive and Accessibility

- Desktop receives the complete guided world and traveller animation.
- Mobile receives the same chapters with a shortened route, reduced geometry, reduced particles, and simpler camera movement.
- Respect `prefers-reduced-motion` with direct chapter fades and minimal camera travel.
- Menu and booking overlays must trap focus, close with Escape, expose labels, and restore focus.
- Chapter text must remain available in semantic HTML even when visually integrated with the 3D world.
- Provide a cinematic static or reduced 2D fallback if WebGL is unavailable.
- Maintain readable contrast against every environment state.

## Performance

- Cap renderer pixel ratio at 2 on desktop and 1.25 on mobile.
- Reuse geometry/materials and instance repeated objects.
- Keep custom models and textures compressed and locally hosted.
- Lazy-activate distant environment groups.
- Pause rendering when hidden and reduce rendering while static overlays are open.
- Dispose all GPU resources, observers, and event listeners on unmount.
- Code-split the 3D experience from the entry shell where practical.

## Error Handling

- Optional scene details must not block entry.
- Renderer failure or unrecoverable context loss switches to the fallback experience while preserving menu and booking.
- Booking validation remains local and clearly identifies invalid fields.
- The preloader completes after a bounded wait even when an optional asset fails.

## Verification

- Verify the full sequence: preloader, gate, Home, Who We Are, What We Do, Plans, Trip Routes, Stories, booking overlay, Contact, and finale.
- Verify direct menu navigation to every chapter.
- Verify sound, pointer/touch behavior, traveller transitions, route progress, plan selection, booking prefill, booking validation, success, reset, and close behavior.
- Capture and compare desktop screenshots at every chapter against the reference’s presentation qualities.
- Capture and inspect mobile at 390×844.
- Verify keyboard navigation, focus containment, Escape behavior, reduced motion, WebGL fallback, contrast, and semantic chapter content.
- Run automated tests and production build.
- Treat conventional page sections, a conventional navbar/footer, missing chapters, static decorative-only 3D, broken menu jumps, unreadable overlays, or broken booking as release-blocking defects.

## Scope Boundaries

- No backend booking system.
- No payment processing.
- No unrestricted driving/game controls.
- No copying of reference assets or code.
- No conventional sections, header navigation, or footer after entry.
- No exhaustive model of every Indian attraction.

## Acceptance Criteria

1. The portal is one continuous full-screen 3D journey.
2. The only fixed journey controls are menu and sound.
3. All approved content chapters appear inside the experience.
4. The journey visibly starts in South India and travels north.
5. Who We Are, What We Do, Plans, Trip Routes, Stories, Booking, and Contact are present and usable.
6. Booking opens as a full-screen cinematic overlay and preserves current form behavior.
7. Menu navigation animates directly to every chapter.
8. Desktop, mobile, reduced-motion, and WebGL-fallback modes are usable.
9. Automated tests and production build pass.
10. Visual QA confirms the experience follows the reference’s full-screen storytelling model without proprietary copying.
