# Social Media Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progress-animated Instagram performance dashboard as a scroll-only beat between Plans and Contact.

**Architecture:** Authoritative profile and metric data lives in the journey model. A focused `SocialMediaPerformance` component formats deterministic progress-driven values and semantic final labels; `ChapterContent` swaps it into the tail of Plans, while `JourneyShell` passes reduced-motion state. Existing browser QA gains one exact forest-jeep state and validates content, readability, geometry, and control clearance.

**Tech Stack:** React 18, JavaScript, CSS custom properties, Vitest, Testing Library, Playwright, Vite.

## Global Constraints

- Plans remains the active menu chapter from `.28` to `.94`.
- Existing plan content renders for `.28 ≤ progress < .88`.
- Social Media Performance renders for `.88 ≤ progress < .94`.
- Contact still begins at `.94`; menu and counter remain four chapters.
- Keep the exact six metric labels and displays from the approved design.
- Public values are static July 2026 estimates, not a live Instagram API feed.
- Missing private metrics render `Updating soon`; never derive or invent them.
- Animation is progress-driven, reversible, deterministic, and reduced-motion safe.
- Preserve every 3D, camera, forest-jeep, audio, handoff, menu, Plans, and Contact behavior outside the overlay change.

---

### Task 1: Create the authoritative metric model and focused component

**Files:**
- Modify: `src/journey/chapters.js`
- Modify: `src/journey/chapters.test.js`
- Create: `src/components/SocialMediaPerformance.jsx`
- Create: `src/components/SocialMediaPerformance.test.jsx`

**Interfaces:**
- Produces: `SOCIAL_PERFORMANCE_START: number` with value `.88`.
- Produces: `SOCIAL_MEDIA_PROFILE` with `handle`, `url`, `sourceLabel`, and `sourceUrl`.
- Produces: `SOCIAL_MEDIA_METRICS: Array<{id,label,value,kind,suffix,display}>`.
- Produces: `formatSocialMetric(metric, weight): string`.
- Produces: `getSocialMetricWeight(progress, index, reducedMotion): number`.
- Produces: `<SocialMediaPerformance progress reducedMotion />`.

- [x] **Step 1: Write failing data tests**

Add imports for `SOCIAL_MEDIA_METRICS`, `SOCIAL_MEDIA_PROFILE`, and
`SOCIAL_PERFORMANCE_START`, then add:

```js
it('owns the approved social performance data without invented insights',()=>{
  expect(SOCIAL_PERFORMANCE_START).toBe(.88)
  expect(SOCIAL_MEDIA_PROFILE).toEqual({
    handle:'@sanchari.kannadiga',
    url:'https://www.instagram.com/sanchari.kannadiga/',
    sourceLabel:'Public estimates · July 2026',
    sourceUrl:'https://getreelax.com/instagram/sanchari.kannadiga/',
  })
  expect(SOCIAL_MEDIA_METRICS).toEqual([
    {
      id:'followers',
      label:'Followers',
      value:156200,
      kind:'compact',
      suffix:'+',
      display:'156K+',
    },
    {
      id:'total-reach',
      label:'Total Reach',
      value:null,
      kind:'pending',
      suffix:'',
      display:'Updating soon',
    },
    {
      id:'reel-views',
      label:'Reel Views',
      value:815700,
      kind:'compact',
      suffix:' avg.',
      display:'815K avg.',
    },
    {
      id:'engagement',
      label:'Engagement',
      value:46.7,
      kind:'percent',
      suffix:'%',
      display:'46.7%',
    },
    {
      id:'viral-reels',
      label:'Viral Reels',
      value:null,
      kind:'pending',
      suffix:'',
      display:'Updating soon',
    },
    {
      id:'audience-insights',
      label:'Audience Insights',
      value:null,
      kind:'pending',
      suffix:'',
      display:'Updating soon',
    },
  ])
})
```

- [x] **Step 2: Write failing component and formatter tests**

Create `src/components/SocialMediaPerformance.test.jsx`:

```jsx
import {render,screen} from '@testing-library/react'
import {describe,expect,it} from 'vitest'
import {
  formatSocialMetric,
  getSocialMetricWeight,
} from './SocialMediaPerformance'
import SocialMediaPerformance from './SocialMediaPerformance'
import {SOCIAL_MEDIA_METRICS} from '../journey/chapters'

describe('SocialMediaPerformance',()=>{
  it('formats deterministic public values and stable pending states',()=>{
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[0],1)).toBe('156K+')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[2],1)).toBe('815K avg.')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[3],1)).toBe('46.7%')
    expect(formatSocialMetric(SOCIAL_MEDIA_METRICS[1],.5))
      .toBe('Updating soon')
    expect(getSocialMetricWeight(.88,0,false)).toBe(0)
    expect(getSocialMetricWeight(.91,5,false)).toBe(1)
    expect(getSocialMetricWeight(.88,5,true)).toBe(1)
  })

  it('renders exact semantic metrics and confirmed profile links',()=>{
    render(<SocialMediaPerformance progress={.91} reducedMotion={false}/>)
    expect(screen.getByRole('article',{
      name:'Social media performance',
    })).toBeInTheDocument()
    expect(screen.getByRole('heading',{
      name:'Reach that moves people.',
    })).toBeInTheDocument()
    expect([...screen.getByLabelText('Instagram performance metrics')
      .querySelectorAll('dt')].map(node=>node.textContent)).toEqual(
      SOCIAL_MEDIA_METRICS.map(metric=>metric.label),
    )
    SOCIAL_MEDIA_METRICS.forEach(metric=>{
      expect(screen.getByLabelText(`${metric.label}: ${metric.display}`))
        .toBeInTheDocument()
    })
    expect(screen.getByRole('link',{
      name:'Open @sanchari.kannadiga on Instagram',
    })).toHaveAttribute(
      'href',
      'https://www.instagram.com/sanchari.kannadiga/',
    )
    expect(screen.getByRole('link',{
      name:'Public estimates · July 2026',
    })).toHaveAttribute(
      'href',
      'https://getreelax.com/instagram/sanchari.kannadiga/',
    )
  })

  it('renders final visual values immediately for reduced motion',()=>{
    render(<SocialMediaPerformance progress={.88} reducedMotion/>)
    expect(screen.getByText('156K+')).toBeInTheDocument()
    expect(screen.getByText('815K avg.')).toBeInTheDocument()
    expect(screen.getByText('46.7%')).toBeInTheDocument()
  })
})
```

- [x] **Step 3: Verify RED**

Run:

```bash
npm test -- --run src/journey/chapters.test.js src/components/SocialMediaPerformance.test.jsx
```

Expected: FAIL because the social constants, formatter, and component do not
exist.

- [x] **Step 4: Add the authoritative model**

Add this before `CHAPTERS` in `src/journey/chapters.js`:

```js
export const SOCIAL_PERFORMANCE_START=.88
export const SOCIAL_MEDIA_PROFILE={
  handle:'@sanchari.kannadiga',
  url:'https://www.instagram.com/sanchari.kannadiga/',
  sourceLabel:'Public estimates · July 2026',
  sourceUrl:'https://getreelax.com/instagram/sanchari.kannadiga/',
}
export const SOCIAL_MEDIA_METRICS=[
  {id:'followers',label:'Followers',value:156200,kind:'compact',suffix:'+',display:'156K+'},
  {id:'total-reach',label:'Total Reach',value:null,kind:'pending',suffix:'',display:'Updating soon'},
  {id:'reel-views',label:'Reel Views',value:815700,kind:'compact',suffix:' avg.',display:'815K avg.'},
  {id:'engagement',label:'Engagement',value:46.7,kind:'percent',suffix:'%',display:'46.7%'},
  {id:'viral-reels',label:'Viral Reels',value:null,kind:'pending',suffix:'',display:'Updating soon'},
  {id:'audience-insights',label:'Audience Insights',value:null,kind:'pending',suffix:'',display:'Updating soon'},
]
```

- [x] **Step 5: Implement the focused component**

