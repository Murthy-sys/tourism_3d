# Contact Trek Packages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the customer-facing Expedition Chapters UI with five responsive trek-package cards whose selected package, contact person name, and selected dates open one prefilled WhatsApp conversation with `7204033032`.

**Architecture:** Keep the existing `plans` chapter, menu item, scroll boundaries, 3D journey, and Social Media Performance beat intact. Store the five packages in one exported `TREK_PACKAGES` data array, render them only in the Contact chapter, keep the selected package object in `JourneyShell`, and let a focused booking dialog validate the name/date fields before building a pure, testable WhatsApp URL.

**Tech Stack:** React 18, Vite 5, Vitest 2, Testing Library, CSS glassmorphism, Playwright visual QA.

## Global Constraints

- Work directly on `main`; do not merge `feature/continuous-realistic-landscape`.
- Preserve the mountain → water → forest 3D journey, transitions, menu structure, Social Media Performance at `.88`, and Contact boundary at `.94`.
- Remove the heading, body, and all three customer-facing Expedition Chapters cards before Social Media Performance.
- Render exactly five unique packages: Bandaje Waterfalls, Kurinjal Trek, Netravati Peak Trek, Kuduremukha Trek, and Gangadikallu Trek.
- Do not copy poster dates into package data or UI.
- Gangadikallu Trek must not list Trek Guide.
- Use one WhatsApp target only: `917204033032`.
- The booking form requires Contact Person Name, Start Date, and End Date; End Date cannot precede Start Date.
- The WhatsApp message includes contact person name, selected package, duration, price, start date, and end date.
- A web page opens a prefilled WhatsApp compose screen; it does not claim to send the message automatically.
- Cards use the transparent dark-to-olive What We Offer treatment and its inclusion font size.
- Desktop target is `1440×900`; mobile target is `390×844`, with readable type of at least `10px`.

---

## File Structure

- `src/journey/chapters.js`: authoritative package data and retained journey boundaries.
- `src/journey/chapters.test.js`: exact package content, deduplication, poster-date exclusion, and Gangadikallu difference.
- `src/components/ChapterContent.jsx`: hides the retired expedition UI and renders the Contact package selector.
- `src/components/ChapterContent.test.jsx`: package rendering/click behavior and retained Social Media Performance boundary.
- `src/components/BookingOverlay.jsx`: package summary, booking fields, validation, message builder, and WhatsApp URL builder.
- `src/components/BookingOverlay.test.jsx`: form validation, message contents, one-number dispatch, and Escape behavior.
- `src/components/JourneyShell.jsx`: selected-package state and overlay wiring.
- `src/components/JourneyShell.test.jsx`: verifies the exact selected object reaches the booking overlay.
- `src/components/JourneyMenu.jsx`: remains structurally unchanged.
- `src/components/JourneyMenu.test.jsx`: pins the retained Plans item and Plan a Trip callback.
- `src/index.css`: desktop five-card row, mobile swipe rail, and responsive booking dialog.
- `scripts/visual-qa.mjs`: Contact package capture and fail-closed layout/content checks.
- `scripts/visual-qa.test.js`: source-contract tests for Contact package visual QA.
- `design-qa.md`: records the final desktop/mobile evidence paths.

---

### Task 1: Add the Authoritative Package Data

**Files:**
- Modify: `src/journey/chapters.test.js`
- Modify: `src/journey/chapters.js`

**Interfaces:**
- Produces: `TREK_PACKAGES: Array<{id:string,name:string,price:number,priceLabel:string,duration:string,transfer:string,inclusions:string[]}>`
- Consumed by: `ChapterContent`, `BookingOverlay`, visual QA, and their tests.

- [ ] **Step 1: Replace the old travel-plan data assertions with a failing package-data test**

Add `TREK_PACKAGES` to the import and replace the `TRAVEL_PLANS` assertions with:

