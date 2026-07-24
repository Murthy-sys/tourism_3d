# Task 6 camera smoothing design

## Recommendation

Keep every cinematic keyframe exactly where it is and replace only the
`.12 -> .18` linear interpolation with a bounded-slope, softened-linear
easing. Use the existing quintic smootherstep shape as the **velocity ramp**,
with a normalized ramp width of `r = .2` at each end and a constant-velocity
middle.

This is the smallest fix that satisfies all of the constraints:

- `.12` and `.18` remain exact endpoint frames.
- The production full-party composition at exactly `.12` is unchanged.
- All states at and after `.18` are unchanged; in particular, every retained
  frame at `.28` and later is unchanged.
- Motion is monotonic and has no overshoot.
- Both one-sided velocities are zero at `.12` and `.18`, matching the
  neighboring smootherstep segments. The combined rail is C2 at those
  boundaries, exceeding the C1 minimum.
- The worst `.001` camera-position jump on the new segment is `0.714462`,
  below the existing `.8` limit.

Do not move or add camera keyframes. Do not change runtime camera damping;
the defect is in the desired rail velocity, before damping.

## Root cause and rejected alternatives

The neighboring `.08 -> .12` and `.18 -> .28` segments use position
smootherstep, whose endpoint velocity is zero. The current `.12 -> .18`
linear segment instead has a constant nonzero velocity. The frames are
position-continuous, but velocity jumps from zero to the linear rate at `.12`
and from the linear rate back to zero at `.18`.

The direct alternatives do not satisfy the full constraint set:

1. **Plain smootherstep on `.12 -> .18`: rejected.** Its maximum normalized
   derivative is `1.875`. The camera displacement is
   `||[-3.5, 2.8, -34]|| = 34.294169`, so its derivative-bound jump over
   `.001` progress is
   `34.294169 * 1.875 * .001 / .06 = 1.071693`. That exceeds `.8`.
2. **Cubic smoothstep on the whole segment: rejected.** Its maximum
   derivative is `1.5`, giving a camera jump bound of `0.857354`, still over
   `.8`.
3. **Add or move keyframes while retaining ordinary smootherstep: rejected.**
   The `.12` and `.18` positions and times are fixed. Subdividing their
   straight path into ordinary smootherstep segments cannot lower the peak
   enough: for every subsegment to remain below `.8`, each distance/time
   ratio would have to be at most `.8 / (.001 * 1.875) = 426.667`. Across
   `.06` progress that permits at most `25.6` units of total displacement,
   less than the required straight-line distance `34.294169`. Non-collinear
   helper points only increase path length, and each helper keyframe also
   introduces another zero-velocity pause.

The softened-linear easing avoids the `1.5`/`1.875` peak-slope penalty while
still tapering velocity smoothly to zero.

## Easing formula

Let:

```text
t = clamp((progress - .12) / .06, 0, 1)
r = .2
M = 1 / (1 - r) = 1.25
S(u) = 6u^5 - 15u^4 + 10u^3
A(u) = u^6 - 3u^5 + (5/2)u^4
```

`S` is the existing normalized smootherstep curve and `A` is its integral:
`A'(u) = S(u)`, `A(0) = 0`, and `A(1) = 1/2`.

Use:

```text
             M r A(t/r)                     0 <= t < r
E(t) =       M (t - r/2)                    r <= t <= 1-r
             1 - M r A((1-t)/r)             1-r < t <= 1
```

Then interpolate both camera and target with the same scalar:

```text
position(progress) = start + (end - start) * E(t)
```

The normalization follows from the area under the velocity curve:

```text
M * (r/2 + (1 - 2r) + r/2) = M * (1-r) = 1
```

Its derivative is:

```text
              M S(t/r)                      0 <= t < r
E'(t) =       M                             r <= t <= 1-r
              M S((1-t)/r)                  1-r < t <= 1
```

Therefore `0 <= E'(t) <= 1.25`, so the movement is monotonic, cannot
overshoot, and has maximum normalized slope `1.25`. Since smootherstep and
its first two endpoint derivatives are zero, the new segment matches the
adjacent position-smootherstep segments in first and second derivative at
`.12` and `.18`.

In journey progress, the smooth acceleration bands are `.12 -> .132` and
`.168 -> .18`; the middle `.132 -> .168` is constant velocity.

## Numerical bounds

For the camera:

```text
delta                       = [-3.5, 2.8, -34]
linear velocity             = [-58.3333, 46.6667, -566.6667]
maximum softened velocity   = [-72.9167, 58.3333, -708.3333]
maximum velocity norm       = 714.461846 units / progress
maximum .001 jump           = 0.714462
```

For the target:

```text
delta                       = [-2.6, 1.1, -32.5]
linear velocity             = [-43.3333, 18.3333, -541.6667]
maximum softened velocity   = [-54.1667, 22.9167, -677.0833]
maximum velocity norm       = 679.633020 units / progress
maximum .001 jump           = 0.679633
```

A direct dense evaluation of all 1,000 existing `.001` rail intervals with
this easing has a global maximum jump of `0.714462`, on the constant-velocity
part of `.12 -> .18`. Thus the existing dense `<= .8` regression retains
about `.0855` units of margin.

The exact mathematical one-sided velocities are:

```text
cameraVelocity(.12-) = cameraVelocity(.12+) = [0, 0, 0]
targetVelocity(.12-) = targetVelocity(.12+) = [0, 0, 0]
cameraVelocity(.18-) = cameraVelocity(.18+) = [0, 0, 0]
targetVelocity(.18-) = targetVelocity(.18+) = [0, 0, 0]
```

## Test-first change

### RED: boundary velocity regression

Add a focused test in `src/three/journeyData.test.js` before changing
production code. Use `h = 1e-5` and compute backward and forward one-sided
secant velocities for both `cameraPosition` and `cameraTarget` at `.12` and
`.18`:

```js
const velocity=(from,to,h)=>from.map((value,axis)=>
  (to[axis]-value)/h
)
const difference=(a,b)=>Math.hypot(...a.map((value,axis)=>value-b[axis]))
const magnitude=vector=>Math.hypot(...vector)

for(const boundary of [.12,.18]){
  const before=getJourneyState(boundary-h)
  const at=getJourneyState(boundary)
  const after=getJourneyState(boundary+h)

  for(const field of ['cameraPosition','cameraTarget']){
    const left=velocity(before[field],at[field],h)
    const right=velocity(at[field],after[field],h)

    expect(magnitude(left)).toBeLessThan(1e-3)
    expect(magnitude(right)).toBeLessThan(1e-3)
    expect(difference(left,right)).toBeLessThan(1e-3)
  }
}
```

This fails for the current implementation for the intended reason: the
`.12+` and `.18-` camera velocity magnitudes are approximately `571.569`,
not approximately zero.

The `1e-3` tolerance is deliberately above floating-point/secant error but
far below any visible discontinuity. With the proposed quintic velocity
ramp, the new segment's camera secant magnitude at `h = 1e-5` is about
`1.03e-6`; the neighboring smootherstep secants are about `2.4e-5`.

### GREEN: minimal production change

Add one local normalized softened-linear helper and one interpolation
dispatch value for the `.12` keyframe. Replace its current
`interpolation: 'linear'` marker with the new local mode. Leave all keyframe
coordinates, all keyframe progress values, the exact-endpoint branch, and
the default smootherstep branch unchanged.

### Existing and guardrail assertions

Run and retain these existing regressions:

- The exact coach/departure/mountain-entry frame test, including `.12` and
  `.18`.
- The production desktop full-party framing test at `.12`.
- The complete dense rail `<= .8` jump test.
- The focused journey and integration suites named in the blocker review.

Add a small monotonic guardrail for `.12 -> .18`: at dense samples, project
each camera and target displacement onto its complete segment delta, assert
that the scalar projection never decreases, remains in `[0,1]`, and reaches
exactly `0` and `1` at the endpoints. This is preferable to checking only
one coordinate and directly states the no-reversal/no-overshoot requirement.

No new frame snapshots after `.18` are required if the interpolation
dispatch remains metadata on the starting `.12` keyframe: by construction,
the helper is unreachable for every `progress >= .18`. The existing exact
keyframe and integration coverage should still be run to catch an accidental
change in dispatch direction.

## Compatibility and scope

This easing is deliberately local. Every unmarked cinematic segment
continues to use `smootherstep(a.p, b.p, value)`. The `.08 -> .12` and
`.18 -> .28` segments are not recalculated or retimed. At each join, both
the existing smootherstep segment and the softened-linear segment have zero
first and second derivative, so there is no velocity or acceleration seam.

Runtime damping and the per-frame movement cap remain useful rendering
controls, but they are not part of this fix and should not be changed.