Create `src/components/SocialMediaPerformance.jsx`:

```jsx
import {
  SOCIAL_MEDIA_METRICS,
  SOCIAL_MEDIA_PROFILE,
  SOCIAL_PERFORMANCE_START,
} from '../journey/chapters'

const clamp=value=>Math.min(1,Math.max(0,value))
const smootherstep=value=>{
  const t=clamp(value)
  return t*t*t*(t*(t*6-15)+10)
}

export const getSocialMetricWeight=(progress,index,reducedMotion=false)=>{
  if(reducedMotion) return 1
  const local=clamp(
    (progress-SOCIAL_PERFORMANCE_START)/(.91-SOCIAL_PERFORMANCE_START),
  )
  const start=index*.06
  return smootherstep((local-start)/(1-start))
}

export const formatSocialMetric=(metric,weight=1)=>{
  if(metric.value===null) return metric.display
  const value=metric.value*clamp(weight)
  if(metric.kind==='percent') return `${value.toFixed(1)}${metric.suffix}`
  return `${Math.floor(value/1000)}K${metric.suffix}`
}

export default function SocialMediaPerformance({
  progress,
  reducedMotion=false,
}){
  const entrance=reducedMotion
    ?1
    :smootherstep((progress-SOCIAL_PERFORMANCE_START)/.01)
  return <article
    className="chapter chapter--social-performance"
    aria-label="Social media performance"
    style={{'--performance-progress':entrance}}
  >
    <header className="social-performance__header">
      <div>
        <p className="chapter__kicker">Social Media Performance</p>
        <h1>Reach that moves people.</h1>
      </div>
      <a
        href={SOCIAL_MEDIA_PROFILE.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${SOCIAL_MEDIA_PROFILE.handle} on Instagram`}
      >
        {SOCIAL_MEDIA_PROFILE.handle} ↗
      </a>
    </header>
    <dl
      className="social-performance__metrics"
      aria-label="Instagram performance metrics"
    >
      {SOCIAL_MEDIA_METRICS.map((metric,index)=>{
        const weight=getSocialMetricWeight(
          progress,
          index,
          reducedMotion,
        )
        return <div
          className={`social-performance__metric social-performance__metric--${metric.kind}`}
          key={metric.id}
          style={{'--metric-progress':weight}}
        >
          <dt>{metric.label}</dt>
          <dd aria-label={`${metric.label}: ${metric.display}`}>
            <span aria-hidden="true">
              {formatSocialMetric(metric,weight)}
            </span>
          </dd>
        </div>
      })}
    </dl>
    <a
      className="social-performance__source"
      href={SOCIAL_MEDIA_PROFILE.sourceUrl}
      target="_blank"
      rel="noreferrer"
    >
      {SOCIAL_MEDIA_PROFILE.sourceLabel}
    </a>
  </article>
}
```

- [x] **Step 6: Verify GREEN and commit**

Run:

```bash
npm test -- --run src/journey/chapters.test.js src/components/SocialMediaPerformance.test.jsx
```

Expected: both files pass.

Commit:

```bash
git add src/journey/chapters.js src/journey/chapters.test.js src/components/SocialMediaPerformance.jsx src/components/SocialMediaPerformance.test.jsx
git commit -m "Add social performance metric component"
```

---

### Task 2: Integrate and style the scroll-only Plans tail

**Files:**
- Modify: `src/components/ChapterContent.jsx`
- Modify: `src/components/ChapterContent.test.jsx`
- Modify: `src/components/JourneyShell.jsx`
- Modify: `src/components/JourneyShell.test.jsx`
- Modify: `src/index.css`

**Interfaces:**
- Consumes: `SOCIAL_PERFORMANCE_START` and `SocialMediaPerformance`.
- Changes: `ChapterContent` accepts `reducedMotion=false`.
- Preserves: the `CHAPTERS` array, four menu entries, `.94` Contact boundary,
  and all existing Plans actions before `.88`.

- [x] **Step 1: Write failing boundary and propagation tests**

Add this component test:

```jsx
it('replaces only the tail of Plans with social performance',()=>{
  const plans=CHAPTERS.find(({id})=>id==='plans')
  const {rerender}=render(
    <ChapterContent
      chapter={plans}
      progress={.879999}
      onPlan={vi.fn()}
    />,
  )
  expect(screen.getByText('Three expedition chapters.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Social media performance'))
    .not.toBeInTheDocument()
  rerender(
    <ChapterContent
      chapter={plans}
      progress={.88}
      reducedMotion
      onPlan={vi.fn()}
    />,
  )
  expect(screen.getByLabelText('Social media performance'))
    .toBeInTheDocument()
  expect(screen.queryByText('Three expedition chapters.'))
    .not.toBeInTheDocument()
})
```

In `JourneyShell.test.jsx`, add `afterEach` to the Vitest import, then hoist a
`renderChapter` spy and mock `ChapterContent` as a null renderer that records
props:

```jsx
const renderChapter=vi.hoisted(()=>vi.fn())
vi.mock('./ChapterContent',()=>({default:props=>{
  renderChapter(props)
  return null
}}))
```

Clear it and restore globals with:

```jsx
beforeEach(()=>{
  renderProgress.mockClear()
  renderChapter.mockClear()
})
afterEach(()=>vi.unstubAllGlobals())
```

Then add:

```jsx
it('passes reduced-motion state to chapter overlays',()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})))
  render(<JourneyShell/>)
  expect(renderChapter.mock.calls.at(-1)[0].reducedMotion).toBe(true)
})
```

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -- --run src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx
```

