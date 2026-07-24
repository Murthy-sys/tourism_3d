# Post-Creator Brand Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-creator scroll beat containing a prominent top-left What We Offer card and bottom-right Why Brands Should Work With Us card.

**Architecture:** The chapter model owns both cards’ exact content. `ChapterContent` selects overview, creator, or brand-value markup by progress, while CSS handles the desktop diagonal and mobile stacked compositions. The browser QA corpus validates the new timing, exact DOM content, card positions, clipping, and runtime integrity.

**Tech Stack:** React 18, Vitest, Testing Library, Vite, Playwright, CSS.

## Global Constraints

- Keep the Who We Are chapter range at `.14–.28` and Plans starting at `.28`.
- Keep the overview at `<.22`, creator card at `.22–.25`, and paired cards at `.25–.28`.
- Reuse the exact nine `BRAND_CAPABILITIES` for What We Offer.
- Render exactly six approved brand reasons in order.
- Desktop: What We Offer top-left and Why Brands Should Work With Us bottom-right.
- Mobile: the same cards stack in that order with readable responsive type.
- Preserve all 3D, camera, transport, audio, menu, creator-card, Plans, and Contact behavior.

---

### Task 1: Model and render the third operations beat

**Files:**
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/components/ChapterContent.test.jsx`

**Interfaces:**
- Produces: `BRAND_REASONS: string[]`.
- Produces: `chapter.brandValue.offer` and `chapter.brandValue.reasons`, each with `title` and `items`.
- Renders: `.chapter--brand-value` containing `.brand-value-card--offer` and `.brand-value-card--reasons`.

- [ ] **Step 1: Write failing data and component tests**

Pin `BRAND_REASONS` to:

```js
[
  'High-quality cinematic storytelling',
  'Authentic travel experiences',
  'Strong audience engagement',
  'Karnataka-focused travel audience',
  'Professional content creation',
  'High-reach social media campaigns',
]
```

At progress `.24`, require the existing `.chapter--creator-card` and no brand-value group. At `.26`, require:

```js
const group=screen.getByLabelText('Brand collaboration value')
expect(group).toHaveClass('chapter--brand-value')
expect([...screen.getByLabelText('What we offer').children]
  .map(item=>item.textContent)).toEqual(BRAND_CAPABILITIES)
expect([...screen.getByLabelText('Why brands should work with us').children]
  .map(item=>item.textContent)).toEqual(BRAND_REASONS)
expect(screen.queryByText('About the creator')).not.toBeInTheDocument()
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/journey/chapters.test.js src/components/ChapterContent.test.jsx
```

Expected: FAIL because `BRAND_REASONS`, `brandValue`, and paired-card markup do not exist.

- [ ] **Step 3: Add the model and paired-card markup**

Add `BRAND_REASONS` and this `brandValue` object to the Who We Are chapter:

```js
brandValue:{
  offer:{title:'What We Offer',items:BRAND_CAPABILITIES},
  reasons:{
    title:'Why Brands Should Work With Us',
    items:BRAND_REASONS,
  },
},
```

In `ChapterContent`, use:

```js
const isOperations=chapter.layout==='operations'
const brandValueBeat=isOperations&&progress>=.25
const creatorBeat=isOperations&&progress>=.22&&!brandValueBeat
```

Return this before the standard chapter markup when `brandValueBeat` is true:

```jsx
<article
  className="chapter chapter--operations chapter--brand-value"
  key={`${chapter.id}-brand-value`}
  aria-label="Brand collaboration value"
>
  <section className="brand-value-card brand-value-card--offer">
    <h1 id={`chapter-${chapter.id}-offer`}>
      {chapter.brandValue.offer.title}
    </h1>
    <ul aria-label="What we offer">
      {chapter.brandValue.offer.items.map(item=><li key={item}>{item}</li>)}
    </ul>
  </section>
  <section className="brand-value-card brand-value-card--reasons">
    <h2 id={`chapter-${chapter.id}-reasons`}>
      {chapter.brandValue.reasons.title}
    </h2>
    <ul aria-label="Why brands should work with us">
      {chapter.brandValue.reasons.items.map(item=><li key={item}>{item}</li>)}
    </ul>
  </section>
