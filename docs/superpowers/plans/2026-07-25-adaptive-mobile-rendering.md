# Adaptive Mobile Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render clean antialiased mobile graphics at the highest resolution each phone can sustain without visible resolution oscillation or prolonged lag.

**Architecture:** Add pure renderer-profile and adaptive-quality helpers to `indiaJourney.js`, keeping their policy independently testable. The Three.js journey will use the profile when creating the renderer, then feed completed-frame durations to a mobile-only controller that can lower the pixel ratio through the existing resize path.

**Tech Stack:** React, Three.js, JavaScript, Vitest, Vite.

## Global Constraints

- Mobile WebGL antialiasing is enabled.
- Mobile pixel ratio starts between `1.25` and `1.75`, based on device pixel ratio.
- Quality can only step down from `1.75` to `1.5` to `1.25`.
- Startup warm-up and isolated slow frames cannot trigger a downgrade.
- A cooldown prevents repeated or oscillating changes.
- Desktop pixel ratio, shadows, scene geometry, materials, cameras, routes, motion timing, content, layout, reduced-motion behavior, and readiness behavior remain unchanged.
- Do not add post-processing or another full-screen render pass.

---

### Task 1: Device-aware renderer profile

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: viewport width and `window.devicePixelRatio`.
- Produces: `getRendererProfile(width: number, devicePixelRatio: number): {quality: 'mobile'|'desktop', antialias: boolean, pixelRatio: number}`.

- [ ] **Step 1: Write the failing renderer-profile tests**

Add `getRendererProfile` to the import list and add:

```js
it('starts mobile rendering sharp without exceeding its safe cap',()=>{
  expect(getRendererProfile(390,1)).toEqual({
    quality:'mobile',
    antialias:true,
    pixelRatio:1.25,
  })
  expect(getRendererProfile(390,1.5).pixelRatio).toBe(1.5)
  expect(getRendererProfile(390,3).pixelRatio).toBe(1.75)
})

it('preserves the desktop renderer profile',()=>{
  expect(getRendererProfile(1440,3)).toEqual({
    quality:'desktop',
    antialias:true,
    pixelRatio:2,
  })
})
```

- [ ] **Step 2: Run the focused test and confirm the missing export fails**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: FAIL because `getRendererProfile` is not exported.

- [ ] **Step 3: Implement the renderer profile**

Add beside `getRenderQuality`:

```js
export const getRendererProfile=(width,devicePixelRatio=1)=>{
  const quality=getRenderQuality(width)
  const ratio=Math.max(1,Number(devicePixelRatio)||1)
  return{
    quality,
    antialias:true,
    pixelRatio:quality==='mobile'
      ?THREE.MathUtils.clamp(ratio,1.25,1.75)
      :Math.min(ratio,2),
  }
}
```

Use the returned profile in `createIndiaJourney`:

```js
const rendererProfile=getRendererProfile(
  window.innerWidth,
  window.devicePixelRatio,
)
const quality=rendererProfile.quality
```

Pass `rendererProfile.antialias` to `WebGLRenderer` and
`rendererProfile.pixelRatio` to `renderer.setPixelRatio`.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the renderer profile**

```bash
git add src/three/indiaJourney.js src/three/indiaJourney.test.js
git commit -m "Improve initial mobile render quality"
```

---

### Task 2: Sustained-frame adaptive downgrade

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: initial pixel ratio and one completed-frame duration in milliseconds per `observe` call.
- Produces: `createAdaptivePixelRatioController(initialPixelRatio: number, options?: object)` returning `{observe(frameDurationMs: number): number|null, value(): number}`. `observe` returns a new ratio only when a downgrade occurs.

- [ ] **Step 1: Write failing controller tests**

Add `createAdaptivePixelRatioController` to the import list and add:

```js
it('ignores warm-up and isolated slow mobile frames',()=>{
  const controller=createAdaptivePixelRatioController(1.75,{
    warmupFrames:3,
    sampleFrames:4,
    cooldownFrames:3,
    slowFrameMs:22,
  })
  ;[40,40,40,16,16,40,16].forEach(ms=>
    expect(controller.observe(ms)).toBeNull()
  )
  expect(controller.value()).toBe(1.75)
})

it('steps down only after sustained slow rendering and respects its floor',()=>{
  const controller=createAdaptivePixelRatioController(1.75,{
    warmupFrames:0,
    sampleFrames:3,
    cooldownFrames:2,
    slowFrameMs:22,
  })
  expect([30,30,30].map(ms=>controller.observe(ms)))
    .toEqual([null,null,1.5])
  expect([30,30].map(ms=>controller.observe(ms))).toEqual([null,null])
  expect([30,30,30].map(ms=>controller.observe(ms)))
    .toEqual([null,null,1.25])
  expect([40,40,40].map(ms=>controller.observe(ms)))
    .toEqual([null,null,null])
  expect(controller.value()).toBe(1.25)
})
```