```js
it('owns the five deduplicated poster packages without poster dates',()=>{
  expect(TREK_PACKAGES.map(({id,name,price,priceLabel,duration})=>({
    id,name,price,priceLabel,duration,
  }))).toEqual([
    {id:'bandaje-waterfalls',name:'Bandaje Waterfalls',price:3299,priceLabel:'₹3,299',duration:'1 Night · 1 Day'},
    {id:'kurinjal-trek',name:'Kurinjal Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
    {id:'netravati-peak-trek',name:'Netravati Peak Trek',price:3499,priceLabel:'₹3,499',duration:'1 Night · 1 Day'},
    {id:'kuduremukha-trek',name:'Kuduremukha Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
    {id:'gangadikallu-trek',name:'Gangadikallu Trek',price:3399,priceLabel:'₹3,399',duration:'1 Night · 1 Day'},
  ])
  expect(new Set(TREK_PACKAGES.map(({id})=>id)).size).toBe(5)
  expect(JSON.stringify(TREK_PACKAGES)).not.toMatch(/31st|july|2026/i)
  expect(TREK_PACKAGES[0].inclusions).toEqual([
    'Adventurous Jeep Ride',
    '2 Times Local Cuisine Food',
    '1 Time Coffee or Snacks',
    'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
    'Trek Entry',
    'Trek Guide',
    'Group Fun Activities',
  ])
  expect(TREK_PACKAGES[1].inclusions).toEqual([
    'Adventurous Jeep Ride',
    '2 Times Local Cuisine Food',
    '1 Time Coffee, Tea or Snacks',
    'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
    'Trek Entry',
    'Trek Guide',
    'Group Fun Activities',
  ])
  expect(TREK_PACKAGES[2].inclusions).toEqual(TREK_PACKAGES[1].inclusions)
  expect(
    TREK_PACKAGES.find(({id})=>id==='gangadikallu-trek').inclusions,
  ).toEqual([
    'Adventurous Jeep Ride',
    '2 Times Local Cuisine Food',
    '1 Time Coffee, Tea or Snacks',
    'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
    'Trek Entry',
    'Group Fun Activities',
  ])
  expect(
    TREK_PACKAGES.find(({id})=>id==='kuduremukha-trek').inclusions,
  ).toEqual([
    'Adventurous Jeep Ride',
    '2 Times Local Cuisine Food',
    '1 Time Coffee, Tea or Snacks',
    'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
    'Homestay for Fresh Up & Luggage',
    'Trek Entry',
    'Trek Guide',
    'Group Fun Activities',
  ])
})
```

Update the no-snow assertion to inspect `{chapters:CHAPTERS,packages:TREK_PACKAGES}`.

- [ ] **Step 2: Run the data test and confirm RED**

Run:

```bash
npx vitest run src/journey/chapters.test.js
```

Expected: FAIL because `TREK_PACKAGES` is not exported.

- [ ] **Step 3: Replace `TRAVEL_PLANS` with the complete package array**

Add this exact export in `src/journey/chapters.js`:

```js
const STANDARD_INCLUSIONS=[
  'Adventurous Jeep Ride',
  '2 Times Local Cuisine Food',
  '1 Time Coffee, Tea or Snacks',
  'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
  'Trek Entry',
  'Trek Guide',
  'Group Fun Activities',
]

export const TREK_PACKAGES=[
  {
    id:'bandaje-waterfalls',
    name:'Bandaje Waterfalls',
    price:3299,
    priceLabel:'₹3,299',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[
      'Adventurous Jeep Ride',
      '2 Times Local Cuisine Food',
      '1 Time Coffee or Snacks',
      'Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus',
      'Trek Entry',
      'Trek Guide',
      'Group Fun Activities',
    ],
  },
  {
    id:'kurinjal-trek',
    name:'Kurinjal Trek',
    price:3399,
    priceLabel:'₹3,399',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[...STANDARD_INCLUSIONS],
  },
  {
    id:'netravati-peak-trek',
    name:'Netravati Peak Trek',
    price:3499,
    priceLabel:'₹3,499',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[...STANDARD_INCLUSIONS],
  },
  {
    id:'kuduremukha-trek',
    name:'Kuduremukha Trek',
    price:3399,
    priceLabel:'₹3,399',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:[
      ...STANDARD_INCLUSIONS.slice(0,4),
      'Homestay for Fresh Up & Luggage',
      ...STANDARD_INCLUSIONS.slice(4),
    ],
  },
  {
    id:'gangadikallu-trek',
    name:'Gangadikallu Trek',
    price:3399,
    priceLabel:'₹3,399',
    duration:'1 Night · 1 Day',
    transfer:'Bengaluru pickup & drop',
    inclusions:STANDARD_INCLUSIONS.filter(item=>item!=='Trek Guide'),
  },
]
```

Remove the unused `TRAVEL_PLANS` export. Do not modify `CHAPTERS`, `.88`, or `.94`.

- [ ] **Step 4: Run the data test and confirm GREEN**

Run:

```bash
npx vitest run src/journey/chapters.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit the package data**

```bash
git add src/journey/chapters.js src/journey/chapters.test.js
git commit -m "Add trek package catalog"
```

---

### Task 2: Replace Expedition UI with Contact Package Cards

**Files:**
- Modify: `src/components/ChapterContent.test.jsx`
- Modify: `src/components/ChapterContent.jsx`

**Interfaces:**
- Consumes: `TREK_PACKAGES`.
- Produces: `onPlan(packageObject)` from each `Select <Package Name>` button.
- Preserves: `SocialMediaPerformance` for `progress >= SOCIAL_PERFORMANCE_START`.

- [ ] **Step 1: Write failing chapter-content tests**

Replace the old monument action tests and pre-`.88` expectation with:

```jsx
import { fireEvent, render, screen } from '@testing-library/react'

it('removes the Expedition Chapters UI while preserving the 3D interval',()=>{
  const plans=CHAPTERS.find(({id})=>id==='plans')
  const {container}=render(
    <ChapterContent chapter={plans} progress={.5} onPlan={vi.fn()}/>,
  )
  expect(container).toBeEmptyDOMElement()
  expect(screen.queryByText(/Three expedition chapters/i))
    .not.toBeInTheDocument()
})

it('renders all five packages under Contact and selects the exact package',()=>{
  const onPlan=vi.fn()
  render(
    <ChapterContent
      chapter={CHAPTERS.find(({id})=>id==='contact')}
      progress={.97}
      onPlan={onPlan}
    />,
  )
  expect(screen.getByText('Where should we take you next?'))
    .toBeInTheDocument()
  expect(screen.getAllByRole('button',{name:/Select .* package/i}))
    .toHaveLength(5)
  fireEvent.click(
    screen.getByRole('button',{name:'Select Netravati Peak Trek package'}),
  )
  expect(onPlan).toHaveBeenCalledWith(
    expect.objectContaining({
      id:'netravati-peak-trek',
      name:'Netravati Peak Trek',
      priceLabel:'₹3,499',
    }),
  )
})
```

Update the boundary test so `.879999` expects an empty container and `.88` expects Social Media Performance.

- [ ] **Step 2: Run the component test and confirm RED**

Run:

```bash
npx vitest run src/components/ChapterContent.test.jsx
```

Expected: FAIL because expedition content still renders and Contact has no package cards.

- [ ] **Step 3: Implement the focused rendering branches**

In `ChapterContent.jsx`, import `TREK_PACKAGES`, remove `TRAVEL_PLANS`, `getJourneyState`, `planFocus`, and `onBook`, then put these branches before the generic article:

```jsx
if(chapter.layout==='drive')return null
if(chapter.layout==='monument-plans'){
  if(progress>=SOCIAL_PERFORMANCE_START){
    return <SocialMediaPerformance
      progress={progress}
      reducedMotion={reducedMotion}
    />
  }
  return null
}
```

Replace the old Contact finale with:

```jsx
{chapter.layout==='pavilion-contact'&&
  <div className="package-card-rail" aria-label="Available trek packages">
    {TREK_PACKAGES.map(pkg=>
      <article className="package-card" key={pkg.id}>
        <p className="package-card__duration">{pkg.duration}</p>
        <h2>{pkg.name}</h2>
        <strong className="package-card__price">
          {pkg.priceLabel}<small> per person</small>
        </strong>
        <p className="package-card__transfer">{pkg.transfer}</p>
        <ul>
          {pkg.inclusions.map(item=><li key={item}>{item}</li>)}
        </ul>
        <button
          type="button"
          aria-label={`Select ${pkg.name} package`}
          onClick={()=>onPlan(pkg)}
        >
          Select dates <span aria-hidden="true">↗</span>
        </button>
      </article>,
    )}
  </div>
}
```

Do not render the old Contact email, support line, or generic plan button.

- [ ] **Step 4: Run the component test and confirm GREEN**

Run:

```bash
npx vitest run src/components/ChapterContent.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit the chapter UI**

```bash
git add src/components/ChapterContent.jsx src/components/ChapterContent.test.jsx
git commit -m "Replace expedition cards with trek packages"
```

---

### Task 3: Build the Name and Date WhatsApp Form

**Files:**
- Modify: `src/components/BookingOverlay.test.jsx`
- Modify: `src/components/BookingOverlay.jsx`

**Interfaces:**
- Consumes: `selectedPackage` with the Task 1 package shape.
- Produces: `buildWhatsAppMessage({contactName,startDate,endDate,selectedPackage}): string`.
- Produces: `buildWhatsAppUrl(details): string`.
- Opens: one `https://wa.me/917204033032?text=<encoded message>` URL.

