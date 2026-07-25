# Boat What We Offer Card

## Goal

Show one “What We Offer” card throughout the full boating journey and remove
the “Why Brands Should Work With Us” card.

## Behavior

- Define the offer-card interval as progress `0.42–0.74`, covering boat
  boarding, open-water travel, and the boat-to-jeep docking handoff.
- Do not show the offer card before `0.42` or at/after `0.74`.
- Remove the pre-boating two-card brand-value beat.
- Remove “Why Brands Should Work With Us” and its `BRAND_REASONS` data.
- Retain the existing nine `BRAND_CAPABILITIES` items.

## Presentation

Render “What We Offer” as one standard glass journey card using the established
kicker, heading, body, and compact item treatment used by the other content
cards. Keep it readable over the moving boating scene on desktop and mobile.

## Implementation

Use named exported progress constants for the start and end boundaries. Route
the Plans chapter through the single offer card only while progress is inside
that interval; preserve the later Social Media Performance reveal at `0.88`.
Update component/data tests and visual-QA fixtures so no removed reasons card or
data remains.

## Verification

Automated tests must cover visibility immediately before, inside, and at the end
of the interval; assert the nine offer items; and assert the reasons card is
absent. Run focused component/data tests and the full suite.
