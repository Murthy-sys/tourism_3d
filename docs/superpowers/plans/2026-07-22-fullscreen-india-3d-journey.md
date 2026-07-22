# Full-Screen India Tourism 3D Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the section-based portal with one continuous, menu-navigable 3D India tourism journey containing all business, plan, route, story, booking, and contact content.

**Architecture:** A declarative chapter model maps every experience chapter to a normalized journey range, content payload, menu item, and scene group. React owns entry, sound, menu, booking, focus, fallback, and active chapter state; a narrow Three.js API owns the guided camera, traveller, vehicle, environments, lighting, and animation. Semantic HTML overlays are staged to look physically integrated with the world while remaining keyboard accessible.

**Tech Stack:** React 18, Three.js 0.160, Vite 5, Vitest, Testing Library, Playwright, CSS, WebGL.

## Global Constraints

- Supersede the retained-sections implementation; do not render conventional Services, Destinations, Stats, Testimonials, Booking, or Footer sections after the journey.
- Show only menu and sound as fixed journey controls.
- Include Home, Who We Are, What We Do, Plans, Trip Routes, Stories, Plan a Trip, and Contact.
- Booking opens as a full-screen cinematic overlay above the live scene.
- Preserve the approved South-to-North route and current booking fields/success behavior.
- Use original assets and procedural geometry; do not copy reference assets or code.
- Keep desktop, mobile, reduced-motion, and WebGL fallback modes usable.
- This workspace is not a Git repository; use verification checkpoints instead of commit steps until Git is initialized.

---

### Task 1: Declarative Chapter and Plan Model

**Files:**
- Create: `src/journey/chapters.js`
- Create: `src/journey/chapters.test.js`
- Modify: `src/three/journeyData.js`

**Interfaces:**
- Produce `CHAPTERS`, `TRAVEL_PLANS`, `getChapterAtProgress(progress)`, and `getProgressForChapter(id)`.
- A chapter is `{ id, menuLabel, title, kicker, body, progressStart, progressEnd, scene, layout, cta }`.

- [ ] **Step 1: Write failing tests for the complete experience order**

```js
expect(CHAPTERS.map((chapter) => chapter.id)).toEqual([
  'home', 'who-we-are', 'what-we-do', 'plans',
  'trip-routes', 'stories', 'contact',
])
expect(TRAVEL_PLANS.map((plan) => plan.id)).toEqual([
  'southern-discovery', 'heritage-india', 'himalayan-adventure',
])
expect(getChapterAtProgress(0).id).toBe('home')
expect(getChapterAtProgress(1).id).toBe('contact')
expect(getProgressForChapter('plans')).toBeGreaterThan(0)
```

- [ ] **Step 2: Run `npm test -- src/journey/chapters.test.js`**

Expected: FAIL because the chapter module does not exist.

- [ ] **Step 3: Implement chapter ranges and tourism content**

Use non-overlapping ranges covering `0` through `1`. Include complete Who We Are copy, six service items, three plans, nine route stops, three adapted traveller stories, support statistics, and Contact/booking actions. Keep copy concise enough for a cinematic overlay.

- [ ] **Step 4: Verify `npm test -- src/journey/chapters.test.js`**

Expected: all chapter-model tests PASS.

---

### Task 2: Expand the World into Experience Zones

**Files:**
- Modify: `src/three/primitives.js`
- Modify: `src/three/regions.js`
- Modify: `src/three/regions.test.js`
- Create: `src/three/experienceZones.js`

**Interfaces:**
- Produce `createExperienceZones(materials, quality)` returning named groups `home`, `about`, `services`, `plans`, `routes`, `stories`, and `contact`.
- Add reusable `createSign`, `createDisplay`, `createTraveller`, `createVehicle`, `createRouteGate`, and `createStoryMonument` factories.

- [ ] **Step 1: Extend regional tests to require every experience zone**

```js
expect(createExperienceZones(createMaterials(), 'desktop').children.map((group) => group.name)).toEqual([
  'home', 'about', 'services', 'plans', 'routes', 'stories', 'contact',
])
```

Assert mobile contains fewer meshes than desktop and every zone remains present.

- [ ] **Step 2: Run `npm test -- src/three/regions.test.js`**

