# First-Frame Startup Readiness

## Goal

Eliminate the one-time black screen after Start by ensuring the journey has
already rendered before the Start gate can be dismissed.

## Root Cause

The current loader uses simulated random progress. `JourneyShell` and its WebGL
scene are mounted only after the gate’s 900 ms exit completes, so clicking Start
initiates first-time scene construction while the gate is disappearing.

## Lifecycle

1. Mount `JourneyShell` behind the loader immediately.
2. Initialize the WebGL journey while the loader remains fully opaque.
3. Signal readiness only after the scene has completed its first rendered frame.
4. Let displayed progress animate toward 95% while initialization is pending.
5. Show 100% only after the readiness signal.
6. Replace the loader with the Start gate while leaving the ready journey
   mounted underneath it.
7. On Start, animate only the gate away; do not remount the journey.

## Fallback

If WebGL initialization fails or context setup is unavailable, activate the
existing CSS fallback and report readiness after that fallback is present. The
loader must not wait indefinitely.

## Scope

This changes only first-load orchestration and readiness reporting. Journey
progress, chapter timing, cards, menu, booking, and later transitions remain
unchanged.

## Verification

Tests must verify that the journey is mounted during loading and gate phases,
100% is impossible before readiness, Start does not remount the journey, and
fallback readiness is supported. A cold-start browser check must verify that the
gate reveals a rendered canvas rather than a black frame.