- [ ] **Step 1: Write failing helper, validation, and dispatch tests**

Use the Bandaje fixture and add:

```jsx
import BookingOverlay, { buildWhatsAppUrl } from './BookingOverlay'

const selectedPackage={
  id:'bandaje-waterfalls',
  name:'Bandaje Waterfalls',
  price:3299,
  priceLabel:'₹3,299',
  duration:'1 Night · 1 Day',
  transfer:'Bengaluru pickup & drop',
  inclusions:['Trek Guide'],
}

it('builds one exact-number WhatsApp URL with name, package, and dates',()=>{
  const url=buildWhatsAppUrl({
    contactName:'Ananya Rao',
    startDate:'2026-08-14',
    endDate:'2026-08-15',
    selectedPackage,
  })
  expect(url).toMatch(/^https:\/\/wa\.me\/917204033032\?text=/)
  const message=decodeURIComponent(url.split('?text=')[1])
  expect(message).toContain('Contact person: Ananya Rao')
  expect(message).toContain('Travel dates: 2026-08-14 to 2026-08-15')
  expect(message).toContain('Package: Bandaje Waterfalls — 1 Night · 1 Day — ₹3,299 per person')
  expect(url).not.toMatch(/7358369538|7404033032/)
})

it('validates the contact name and date range before opening WhatsApp',()=>{
  const openWhatsApp=vi.fn()
  render(
    <BookingOverlay
      open
      selectedPackage={selectedPackage}
      onClose={vi.fn()}
      openWhatsApp={openWhatsApp}
    />,
  )
  expect(screen.getByText('Bandaje Waterfalls')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Contact Person Name'),{
    target:{value:'Ananya Rao'},
  })
  fireEvent.change(screen.getByLabelText('Start Date'),{
    target:{value:'2026-08-16'},
  })
  fireEvent.change(screen.getByLabelText('End Date'),{
    target:{value:'2026-08-15'},
  })
  fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'End Date cannot be before Start Date.',
  )
  expect(openWhatsApp).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('End Date'),{
    target:{value:'2026-08-17'},
  })
  fireEvent.click(screen.getByRole('button',{name:'Continue on WhatsApp'}))
  expect(openWhatsApp).toHaveBeenCalledTimes(1)
  expect(openWhatsApp.mock.calls[0][0]).toMatch(
    /^https:\/\/wa\.me\/917204033032\?text=/,
  )
})
```

Keep the Escape assertion and change it to use `selectedPackage`.

- [ ] **Step 2: Run the dialog test and confirm RED**

Run:

```bash
npx vitest run src/components/BookingOverlay.test.jsx
```

Expected: FAIL because the helpers and new form interface do not exist.

- [ ] **Step 3: Implement pure message helpers and the booking dialog**

Replace `BookingOverlay.jsx` with:

```jsx
import { useEffect, useState } from 'react'

const WHATSAPP_NUMBER='917204033032'
const blank={contactName:'',startDate:'',endDate:''}

export const buildWhatsAppMessage=({
  contactName,
  startDate,
  endDate,
  selectedPackage,
})=>[
  'Hello Sanchari Kannadiga,',
  `I would like to enquire about the ${selectedPackage.name} package.`,
  `Contact person: ${contactName.trim()}`,
  `Travel dates: ${startDate} to ${endDate}`,
  `Package: ${selectedPackage.name} — ${selectedPackage.duration} — ${selectedPackage.priceLabel} per person`,
  'Please confirm availability and share the booking details.',
].join('\n')

export const buildWhatsAppUrl=details=>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    buildWhatsAppMessage(details),
  )}`

const defaultOpenWhatsApp=url=>
  window.open(url,'_blank','noopener,noreferrer')