Expected: FAIL because experience-zone builders do not exist.

- [ ] **Step 3: Implement the zones**

- Home: Kerala water, palms, houseboat, traveller, sunrise.
- About: South Indian heritage staging area with a framed panel anchor and parked vehicle.
- Services: six physical service markers in a “Travel Services Zone”.
- Plans: three large display structures with plan-specific symbols.
- Routes: reuse the complete South-to-North regional sequence and animated route line.
- Stories: three story monuments plus statistics/trust markers.
- Contact: Himalayan overlook with traveller, route endpoint, and contact-panel anchor.

- [ ] **Step 4: Verify scene contracts**

Run: `npm test -- src/three/regions.test.js && npm run build`

Expected: scene tests PASS and the production build succeeds.

---

### Task 3: Chapter-Aware Renderer and Traveller Transitions

**Files:**
- Modify: `src/three/indiaJourney.js`
- Modify: `src/three/indiaJourney.test.js`

**Interfaces:**
- Extend the scene API with `goTo(progress, { duration })`, `setOverlayOpen(boolean)`, and `getProgress()`.
- `goTo` animates the same normalized progress used by scroll.

- [ ] **Step 1: Write failing renderer-controller tests**

Test that `goTo(0.5)` clamps its destination, overlay-open reduces or pauses progress updates, `getProgress()` reports the current value, and reduced motion uses duration `0`.

- [ ] **Step 2: Run `npm test -- src/three/indiaJourney.test.js`**

Expected: FAIL because the API lacks chapter navigation.

- [ ] **Step 3: Implement guided navigation**

Use one internal `targetProgress`. `setProgress` updates it from scrolling; `goTo` eases it from the current value; opening menu or booking freezes scroll input but keeps a low-frequency render for ambient motion. Animate the traveller walking in staged chapters and riding during route transitions.

- [ ] **Step 4: Verify renderer tests and disposal**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: renderer tests PASS with no leaked timers or event listeners.

---

### Task 4: Remove Conventional Layout and Build the Journey Shell

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Hero.jsx`
- Modify: `src/components/Hero3D.jsx`
- Create: `src/components/JourneyShell.jsx`
- Create: `src/components/ChapterContent.jsx`
- Create: `src/components/JourneyShell.test.jsx`

**Interfaces:**
- `JourneyShell` owns progress, active chapter, menu, booking, and scene API.
- `ChapterContent({ chapter, onPlan, onBook })` renders semantic chapter content.

- [ ] **Step 1: Write failing shell tests**

```jsx
render(<JourneyShell soundOn={false} />)
expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
expect(screen.getByRole('button', { name: 'Open journey menu' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: /sound/i })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: /Journey through India/i })).toBeInTheDocument()
```

Also assert conventional `#services`, `#destinations`, `#testimonials`, and `footer` elements are absent.

- [ ] **Step 2: Run `npm test -- src/components/JourneyShell.test.jsx`**

Expected: FAIL because the current App still renders conventional components.

- [ ] **Step 3: Implement the shell and remove old rendering**

Keep Preloader and IntroGate phases, then render only `JourneyShell`. Use one tall journey track with a sticky viewport. Derive the active chapter from progress and render content variants for Home, About, Services, Plans, Routes, Stories, and Contact.

- [ ] **Step 4: Verify shell behavior**

Run: `npm test -- src/components/JourneyShell.test.jsx`

Expected: the continuous journey renders and conventional sections are absent.

---

### Task 5: Compact Visual Menu and Sound Controls

**Files:**
- Replace: `src/components/Navbar.jsx` with `src/components/JourneyMenu.jsx`
- Modify: `src/components/SoundToggle.jsx`
- Create: `src/components/JourneyMenu.test.jsx`

**Interfaces:**
- `JourneyMenu({ open, activeId, onOpen, onClose, onSelect, onBook })`.
- `onSelect(id)` calls the renderer’s chapter progress navigation.

- [ ] **Step 1: Write failing menu tests**

Assert the closed state shows only the menu button; opening shows Home, Who We Are, What We Do, Plans, Trip Routes, Stories, Plan a Trip, and Contact; selecting a chapter calls `onSelect` and closes; Escape closes and returns focus.

