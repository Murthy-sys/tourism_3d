# Who We Are Service Labels — Design

## Goal

Replace the six existing capability labels in the “Who We Are” section with the nine promotion services supplied by the user. This is a text-list replacement only; the section heading, positioning body, 3D journey, creator card, menu, and later chapters remain unchanged.

## Exact content and order

1. Destination Promotions
2. Tourism Campaigns
3. Hotel & Resort Promotions
4. Homestay Promotions
5. Adventure Activity Promotions
6. Travel Reels
7. Professional Photography
8. Cinematic Promotional Videos
9. Tourism Brand Collaborations

The rendered labels must match this wording, capitalization, and order exactly. No icons, descriptions, numbering, or additional labels will be added.

## Presentation

- Reuse the existing two-column `operations-proof` list shown in the approved screenshot.
- Fill the grid in normal reading order from left to right and top to bottom; the ninth item occupies the final left cell.
- Keep the existing uppercase visual treatment, divider lines, colors, and alignment.
- Tighten only the list’s vertical padding/gap if needed to keep all nine labels inside the current desktop and mobile overlays.
- Do not change the transparent “About the Creator” card or its eight coverage pillars.

## Implementation boundary

- Replace the shared `BRAND_CAPABILITIES` data so the component and browser QA consume one authoritative list.
- Update component/data tests to require the exact nine-item array and live rendered order.
- Update no 3D world, camera, transition, transport, audio, or chapter-timing code.

## Verification

- Run focused tests for chapter data, `ChapterContent`, and the fail-closed visual-QA corpus.
- Capture the “Who We Are” state at `1440×900` and `390×844`.
- Require the exact nine live labels, no clipping, no horizontal overflow, no console failures, and no audio controls.
- Run the full automated test suite and production build before committing and pushing `main`.