export default function BookingOverlay({
  open,
  selectedPackage,
  onClose,
  openWhatsApp=defaultOpenWhatsApp,
}){
  const [form,setForm]=useState(blank)
  const [error,setError]=useState('')

  useEffect(()=>{
    if(open){
      setForm(blank)
      setError('')
    }
  },[open,selectedPackage?.id])

  useEffect(()=>{
    const key=event=>{
      if(event.key==='Escape'&&open) onClose?.()
    }
    document.addEventListener('keydown',key)
    return()=>document.removeEventListener('keydown',key)
  },[open,onClose])

  if(!open||!selectedPackage)return null

  const change=event=>{
    setForm(current=>({
      ...current,
      [event.target.name]:event.target.value,
    }))
    setError('')
  }

  const submit=event=>{
    event.preventDefault()
    if(!form.contactName.trim()||!form.startDate||!form.endDate){
      setError('Enter the contact person name and select both travel dates.')
      return
    }
    if(form.endDate<form.startDate){
      setError('End Date cannot be before Start Date.')
      return
    }
    openWhatsApp(buildWhatsAppUrl({...form,selectedPackage}))
  }

  return <div
    className="booking-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="booking-title"
  >
    <button
      className="booking-overlay__close"
      type="button"
      onClick={onClose}
      aria-label="Close booking"
    >×</button>
    <div className="booking-overlay__intro">
      <p>Selected trek package</p>
      <h2 id="booking-title">{selectedPackage.name}</h2>
      <div className="booking-overlay__package">
        <strong>{selectedPackage.priceLabel}</strong>
        <span>{selectedPackage.duration} · Per person</span>
      </div>
    </div>
    <form onSubmit={submit} noValidate>
      <label>
        Contact Person Name
        <input
          name="contactName"
          value={form.contactName}
          onChange={change}
          required
          autoFocus
        />
      </label>
      <label>
        Start Date
        <input
          type="date"
          name="startDate"
          value={form.startDate}
          onChange={change}
          required
        />
      </label>
      <label>
        End Date
        <input
          type="date"
          name="endDate"
          min={form.startDate||undefined}
          value={form.endDate}
          onChange={change}
          required
        />
      </label>
      {error&&<p className="booking-overlay__error" role="alert">{error}</p>}
      <button className="booking-overlay__submit">
        Continue on WhatsApp
      </button>
      <p className="booking-overlay__note">
        WhatsApp opens with your package enquiry ready to send.
      </p>
    </form>
  </div>
}
```

- [ ] **Step 4: Run the dialog test and confirm GREEN**

Run:

```bash
npx vitest run src/components/BookingOverlay.test.jsx
```

Expected: PASS with exactly one mocked WhatsApp open call.

- [ ] **Step 5: Commit the booking form**

```bash
git add src/components/BookingOverlay.jsx src/components/BookingOverlay.test.jsx
git commit -m "Add WhatsApp trek booking form"
```

---

### Task 4: Wire Selected Packages Through the Journey Shell

**Files:**
- Modify: `src/components/JourneyShell.test.jsx`
- Modify: `src/components/JourneyShell.jsx`
- Modify: `src/components/JourneyMenu.test.jsx`
- Inspect without modifying: `src/components/JourneyMenu.jsx`

**Interfaces:**
- Consumes: `ChapterContent.onPlan(packageObject)`.
- Produces: `BookingOverlay.selectedPackage`.
- Preserves: every `CHAPTERS` menu entry including Plans.
- Changes: “Plan a Trip” navigates to Contact so the visitor selects a package first.

- [ ] **Step 1: Add failing shell and menu flow tests**

Mock `BookingOverlay` and add:

```jsx
const renderBooking=vi.hoisted(()=>vi.fn())
vi.mock('./BookingOverlay',()=>({default:props=>{
  renderBooking(props)
  return props.open?<div role="dialog" aria-label="Package booking"/>:null
}}))

