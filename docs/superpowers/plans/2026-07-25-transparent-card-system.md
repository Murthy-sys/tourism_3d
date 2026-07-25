# Transparent Card System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one fully transparent, compact, theme-consistent style to every card while keeping full-screen overlay and navigation fills intact.

**Architecture:** Add a shared `chapter--glass-card` class to Who We Are journey articles and consolidate card-surface transparency in CSS. Retain component-specific layout rules while normalizing typography through responsive clamps and shared font roles.

**Tech Stack:** React 18, CSS, Vitest, Testing Library.

## Global Constraints

- Every card background is `transparent`.
- Full-screen overlays, modal backdrops, menus, and navigation retain their fills.
- Who We Are uses the same glass-card structure as other journey cards.
- Typography remains readable at desktop and mobile widths.

---

### Task 1: Pin card classes and CSS behavior

**Files:**
- Modify: `src/components/ChapterContent.test.jsx`
- Modify: `scripts/visual-qa.test.js`

- [ ] Assert initial Who We Are and creator beats both use `chapter--glass-card`.
- [ ] Assert CSS contains a shared transparent-card selector and preserves filled `.booking-overlay` and `.journey-menu` rules.
- [ ] Run focused tests and confirm failure before implementation.

### Task 2: Apply the shared transparent system

**Files:**
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/index.css`

- [ ] Add `chapter--glass-card` to all non-contact operations content and retain it on the boating offer card.
- [ ] Make journey, social-performance, package, service, destination, testimonial, and form card surfaces transparent.
- [ ] Keep full-screen overlays/navigation filled.
- [ ] Consolidate borders, blur, radius, and shadows without changing layout behavior.
- [ ] Tighten heading, body, label, and list sizes using desktop/mobile `clamp()` values and the existing display/body faces.

### Task 3: Verify

**Files:**
- Verify: all modified files

- [ ] Run `npm test -- src/components/ChapterContent.test.jsx scripts/visual-qa.test.js`.
- [ ] Run `npm test`.
- [ ] Run `git diff --check` and inspect the scoped diff for accidental overlay-background changes.
