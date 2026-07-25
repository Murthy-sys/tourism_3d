# Boat What We Offer Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the pre-boating paired brand cards with one standard “What We Offer” journey card visible from progress `0.42` through `0.74`.

**Architecture:** Export named offer-card progress boundaries from journey data. `ChapterContent` keeps the creator card through the end of Who We Are, renders one standard glass card inside the Plans chapter during the boat interval, and preserves Social Media Performance from `0.88`. Remove unused reasons data and align browser-QA states with the new water-corridor placement.

**Tech Stack:** React 18, CSS, Vitest, Testing Library, Playwright visual-QA fixtures.

## Global Constraints

- The card interval is `0.42 <= progress < 0.74`.
- Retain all nine `BRAND_CAPABILITIES`.
- Remove “Why Brands Should Work With Us” and `BRAND_REASONS`.
- Preserve the Social Media Performance boundary at `0.88`.

---

### Task 1: Pin the new data and rendering behavior

**Files:**
- Modify: `src/journey/chapters.test.js`
- Modify: `src/components/ChapterContent.test.jsx`

- [ ] Add failing assertions for exported `BOAT_OFFER_START === .42` and `BOAT_OFFER_END === .74`, absence of `BRAND_REASONS`, creator-card retention at `.26`, offer-card absence at `.419999`, presence at `.42` and `.739999`, and absence at `.74`.
- [ ] Assert the boating card uses the standard `chapter--creator-card` treatment, renders all `BRAND_CAPABILITIES`, and never renders “Why Brands Should Work With Us”.
- [ ] Run `npm test -- src/journey/chapters.test.js src/components/ChapterContent.test.jsx` and confirm the new assertions fail for missing boundaries and old paired-card behavior.

### Task 2: Implement the single boating card

**Files:**
- Modify: `src/journey/chapters.js`
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/index.css`

- [ ] Export `BOAT_OFFER_START=.42` and `BOAT_OFFER_END=.74`.
- [ ] Delete `BRAND_REASONS` and remove `brandValue` from the Who We Are chapter.
- [ ] Keep the creator beat active from `.22` through the end of Who We Are.
- [ ] In the Plans branch, render one article while `progress>=BOAT_OFFER_START&&progress<BOAT_OFFER_END` with classes `chapter chapter--operations chapter--creator-card chapter--boat-offer`, kicker `Brand collaborations`, heading `What We Offer`, concise body copy, and an `operations-proof` list sourced from `BRAND_CAPABILITIES`.
- [ ] Remove obsolete paired-card CSS and add only focused positioning rules for `.chapter--boat-offer`, reusing the existing creator-card and operations-proof styles.
- [ ] Run the focused component/data tests and confirm they pass.

### Task 3: Align visual QA and verify

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `scripts/visual-qa.test.js`

- [ ] Remove `BRAND_REASONS`, paired-card snapshot data, paired-card DOM geometry checks, and the obsolete brand-card capture at `.26`.
- [ ] Add “What We Offer” content to the `water-corridor` snapshot at `.50`, using `BRAND_CAPABILITIES` and the standard creator-card flag.
- [ ] Update source-level QA assertions to require the boating offer state and reject the removed reasons title/data.
- [ ] Run `npm test -- src/journey/chapters.test.js src/components/ChapterContent.test.jsx scripts/visual-qa.test.js`.
- [ ] Run `npm test`, then `git diff --check` and inspect the scoped diff.
