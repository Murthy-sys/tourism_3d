# First-Frame Startup Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the first-click black screen by rendering the journey before the loader reaches 100% and before Start is enabled.

**Architecture:** Keep `JourneyShell` mounted for the entire app lifecycle. Propagate a one-shot `onReady` signal from the first successful Three.js render—or the activated CSS fallback—through `Hero3D` and `JourneyShell` to `App`; make `Preloader` reserve 100% for that signal.

**Tech Stack:** React 18, Three.js, Vitest, Testing Library.

## Global Constraints

- Loader progress cannot reach 100 before scene or fallback readiness.
- Clicking Start must not mount or remount `JourneyShell`.
- Existing gate animation and journey behavior remain unchanged.

---

### Task 1: Pin startup orchestration

**Files:**
- Create: `src/App.test.jsx`
- Create: `src/components/Preloader.test.jsx`
- Modify: `src/components/Hero3D.test.jsx`
- Modify: `src/components/JourneyShell.test.jsx`

- [ ] Test that `JourneyShell` is mounted during loading, gate, and site phases without remounting.
- [ ] Test that Preloader remains below 100 while `ready=false` and completes only after `ready=true`.
- [ ] Test that Hero3D forwards `onReady` and reports fallback readiness.
- [ ] Test that JourneyShell forwards one readiness callback from Hero3D/fallback.
- [ ] Run focused tests and confirm failure before implementation.

### Task 2: Implement first-frame readiness

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/Preloader.jsx`
- Modify: `src/components/Hero3D.jsx`
- Modify: `src/components/JourneyShell.jsx`
- Modify: `src/three/indiaJourney.js`

- [ ] Always render `JourneyShell` and layer loading/gate UI above it.
- [ ] Add an `onReady` option to `createIndiaJourney` and invoke it exactly once after the first `renderer.render`.
- [ ] Pass readiness through Hero3D and JourneyShell; treat initialization failure/context fallback as ready after fallback activation.
- [ ] Replace random completion with progress capped at 95 until `ready`, then animate to 100 and dismiss.
- [ ] Clean up loader intervals/timeouts on unmount.

### Task 3: Verify

**Files:**
- Verify: startup files and tests

- [ ] Run the focused startup tests.
- [ ] Run `npm test`.
- [ ] Run a cold browser load and verify Start reveals a non-black rendered frame.
- [ ] Run `git diff --check` and inspect the scoped diff.