Expected: FAIL because the performance branch and reduced-motion prop are not
wired.

- [x] **Step 3: Integrate the component**

In `ChapterContent.jsx`, import `SOCIAL_PERFORMANCE_START` and
`SocialMediaPerformance`, accept `reducedMotion=false`, and return the
performance component before standard Plans markup:

```jsx
if(
  chapter.layout==='monument-plans'&&
  progress>=SOCIAL_PERFORMANCE_START
)return <SocialMediaPerformance
  progress={progress}
  reducedMotion={reducedMotion}
/>
```

In `JourneyShell.jsx`, pass the existing value:

```jsx
<ChapterContent
  chapter={chapter}
  progress={progress}
  reducedMotion={reducedMotion}
  onPlan={book}
  onBook={()=>book()}
/>
```

- [x] **Step 4: Add the glass dashboard styling**

Append desktop styles beside the other architectural chapters:

```css
.chapter--social-performance{left:7vw;right:auto;bottom:7vh;width:min(1060px,82vw);padding:clamp(1.4rem,2.5vw,2.5rem);border:1px solid rgba(255,255,255,.3);border-radius:30px;background:linear-gradient(145deg,rgba(14,26,31,.8),rgba(80,93,45,.56));box-shadow:0 30px 90px rgba(3,10,14,.38),inset 0 1px rgba(255,255,255,.15);-webkit-backdrop-filter:blur(21px) saturate(140%);backdrop-filter:blur(21px) saturate(140%);opacity:var(--performance-progress);transform:translateY(calc((1 - var(--performance-progress))*26px));text-shadow:0 3px 22px rgba(0,0,0,.42)}
.social-performance__header{display:flex;align-items:flex-start;justify-content:space-between;gap:2rem}.social-performance__header h1{margin:.35rem 0 1.1rem;font:400 clamp(3.2rem,5.7vw,6.5rem)/.86 var(--font-display)}.social-performance__header>a{flex:none;margin-top:.35rem;padding:.65rem .85rem;border:1px solid rgba(255,190,133,.45);border-radius:999px;color:#ffd5a3;font-size:.68rem;letter-spacing:.09em;text-transform:uppercase}.social-performance__metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem 1.4rem;margin:0}.social-performance__metric{position:relative;padding:.8rem .65rem .65rem;border-top:1px solid rgba(255,224,165,.22)}.social-performance__metric::before{content:"";position:absolute;left:0;right:0;top:-1px;height:1px;background:linear-gradient(90deg,#ff9e80,#ffd792);transform:scaleX(var(--metric-progress));transform-origin:left}.social-performance__metric dt{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,248,237,.72)}.social-performance__metric dd{margin:.3rem 0 0;font:400 clamp(2.1rem,3.7vw,4.2rem)/.9 var(--font-display);color:#fff8ed}.social-performance__metric--pending dd{font-size:clamp(1.5rem,2.5vw,2.7rem);color:rgba(255,248,237,.72)}.social-performance__source{display:inline-block;margin-top:1rem;color:rgba(255,248,237,.56);font-size:.58rem;letter-spacing:.12em;text-transform:uppercase}
```

