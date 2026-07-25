# Packages and Contact Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Packages as a menu destination for the existing package card and add one final Contact card containing the Sanchari Kannadiga identity, two separate WhatsApp actions, and the existing Instagram link.

**Architecture:** Split the current final chapter interval into `packages` and `contact` chapters without changing the underlying Three.js contact phase. Render the new contact chapter through a focused `ContactCard` component that reuses the existing transparent card classes; keep the existing package rendering and booking overlay unchanged.

**Tech Stack:** React 18, JavaScript, CSS, Vitest, Testing Library

## Global Constraints

- Do not redesign or alter existing UI.
- The new Contact destination must render all contact details in one card.
- Packages must navigate to the existing “Where should we take you next?” card.
- Contact must navigate to the new final card.
- Keep Plan a Trip visually unchanged and route it to Packages.
- Preserve the package booking form, primary booking number, and prepared package message.
- Use separate WhatsApp actions for `7204033032` and `7358369538`.
- Reuse the confirmed `@sanchari.kannadiga` Instagram profile.

---

### Task 1: Split Packages and Contact Journey Destinations

**Files:**
- Modify: `src/journey/chapters.js`
- Test: `src/journey/chapters.test.js`

**Interfaces:**
- Produces: `packages` chapter over `.94 <= progress < .975`.
- Produces: final `contact` chapter over `.975 <= progress <= 1`.

- [ ] Write failing tests expecting chapter IDs `home`, `who-we-are`, `plans`, `packages`, `contact`, exact contiguous boundaries, Packages title “Where should we take you next?”, and Contact as the final chapter.
- [ ] Run `npx vitest run src/journey/chapters.test.js` and verify the tests fail because Packages is absent.
- [ ] Rename the existing package chapter to `packages`, end it at `.975`, and add the final `contact` chapter using layout `contact-card`.
- [ ] Run `npx vitest run src/journey/chapters.test.js` and verify all chapter tests pass.

### Task 2: Add the Single Contact Card

**Files:**
- Create: `src/components/ContactCard.jsx`
- Create: `src/components/ContactCard.test.jsx`
- Modify: `src/components/ChapterContent.jsx`
- Test: `src/components/ChapterContent.test.jsx`

**Interfaces:**
- Produces: `buildContactWhatsAppUrl(number): string`.
- Produces: `ContactCard` with one root article containing identity and all three external destinations.

- [ ] Write failing component tests for the exact visible identity, both phone labels, exact international `wa.me` numbers, encoded general enquiry, Instagram profile URL, and `target="_blank"` plus `rel="noreferrer"`.
- [ ] Write a failing ChapterContent test proving `contact-card` renders one Contact article and Packages continues to render all five existing package cards.
- [ ] Run `npx vitest run src/components/ContactCard.test.jsx src/components/ChapterContent.test.jsx` and verify RED.
- [ ] Implement `ContactCard` using the existing `chapter`, `chapter--operations`, and `chapter--glass-card` classes. Render the identity as the heading and place both WhatsApp links plus Instagram inside one action container.
- [ ] Route `chapter.layout === 'contact-card'` from `ChapterContent` to `ContactCard`.
- [ ] Run the focused tests and verify GREEN.

### Task 3: Wire Menu Navigation

**Files:**
- Modify: `src/components/JourneyShell.jsx`
- Test: `src/components/JourneyShell.test.jsx`
- Test: `src/components/JourneyMenu.test.jsx`

**Interfaces:**
- Consumes: chapter IDs `packages` and `contact`.
- Keeps: existing `JourneyMenu` rendering and visual structure.

- [ ] Add failing tests that click Packages and Contact and assert distinct `onSelect` IDs.
- [ ] Add a failing JourneyShell test proving Plan a Trip requests the Packages destination.
- [ ] Run `npx vitest run src/components/JourneyMenu.test.jsx src/components/JourneyShell.test.jsx` and verify RED.
- [ ] Change only the JourneyShell Plan a Trip destination from `contact` to `packages`; CHAPTERS automatically supplies the new Packages and Contact menu items.
- [ ] Run the focused tests and verify GREEN.

### Task 4: Preserve Styling and Verify

**Files:**
- Modify only if necessary: `src/index.css`

**Interfaces:**
- Reuses: existing transparent glass-card system without altering existing selectors.

- [ ] Render the Contact card with existing classes first; add only a narrowly scoped action-row rule if the links are unreadable without it.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check`.
- [ ] Inspect mobile and desktop at Packages and Contact progress values, confirming separate menu destinations and one complete Contact card.
- [ ] Leave implementation changes uncommitted for user deployment verification.