</article>
```

- [ ] **Step 4: Verify GREEN**

Run the focused tests again. Expected: all chapter and component tests pass.

---

### Task 2: Enforce the diagonal/stacked composition and visual evidence

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `scripts/visual-qa.test.js`
- Modify: `src/index.css`
- Modify: `design-qa.md`

**Interfaces:**
- Captures: `layout.content.brandCards`, including exact titles, ordered items, and rectangles.
- Requires: desktop diagonal positions and mobile top-to-bottom order.

- [ ] **Step 1: Write failing visual-QA corpus tests**

Require a new `creator-profile` state at `.24`, paired brand content at `.26`, exact `BRAND_REASONS`, and layout assertions containing:

```js
layout.content.brandCards
offer.rect.left<viewport.width*.5
offer.rect.top<viewport.height*.5
reasons.rect.right>viewport.width*.5
reasons.rect.bottom>viewport.height*.5
offer.rect.top<reasons.rect.top
```

- [ ] **Step 2: Verify visual-QA tests RED**

Run:

```bash
npm test -- --run scripts/visual-qa.test.js
```

Expected: FAIL because the creator-profile state and brand-card evidence are absent.

- [ ] **Step 3: Add browser evidence and positioning checks**

Import `BRAND_REASONS`, add `.24` creator and `.26` paired-card expectations, and collect each `.brand-value-card` title, list items, and rounded bounding rectangle. Compare exact card data before screenshots. Require diagonal desktop placement and mobile ordered stacking.

- [ ] **Step 4: Add the responsive glass-card styling**

Add:

```css
.chapter--brand-value{inset:0;width:auto;height:100%;left:0;right:0;bottom:auto}
.brand-value-card{position:absolute;padding:clamp(1.2rem,2vw,2rem);border:1px solid rgba(255,255,255,.28);border-radius:26px;background:linear-gradient(145deg,rgba(15,27,32,.72),rgba(87,101,49,.44));box-shadow:0 28px 80px rgba(3,10,14,.3),inset 0 1px rgba(255,255,255,.12);-webkit-backdrop-filter:blur(18px) saturate(135%);backdrop-filter:blur(18px) saturate(135%);animation:brandValueIn .7s ease both}
.brand-value-card--offer{top:clamp(5rem,8vh,7rem);left:clamp(1.25rem,5vw,5rem);width:min(560px,43vw)}
.brand-value-card--reasons{right:clamp(3rem,6vw,6rem);bottom:clamp(5rem,8vh,7rem);width:min(500px,37vw);animation-delay:.12s}
.brand-value-card h1,.brand-value-card h2{font:400 clamp(2.4rem,4.4vw,4.8rem)/.9 var(--font-display);margin:0 0 1rem}
.brand-value-card--reasons h2{font-size:clamp(2.1rem,3.8vw,4rem)}
.brand-value-card ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.4rem .8rem;margin:0;padding:0;list-style:none}
.brand-value-card li{padding:.5rem .55rem;border-top:1px solid rgba(255,224,165,.42);text-transform:uppercase;letter-spacing:.08em;font-size:clamp(.56rem,.72vw,.7rem);line-height:1.35;color:rgba(255,248,237,.94)}
@keyframes brandValueIn{from{opacity:0;transform:translateY(24px) scale(.98)}}
```

Add the mobile override:

```css
@media(max-width:700px){
  .chapter--brand-value{inset:4.5rem 2.65rem 4.2rem 1rem;width:auto;height:auto;display:flex;flex-direction:column;justify-content:space-between;gap:.65rem}
  .brand-value-card,.brand-value-card--offer,.brand-value-card--reasons{position:relative;inset:auto;width:100%;padding:.75rem .85rem;border-radius:18px}
  .brand-value-card h1,.brand-value-card h2,.brand-value-card--reasons h2{font-size:clamp(1.7rem,7.8vw,2.55rem);margin-bottom:.55rem}
  .brand-value-card ul{gap:.18rem .5rem}
  .brand-value-card li{padding:.3rem .32rem;font-size:.5rem;line-height:1.25}
}
```

- [ ] **Step 5: Verify focused tests and production captures**

Run the focused unit tests, build, preview, then capture `.24` and `.26` at `1440×900` and `390×844`. Expected: exact card content, diagonal desktop placement, ordered mobile stacking, no clipping/overflow, no audio controls, and no console failures.

- [ ] **Step 6: Complete verification, review, commit, and push**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Request independent review, then commit all approved source/test/QA/documentation changes with:

```bash
git commit -m "Add post-creator brand value cards"
git push origin main
```