- [ ] **Step 2: Run the focused test and confirm the missing export fails**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: FAIL because `createAdaptivePixelRatioController` is not exported.

- [ ] **Step 3: Implement the pure adaptive controller**

Add:

```js
const MOBILE_PIXEL_RATIOS=[1.25,1.5,1.75]

export const createAdaptivePixelRatioController=(
  initialPixelRatio,
  {
    warmupFrames=90,
    sampleFrames=60,
    cooldownFrames=180,
    slowFrameMs=22,
  }={},
)=>{
  let ratio=THREE.MathUtils.clamp(
    initialPixelRatio,
    MOBILE_PIXEL_RATIOS[0],
    MOBILE_PIXEL_RATIOS.at(-1),
  )
  let warmup=Math.max(0,warmupFrames)
  let cooldown=0
  let samples=[]
  return{
    observe(frameDurationMs){
      if(warmup>0){
        warmup-=1
        return null
      }
      if(cooldown>0){
        cooldown-=1
        return null
      }
      samples.push(Math.max(0,frameDurationMs))
      if(samples.length<sampleFrames) return null
      const average=samples.reduce((sum,value)=>sum+value,0)/samples.length
      samples=[]
      if(average<=slowFrameMs||ratio<=MOBILE_PIXEL_RATIOS[0]) return null
      ratio=MOBILE_PIXEL_RATIOS
        .filter(candidate=>candidate<ratio)
        .at(-1)??MOBILE_PIXEL_RATIOS[0]
      cooldown=Math.max(0,cooldownFrames)
      return ratio
    },
    value:()=>ratio,
  }
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: PASS.

- [ ] **Step 5: Commit the adaptive controller**

```bash
git add src/three/indiaJourney.js src/three/indiaJourney.test.js
git commit -m "Add sustained mobile render adaptation"
```

---

### Task 3: Connect adaptation to the render loop

**Files:**
- Modify: `src/three/indiaJourney.js`
- Test: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: `rendererProfile.pixelRatio`, `createAdaptivePixelRatioController`, completed render duration, and the existing `resize()` function.
- Produces: mobile-only resolution downgrades through `renderer.setPixelRatio` followed by `resize()`.

- [ ] **Step 1: Add a failing integration-policy test**

Add:

```js
it('keeps desktop resolution outside the adaptive mobile controller',()=>{
  const desktop=getRendererProfile(1440,3)
  expect(desktop.quality).toBe('desktop')
  expect(desktop.pixelRatio).toBe(2)
})
```

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: PASS as a guard before render-loop wiring.

- [ ] **Step 2: Wire the controller into mobile rendering**

After `resize()` is defined, create the controller only for mobile:

```js
const adaptivePixelRatio=quality==='mobile'
  ?createAdaptivePixelRatioController(rendererProfile.pixelRatio)
  :null
```

Immediately after `renderer.render(scene,camera)`, observe the frame interval
already supplied by the journey clock:

```js
const nextPixelRatio=adaptivePixelRatio?.observe(delta*1000)
if(nextPixelRatio!==null&&nextPixelRatio!==undefined){
  renderer.setPixelRatio(nextPixelRatio)
  resize()
}
```

The warm-up window excludes startup compilation. The rolling average prevents a
single delayed animation frame or scroll event from reducing quality.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- src/three/indiaJourney.test.js`

Expected: PASS.

- [ ] **Step 4: Commit render-loop wiring**

```bash
git add src/three/indiaJourney.js src/three/indiaJourney.test.js
git commit -m "Adapt mobile resolution to render load"
```

---

### Task 4: Full verification

**Files:**
- Verify: `src/three/indiaJourney.js`
- Verify: `src/three/indiaJourney.test.js`

**Interfaces:**
- Consumes: completed implementation.
- Produces: verified test and production-build evidence.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Vite build succeeds. The existing chunk-size advisory may remain.

- [ ] **Step 3: Check patch hygiene**

Run: `git diff --check`

Expected: no whitespace errors.

- [ ] **Step 4: Inspect final scope**

Run:

```bash
git status --short
git diff --stat HEAD~3..HEAD
```

Expected: implementation is limited to the mobile renderer policy, tests, and
this plan. Visual browser capture remains a named limitation unless an approved
browser surface becomes available.