Append the mobile override after the existing architectural mobile rules:

```css
@media(max-width:700px){.chapter--social-performance{left:1rem;right:2.65rem;top:4.5rem;bottom:auto;width:auto;padding:1rem;border-radius:20px}.social-performance__header{display:block}.social-performance__header h1{max-width:280px;margin:.25rem 0 .65rem;font-size:clamp(2.35rem,10vw,3.15rem)}.social-performance__header>a{display:inline-block;margin:0 0 .55rem;padding:.42rem .6rem;font-size:.54rem}.social-performance__metrics{gap:.18rem .55rem}.social-performance__metric{padding:.5rem .25rem .45rem}.social-performance__metric dt{font-size:clamp(.64rem,2.7vw,.7rem);line-height:1.25}.social-performance__metric dd{font-size:clamp(1.5rem,7vw,2.15rem)}.social-performance__metric--pending dd{font-size:clamp(.92rem,4.2vw,1.2rem);line-height:1}.social-performance__source{margin-top:.6rem;font-size:.5rem}}
```

The existing global reduced-motion rule suppresses CSS transitions; the
component supplies final numeric values when `reducedMotion` is true.

- [x] **Step 5: Verify integration and commit**

Run:

```bash
npm test -- --run src/components/ChapterContent.test.jsx src/components/JourneyShell.test.jsx src/components/SocialMediaPerformance.test.jsx
npm run build
```

Expected: all focused tests and the production build pass.

Commit:

```bash
git add src/components/ChapterContent.jsx src/components/ChapterContent.test.jsx src/components/JourneyShell.jsx src/components/JourneyShell.test.jsx src/index.css
git commit -m "Integrate social performance scroll beat"
```

---

### Task 3: Add fail-closed browser evidence and finish delivery

**Files:**
- Modify: `scripts/visual-qa.mjs`
- Modify: `scripts/visual-qa.test.js`
- Modify: `design-qa.md`
- Modify: `docs/superpowers/plans/2026-07-24-social-media-performance.md`

**Interfaces:**
- Adds: deterministic `social-performance` capture at `.91`.
- Captures: exact metric labels, final display values, profile handle,
  source note, item font sizes, and dashboard rectangle.
- Requires: forest-jeep continuity and zero overlap with controls.

- [x] **Step 1: Write failing visual-QA source tests**

Extend `scripts/visual-qa.test.js`:

```js
it('verifies the social performance dashboard before Contact',()=>{
  expect(source).toContain("name:'social-performance'")
  expect(source).toContain('progress:.91')
  expect(source).toContain('labels:SOCIAL_MEDIA_METRICS.map')
  expect(source).toContain('values:SOCIAL_MEDIA_METRICS.map')
  expect(source).toContain("document.querySelector('.chapter--social-performance')")
  expect(source).toContain('layout.content.performance')
  expect(source).toContain('performance.itemFontSize<10')
  expect(source).toContain('rectanglesOverlap(performance.rect,control.rect)')
})
```

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -- --run scripts/visual-qa.test.js
```

Expected: FAIL because the state and performance evidence do not exist.

- [x] **Step 3: Add the deterministic state and DOM evidence**

Import `SOCIAL_MEDIA_METRICS` and `SOCIAL_MEDIA_PROFILE`. Add this after
`forest-finale`:

```js
{
  name:'social-performance',
  progress:.91,
  phase:'forest-jeep',
  activeBiome:'forest',
  activeTransport:'jeep',
  content:{
    title:'Reach that moves people.',
    creatorCard:false,
    body:'',
    items:[],
    performance:{
      handle:SOCIAL_MEDIA_PROFILE.handle,
      source:SOCIAL_MEDIA_PROFILE.sourceLabel,
      labels:SOCIAL_MEDIA_METRICS.map(metric=>metric.label),
      values:SOCIAL_MEDIA_METRICS.map(metric=>metric.display),
    },
  },
},
```

Inside the browser layout collector, query the performance article and return:

```js
const performanceElement=document.querySelector(
  '.chapter--social-performance',
)
const performanceRect=performanceElement?.getBoundingClientRect()
const performance=performanceElement?{
  handle:performanceElement
    .querySelector('.social-performance__header>a')
    ?.textContent?.replace('↗','').trim()||'',
  source:performanceElement
    .querySelector('.social-performance__source')
    ?.textContent?.trim()||'',
  labels:[...performanceElement.querySelectorAll('dt')]
    .map(node=>node.textContent?.trim()||''),
  values:[...performanceElement.querySelectorAll('dd')]
    .map(node=>node.getAttribute('aria-label')?.split(': ').slice(1).join(': ')||''),
  itemFontSize:parseFloat(getComputedStyle(
    performanceElement.querySelector('dt'),
  ).fontSize),
  rect:{
    left:Math.round(performanceRect.left),
    top:Math.round(performanceRect.top),
    right:Math.round(performanceRect.right),
    bottom:Math.round(performanceRect.bottom),
  },
}:null
```

Add `performance` to `layout.content`. In the content assertion:

```js
if(state.content.performance){
  const performance=layout.content.performance
  for(const key of ['handle','source','labels','values']){
    if(
      JSON.stringify(performance[key])!==
      JSON.stringify(state.content.performance[key])
    ){
      throw new Error(`${state.name} performance ${key} mismatch`)
    }
  }
  if(requested==='mobile'&&performance.itemFontSize<10){
    throw new Error(
      `Mobile performance type is too small: ${performance.itemFontSize}px`,
    )
  }
  for(const control of layout.controls){
    if(rectanglesOverlap(performance.rect,control.rect)){
      throw new Error(
        `${state.name} performance card overlaps ${control.name}`,
      )
    }
  }
}
```

- [x] **Step 4: Verify source tests GREEN**

Run:

```bash
npm test -- --run scripts/visual-qa.test.js
```

Expected: all visual-QA source tests pass.

- [x] **Step 5: Build and capture the affected state**

Run:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4175
```

In separate commands, capture:

```bash
env QA_BASE_URL=http://127.0.0.1:4175/ QA_OUTPUT_DIR=/tmp/tourist-management-social-qa QA_STATE=social-performance node scripts/visual-qa.mjs --project desktop
env QA_BASE_URL=http://127.0.0.1:4175/ QA_OUTPUT_DIR=/tmp/tourist-management-social-qa QA_STATE=social-performance node scripts/visual-qa.mjs --project mobile
```

Expected: exact six metrics, final public displays, three pending displays,
forest-jeep continuity, no control overlap, no clipping/overflow, no console
failures, and zero audio controls. Inspect both full-page images.

- [x] **Step 6: Update evidence and run complete verification**

Update `design-qa.md` to document the new `.91` state, source labels,
progress-driven animation, metric readability, and screenshot paths.

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: every test passes, the build exits zero with only the existing
non-blocking bundle-size advisory, and the diff check is empty.

- [ ] **Step 7: Review, commit, and push**

Request independent review against
`docs/superpowers/specs/2026-07-24-social-media-performance-design.md`.
Resolve all Critical and Important findings, rerun affected verification, and
mark every plan checkbox complete.

Commit and push:

```bash
git add scripts/visual-qa.mjs scripts/visual-qa.test.js design-qa.md docs/superpowers/plans/2026-07-24-social-media-performance.md
git commit -m "Verify social performance dashboard"
git push origin main
```