- [ ] **Step 2: Run `npm test -- src/components/JourneyMenu.test.jsx`**

Expected: FAIL because the compact journey menu does not exist.

- [ ] **Step 3: Implement the reference-inspired visual menu**

Use icon-like line marks with labels over a dimmed live scene. Do not render a horizontal header or persistent logo. Keep sound control beneath the menu control on desktop and alongside it on mobile.

- [ ] **Step 4: Verify menu behavior**

Run: `npm test -- src/components/JourneyMenu.test.jsx`

Expected: menu interaction and focus tests PASS.

---

### Task 6: Full-Screen Cinematic Booking Overlay

**Files:**
- Refactor: `src/components/Booking.jsx`
- Create: `src/components/BookingOverlay.jsx`
- Create: `src/components/BookingOverlay.test.jsx`

**Interfaces:**
- `BookingOverlay({ open, initialPlan, initialDestination, onClose })`.
- Preserve current fields and success/reset behavior.

- [ ] **Step 1: Write failing booking-overlay tests**

Assert hidden state is absent, open state has `role="dialog"` and `aria-modal="true"`, selected plan is prefilled, Escape closes, focus stays inside, close returns focus, required fields validate, submission shows “Request received.”, and reset restores the form.

- [ ] **Step 2: Run `npm test -- src/components/BookingOverlay.test.jsx`**

Expected: FAIL because booking is currently an ordinary section.

- [ ] **Step 3: Implement the overlay**

Keep the live canvas mounted beneath a dark blurred layer. Use a two-column cinematic composition on desktop and one-column scrollable dialog on mobile. Pause journey input while open.

- [ ] **Step 4: Verify booking behavior**

Run: `npm test -- src/components/BookingOverlay.test.jsx`

Expected: booking overlay tests PASS.

---

### Task 7: Reference-Matched Entry, Content Styling, and Fallback

**Files:**
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/IntroGate.jsx`
- Modify: `src/index.css`
- Modify: `src/App.test.jsx`

- [ ] **Step 1: Extend entry and fallback tests**

Assert preloader tourism categories, “Begin your journey through India”, sound choice, desktop recommendation, WebGL fallback chapter content, and absence of conventional footer/header.

- [ ] **Step 2: Run the targeted tests and verify failure**

Run: `npm test -- src/App.test.jsx src/components/JourneyShell.test.jsx`

- [ ] **Step 3: Implement the full visual replacement**

Remove old section, navbar, card-grid, and footer presentation from the active experience. Add letterboxed cinematic framing, spatial typography, framed translucent panels, physical-zone labels, traveller/vehicle transition states, compact edge controls, visual-menu overlay, booking overlay, responsive styling, and reduced-motion rules.

- [ ] **Step 4: Verify the full suite and build**

Run: `npm test && npm run build`

Expected: all tests PASS and production build succeeds.

---

### Task 8: Full Reference-Sequence Visual QA

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Update: `design-qa.md`

- [ ] **Step 1: Capture desktop chapters at 1440×900**

Capture preloader, gate, Home, Who We Are, What We Do, Plans, Trip Routes, Stories, menu open, booking open, booking success, Contact, and finale.

- [ ] **Step 2: Compare each accepted capture against the reference qualities**

Verify full-screen composition, camera-led movement, scene-integrated content, traveller continuity, compact edge controls, menu presentation, no conventional sections, and cinematic ending.

- [ ] **Step 3: Capture mobile at 390×844**

Verify every chapter, menu, booking, route progress, no horizontal overflow, readable text, and reduced geometry.

- [ ] **Step 4: Verify interactions and accessibility**

Test direct menu jumps, sound, plan prefill, booking validation/success/reset/close, focus containment, Escape, reduced motion, and WebGL fallback.

- [ ] **Step 5: Fix all P0–P2 findings and repeat capture**

Update `design-qa.md` only after recapture. The final line must be `final result: passed`; otherwise do not claim completion.

- [ ] **Step 6: Run the final release gate**

Run: `npm test && npm run build && node scripts/visual-qa.mjs desktop && node scripts/visual-qa.mjs mobile`

Expected: tests pass, build succeeds, every browser assertion is true, no application console errors occur, and `design-qa.md` says `final result: passed`.
