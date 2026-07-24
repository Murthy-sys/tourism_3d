# Post-Creator Brand Cards — Design

## Goal

Add one new scroll beat immediately after the existing “About the Creator” card and before the Plans chapter. The new beat presents two prominent, separate glass cards over the continuing 3D journey:

- “What We Offer” at the top-left.
- “Why Brands Should Work With Us” at the bottom-right.

The two cards appear together. Existing Who We Are content, the creator card, Plans, Contact, and all 3D environments remain intact.

## Scroll sequence

The existing Who We Are chapter keeps its `.14` to `.28` range:

1. Who We Are overview: `.14 ≤ progress < .22`.
2. About the Creator card: `.22 ≤ progress < .25`.
3. Paired brand cards: `.25 ≤ progress < .28`.
4. Plans begins at `.28`, unchanged.

No camera, biome, vehicle, handoff, or chapter-boundary timing changes are included.

## Card content

### Top-left — What We Offer

1. Destination Promotions
2. Tourism Campaigns
3. Hotel & Resort Promotions
4. Homestay Promotions
5. Adventure Activity Promotions
6. Travel Reels
7. Professional Photography
8. Cinematic Promotional Videos
9. Tourism Brand Collaborations

The card reuses the existing authoritative `BRAND_CAPABILITIES` array so the Who We Are list and What We Offer card cannot drift apart.

### Bottom-right — Why Brands Should Work With Us

1. High-quality cinematic storytelling
2. Authentic travel experiences
3. Strong audience engagement
4. Karnataka-focused travel audience
5. Professional content creation
6. High-reach social media campaigns

These six lines are stored in a new authoritative `BRAND_REASONS` array.

## Desktop composition

- The paired beat occupies the full overlay stage without obscuring the menu or scroll indicator.
- The What We Offer card is anchored at the top-left and is the larger card.
- The Why Brands Should Work With Us card is anchored at the bottom-right.
- Each card uses a translucent dark-to-olive glass surface, fine warm border, soft blur, rounded corners, and subtle depth shadow consistent with the creator card.
- Headings use responsive display type and remain visually dominant.
- Both item lists use two columns, restrained uppercase labels, and fine dividers or compact pills.
- The cards enter together with a slight stagger; animation respects the existing reduced-motion rules.

## Mobile composition

- The same two cards appear in one beat and stack vertically within the safe viewport.
- What We Offer appears first; Why Brands Should Work With Us appears second.
- Both lists retain two columns to preserve readable type without clipping.
- Heading and item sizes use mobile-specific `clamp()` values rather than shrinking the entire desktop composition.
- The card group must leave the menu, chapter counter, and scroll indicator unobstructed.

## Component and data boundaries

- `src/journey/chapters.js` owns `BRAND_CAPABILITIES`, `BRAND_REASONS`, headings, and card data.
- `ChapterContent` selects three operations beats: overview, creator, and paired brand value.
- The paired beat renders one `.chapter--brand-value` container with two independently styled card sections.
- The component continues to render the existing creator card unchanged during its shortened `.22` to `.25` interval.
- No unrelated component or 3D refactor is included.

## Accessibility

- The group has a reader-facing “Brand collaboration value” label.
- Each card has its own heading and labelled list.
- DOM order matches visual reading order: What We Offer first, Why Brands Should Work With Us second.
- Text remains real HTML; no content is baked into imagery.

## Verification

- Unit tests pin the exact six `BRAND_REASONS`, retain the exact nine `BRAND_CAPABILITIES`, and verify all three operations beats.
- Component tests verify the creator card at `.24` and both brand cards with exact ordered lists at `.26`.
- Visual QA adds the `.24` creator state and changes `.26` to require both brand cards, both exact lists, no clipping, no horizontal overflow, no console failures, and zero audio controls.
- Final production captures are required at `1440×900` and `390×844`.
- The full automated suite, production build, independent review, main-branch commit, and push remain required.
