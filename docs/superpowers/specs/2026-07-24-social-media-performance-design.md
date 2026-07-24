# Social Media Performance Scroll Beat — Design

## Goal

Add one animated Social Media Performance beat immediately before the existing
“Where should we take you next?” Contact chapter. The beat should present
Sanchari Kannadiga’s Instagram proof in the same cinematic glass language as
the existing What We Offer card while leaving the menu and 3D journey intact.

## Scroll sequence

- Plans remains the active chapter from `.28` to `.94`.
- Existing plan content is shown for `.28 ≤ progress < .88`.
- Social Media Performance replaces the plan overlay for
  `.88 ≤ progress < .94`.
- Contact still begins at `.94`.
- The performance beat is scroll-only: it does not add a menu item or alter the
  four-chapter counter.
- No camera, environment, jeep, audio, handoff, or 3D timing changes are in
  scope.

## Content

The card contains:

- Kicker: `Social Media Performance`
- Heading: `Reach that moves people.`
- Profile link: `@sanchari.kannadiga`
- Six metrics in this exact order:
  1. Followers — `156K+`
  2. Total Reach — `Updating soon`
  3. Reel Views — `Updating soon`
  4. Engagement — `46.7%`
  5. Viral Reels — `Updating soon`
  6. Audience Insights — `Updating soon`
- Source note: `Public estimates · July 2026`

The two published values are rounded public estimates from the Reelax creator
profile for `@sanchari.kannadiga`: 156.2K followers and 46.73% engagement.
Reelax's 815.7K figure is a general average-views value, not a reel-only
metric, so it is intentionally not displayed as `Reel Views`. These are static
portfolio data, not a live Instagram API feed. Total Reach, Reel Views, Viral
Reels, and Audience Insights remain explicitly marked as updating until the
creator supplies private Instagram Insights.

All six entries live in one authoritative `SOCIAL_MEDIA_METRICS` array so later
updates require changing data rather than component markup. Public numeric
entries retain raw values and formatting metadata; pending entries use
`value: null` and an explicit fallback label.

## Visual composition

### Desktop

- One wide translucent dark-to-olive glass card sits over the forest finale.
- The kicker, heading, and profile link form the card header.
- Metrics use a two-column by three-row grid with warm divider lines.
- Large display numbers dominate each cell while labels remain compact and
  uppercase.
- A restrained coral-to-gold accent references Instagram without introducing a
  bright social-media gradient that would conflict with the journey palette.
- The card leaves the jeep route visible and clears the menu, chapter counter,
  and scroll cue.

### Mobile

- The same card stays inside the safe viewport and retains a two-column grid.
- Responsive heading and metric type remain readable at `390×844`.
- Long fallback values wrap without colliding with adjacent cells.
- The card clears the top-right menu, bottom-left counter, and right-side scroll
  cue.

## Animation

- Animation is derived from journey progress rather than timers or an
  IntersectionObserver.
- Beat-local progress is normalized from `.88–.94`.
- The card fades and rises into place first.
- The two numeric values count upward with a short stagger and finish by
  approximately `.91`, leaving a final-value dwell before Contact.
- Divider lines draw in with the same stagger.
- Pending metrics remain stable as `Updating soon`.
- Scrolling backward reverses the visual progress deterministically.
- When reduced motion is enabled, final values render immediately and transform
  animation is suppressed.

## Component boundaries

- `src/journey/chapters.js` owns the exact metric data and public source
  metadata.
- A dedicated `SocialMediaPerformance` component owns semantic metric markup,
  progress formatting, and accessible final values.
- `ChapterContent` selects the performance component only for the tail of the
  Plans chapter.
- `JourneyShell` passes its existing reduced-motion value through
  `ChapterContent`.
- Existing obsolete section-based statistics components are not reused.

## Accessibility

- Metrics use a semantic description list.
- Each metric exposes a stable final-value accessible label.
- Changing visual digits are hidden from assistive technology to prevent
  repeated announcements during scrolling.
- The profile link has an explicit accessible name and opens the confirmed
  Instagram profile safely.
- Reduced-motion behavior renders the final readable state without count-up
  animation.

## Failure and update behavior

- No network request is made from the portfolio.
- If a metric has no approved value, the card renders `Updating soon`; it never
  invents or derives private reach or audience data.
- Future private values can replace the pending entries in
  `SOCIAL_MEDIA_METRICS` without changing layout code.
- The public-source date remains visible so static estimates are not presented
  as live data.

## Verification

- Data tests pin metric order, raw public values, formatting, pending states,
  source date, and confirmed profile URL.
- Component tests pin the `.88` performance boundary, `.94` Contact boundary,
  exact labels and displays, semantic markup, link behavior, progress-driven
  count output, and reduced-motion final values.
- Visual QA adds a deterministic state near `.91` requiring forest-jeep
  continuity, all six metrics, two final public values, four pending labels, no console
  failures, no audio controls, no overflow, no clipping, and no control
  overlap.
- Desktop acceptance is `1440×900`; mobile acceptance is `390×844`.
- The full automated suite, production build, independent review, main-branch
  commit, and push remain required.