it('opens booking with the exact package selected from Contact',()=>{
  render(<JourneyShell/>)
  const selectedPackage={
    id:'kurinjal-trek',
    name:'Kurinjal Trek',
    priceLabel:'₹3,399',
    duration:'1 Night · 1 Day',
  }
  act(()=>renderChapter.mock.calls.at(-1)[0].onPlan(selectedPackage))
  expect(renderBooking.mock.calls.at(-1)[0]).toEqual(
    expect.objectContaining({
      open:true,
      selectedPackage,
    }),
  )
})
```

Add `renderBooking.mockClear()` to the existing `beforeEach`.

In `JourneyMenu.test.jsx`, add:

```jsx
it('retains Plans and routes Plan a Trip through its callback',()=>{
  const onBook=vi.fn()
  render(
    <JourneyMenu
      open
      onClose={vi.fn()}
      onSelect={vi.fn()}
      onBook={onBook}
    />,
  )
  expect(screen.getByRole('button',{name:'Plans'})).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button',{name:'Plan a Trip'}))
  expect(onBook).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the shell/menu tests and confirm RED**

Run:

```bash
npx vitest run src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx
```

Expected: FAIL because `JourneyShell` stores only a plan name and can open an empty form.

- [ ] **Step 3: Store the package object and route the menu CTA**

In `JourneyShell.jsx`:

```jsx
const [selectedPackage,setSelectedPackage]=useState(null)
```

Replace the current `book` callback and component wiring with:

```jsx
const book=selected=>{
  setSelectedPackage(selected)
  setBooking(true)
}

<ChapterContent
  chapter={chapter}
  progress={progress}
  reducedMotion={reducedMotion}
  onPlan={book}
/>

<JourneyMenu
  open={menuOpen}
  onOpen={()=>setMenuOpen(true)}
  onClose={()=>setMenuOpen(false)}
  onSelect={goTo}
  onBook={()=>goTo('contact')}
/>

<BookingOverlay
  open={booking}
  selectedPackage={selectedPackage}
  onClose={()=>setBooking(false)}
/>
```

Remove the old `plan` string state and `initialPlan` prop. Keep JourneyMenu’s public `onBook` callback unchanged so its structure remains stable.

- [ ] **Step 4: Run the shell/menu tests and confirm GREEN**

Run:

```bash
npx vitest run src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx
```

Expected: PASS.

- [ ] **Step 5: Commit the journey wiring**

```bash
git add src/components/JourneyShell.jsx src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx
git commit -m "Wire selected trek package to booking"
```

---

### Task 5: Deliver the Responsive Glass Package Experience

**Files:**
- Modify: `src/index.css`
- Modify: `scripts/visual-qa.test.js`
- Modify: `scripts/visual-qa.mjs`

**Interfaces:**
- Desktop: `.package-card-rail` is a five-column row within the viewport.
- Mobile: `.package-card-rail` is a horizontal scroll-snap rail.
- QA: `QA_STATE=contact-packages` captures progress `.97`.

- [ ] **Step 1: Add failing visual-QA source-contract assertions**

Add to `scripts/visual-qa.test.js`:

```js
it('verifies the responsive Contact package catalog',()=>{
  expect(source).toContain("name:'contact-packages'")
  expect(source).toContain('progress:.97')
  expect(source).toContain('packages:TREK_PACKAGES.map')
  expect(source).toContain("chapter.querySelectorAll('.package-card')")
  expect(source).toContain('packageCard.itemFontSize<10')
  expect(source).toContain('rectanglesOverlap(packageCard.rect,control.rect)')
})
```

- [ ] **Step 2: Run the QA contract test and confirm RED**

Run:

```bash
npx vitest run scripts/visual-qa.test.js
```

Expected: FAIL because Contact package capture/checks do not exist.

- [ ] **Step 3: Add the Contact state and fail-closed package evidence**

Import `TREK_PACKAGES` in `scripts/visual-qa.mjs` and append:

```js
{
  name:'contact-packages',
  progress:.97,
  phase:'forest-jeep',
  activeBiome:'forest',
  activeTransport:'jeep',
  content:{
    title:'Where should we take you next?',
    creatorCard:false,
    body:'Tell us what you imagine. We will make the route real.',
    items:[],
    packages:TREK_PACKAGES.map(pkg=>({
      name:pkg.name,
      price:pkg.priceLabel,
      duration:pkg.duration,
      inclusions:pkg.inclusions,
    })),
  },
},
```

In the page evaluation, collect every package with:

```js
const packageCards=chapter
  ?[...chapter.querySelectorAll('.package-card')].map(card=>{
    const cardRect=card.getBoundingClientRect()
    return{
      name:card.querySelector('h2')?.textContent?.trim()||'',
      price:card.querySelector('.package-card__price')
        ?.childNodes[0]?.textContent?.trim()||'',
      duration:card.querySelector('.package-card__duration')
        ?.textContent?.trim()||'',
      inclusions:[...card.querySelectorAll('li')]
        .map(item=>item.textContent?.trim()||''),
      itemFontSize:parseFloat(
        getComputedStyle(card.querySelector('li')).fontSize,
      ),
      fullyVisible:
        cardRect.left>=0&&
        cardRect.top>=0&&
        cardRect.right<=innerWidth&&
        cardRect.bottom<=innerHeight,
      rect:{
        left:Math.round(cardRect.left),
        top:Math.round(cardRect.top),
        right:Math.round(cardRect.right),
        bottom:Math.round(cardRect.bottom),
      },
    }
  })
  :[]
```

Return `packageCards` inside `layout.content`.

In the `state.content` assertion block:

```js
if(state.content.packages){
  const actualPackages=layout.content.packageCards.map(packageCard=>({
    name:packageCard.name,
    price:packageCard.price,
    duration:packageCard.duration,
    inclusions:packageCard.inclusions,
  }))
  if(JSON.stringify(actualPackages)!==JSON.stringify(state.content.packages)){
    throw new Error(`${state.name} package content mismatch`)
  }
  const cardsToInspect=requested==='mobile'
    ?layout.content.packageCards.filter(packageCard=>packageCard.fullyVisible)
    :layout.content.packageCards
  if(
    requested==='mobile'&&
    !cardsToInspect.length
  ){
    throw new Error(`${state.name} has no fully visible mobile package card`)
  }
  for(const packageCard of cardsToInspect){
    if(
      packageCard.rect.left<0||
      packageCard.rect.top<0||
      packageCard.rect.right>viewport.width||
      packageCard.rect.bottom>viewport.height
    ){
      throw new Error(`${requested} package card is clipped at ${state.name}`)
    }
    if(requested==='mobile'&&packageCard.itemFontSize<10){
      throw new Error(
        `Mobile package-card type is too small: ${packageCard.itemFontSize}px`,
      )
    }
    for(const control of layout.controls){
      if(rectanglesOverlap(packageCard.rect,control.rect)){
        throw new Error(
          `${state.name} package card overlaps ${control.name}`,
        )
      }
    }
  }
}
```

This validates all five package contents at both viewports while applying
geometry checks to the initially focused, fully visible mobile card rather
than rejecting the intentionally off-screen cards in the swipe rail.

- [ ] **Step 4: Add desktop and mobile package/dialog styling**

Replace obsolete `.monument-plan-actions` and old Contact finale rules with:

```css
.chapter--pavilion-contact{inset:4.5rem 5.5rem 4.3rem 4.5rem;width:auto;display:flex;flex-direction:column;justify-content:flex-end}
.chapter--pavilion-contact>h1{margin:.2rem 0 .75rem;font-size:clamp(2.8rem,4.5vw,5.2rem);max-width:900px}
.chapter--pavilion-contact>.chapter__body{display:none}
.package-card-rail{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.65rem;width:100%}
.package-card{min-width:0;padding:1rem;border:1px solid rgba(255,255,255,.3);border-radius:22px;background:linear-gradient(145deg,rgba(15,27,32,.76),rgba(87,101,49,.5));box-shadow:0 28px 80px rgba(3,10,14,.34),inset 0 1px rgba(255,255,255,.14);-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);display:flex;flex-direction:column}
.package-card__duration,.package-card__transfer{margin:0;color:#ffd792;font-size:.6rem;letter-spacing:.1em;text-transform:uppercase}
.package-card h2{margin:.45rem 0;font:400 clamp(1.4rem,2vw,2.25rem)/.92 var(--font-display);text-transform:uppercase}
.package-card__price{font:400 clamp(1.45rem,2vw,2.2rem)/1 var(--font-display);color:#fff8ed}
.package-card__price small{font:.58rem var(--font-body);letter-spacing:.08em;text-transform:uppercase;color:rgba(255,248,237,.7)}
.package-card__transfer{margin:.45rem 0 .5rem;color:rgba(255,248,237,.76)}
.package-card ul{margin:0 0 .75rem;display:grid;gap:.15rem}
.package-card li{padding:.28rem .1rem;border-top:1px solid rgba(255,224,165,.48);color:rgba(255,248,237,.95);font-size:clamp(.56rem,.72vw,.7rem);line-height:1.25;letter-spacing:.08em;text-transform:uppercase}
.package-card>button{margin-top:auto;padding:.65rem .7rem;border:1px solid rgba(255,224,165,.55);border-radius:999px;background:rgba(13,18,29,.2);color:#fff8ed;font-size:.62rem;letter-spacing:.11em;text-transform:uppercase}
.booking-overlay__package{display:flex;flex-direction:column;gap:.35rem;padding:1rem 0;border-top:1px solid rgba(255,224,165,.38);border-bottom:1px solid rgba(255,224,165,.38)}
.booking-overlay__package strong{font:400 clamp(2rem,4vw,4rem)/1 var(--font-display)}
.booking-overlay__package span,.booking-overlay__note{color:rgba(255,255,255,.68);font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}
.booking-overlay__error{grid-column:1/-1;margin:0;color:#ffd2bd;font-size:.76rem}
.booking-overlay__note{grid-column:1/-1;margin:0;text-align:center}
```

Add the mobile rules:

```css
@media(max-width:700px){
  .chapter--pavilion-contact{inset:4.35rem 2.65rem 4.2rem 1rem;width:auto;justify-content:flex-start}
  .chapter--pavilion-contact>.chapter__kicker{font-size:.625rem}
  .chapter--pavilion-contact>h1{margin:.2rem 0 .6rem;font-size:clamp(2.2rem,9.5vw,3rem)}
  .package-card-rail{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:min(78vw,300px);gap:.7rem;overflow-x:auto;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;padding-bottom:.4rem;scrollbar-width:none}
  .package-card-rail::-webkit-scrollbar{display:none}
  .package-card{scroll-snap-align:start;padding:.85rem;border-radius:18px}
  .package-card h2{font-size:1.75rem}
  .package-card li{font-size:clamp(.64rem,2.8vw,.74rem)}
  .package-card>button{min-height:42px}
  .booking-overlay{grid-template-columns:1fr;padding:4.5rem 1.25rem 2rem;align-items:start}
  .booking-overlay__intro h2{font-size:3rem}
  .booking-overlay form{grid-template-columns:1fr}
}
```

- [ ] **Step 5: Run component, QA-contract, and build checks**

Run:

```bash
npx vitest run src/journey/chapters.test.js src/components/ChapterContent.test.jsx src/components/BookingOverlay.test.jsx src/components/JourneyShell.test.jsx src/components/JourneyMenu.test.jsx scripts/visual-qa.test.js
npm run build
```

Expected: all targeted tests PASS and Vite production build succeeds.

- [ ] **Step 6: Commit responsive styling and QA automation**

```bash
git add src/index.css scripts/visual-qa.mjs scripts/visual-qa.test.js
git commit -m "Polish responsive trek package experience"
```

---

### Task 6: Visual Verification, Full Regression, and Delivery

**Files:**
- Modify: `design-qa.md`

**Interfaces:**
- Evidence: `/tmp/tourist-management-package-qa/desktop/contact-packages-page.png`
- Evidence: `/tmp/tourist-management-package-qa/mobile/contact-packages-page.png`

- [ ] **Step 1: Start the production preview**

Run:

```bash
npm run preview -- --host 127.0.0.1 --port 4175
```

Expected: Vite reports `http://127.0.0.1:4175/`.

- [ ] **Step 2: Capture desktop and mobile Contact evidence**

Run:

```bash
env QA_BASE_URL=http://127.0.0.1:4175/ QA_OUTPUT_DIR=/tmp/tourist-management-package-qa QA_STATE=contact-packages node scripts/visual-qa.mjs --project desktop
env QA_BASE_URL=http://127.0.0.1:4175/ QA_OUTPUT_DIR=/tmp/tourist-management-package-qa QA_STATE=contact-packages node scripts/visual-qa.mjs --project mobile
```

Expected: both commands succeed with no clipped card, overlap, font-size, content, console, camera, biome, or transport failure.

- [ ] **Step 3: Inspect both screenshots**

Open:

```text
/tmp/tourist-management-package-qa/desktop/contact-packages-page.png
/tmp/tourist-management-package-qa/mobile/contact-packages-page.png
```

Confirm the desktop row is readable, the mobile focused card is fully visible, the forest remains visible behind transparent cards, and menu/counter/scroll controls are unobstructed.

- [ ] **Step 4: Record the visual evidence**

Append this exact checklist item to `design-qa.md`:

```markdown
- Contact package evidence: `/tmp/tourist-management-package-qa/desktop/contact-packages-page.png` and `/tmp/tourist-management-package-qa/mobile/contact-packages-page.png`
```

- [ ] **Step 5: Run the full regression suite and production build**

Run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected: every test passes, the build succeeds, no whitespace errors exist, and only intended files are modified.

- [ ] **Step 6: Commit final evidence**

```bash
git add design-qa.md
git commit -m "Document trek package visual QA"
```

- [ ] **Step 7: Request an independent code review**

Dispatch a reviewer against the spec and implementation. The reviewer must verify exact package content, one WhatsApp target, required contact name/dates, no Expedition UI, retained journey boundaries, responsive card readability, accessibility, and no unrelated changes.

- [ ] **Step 8: Fix any confirmed review findings and rerun affected tests**

Apply only evidence-backed corrections, rerun the focused tests and relevant desktop/mobile capture, then commit the correction with a specific message.

- [ ] **Step 9: Push the completed main branch**

```bash
git push origin main
```

Expected: `origin/main` advances to the verified delivery commit.
