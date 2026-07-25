# Transparent Card System

## Goal

Make Who We Are and every card surface across the site use one fully
transparent, theme-consistent visual system with compact responsive typography.

## Scope

Apply the system to journey content cards, creator and offer cards, Social Media
Performance, trek packages, service cards, destination cards, testimonial
cards, and form/card containers.

Do not remove the backdrop fills from full-screen overlays, modal backdrops,
menus, navigation, or other screen-level layers.

## Card Treatment

- Card backgrounds contain no color or gradient fill: `background: transparent`.
- Retain subtle borders, backdrop blur, and restrained shadows so each card
  remains identifiable without obscuring the 3D or page background.
- Use consistent corner radii and warm neutral border colors.
- Strengthen text shadow only where cards sit directly over moving scenery.

## Who We Are

Apply the shared card treatment to the initial Who We Are article as well as its
creator continuation. Preserve the existing content and progress boundaries.

## Typography

- Use the display face for headings and numeric highlights.
- Use the body face for descriptions, labels, and list items.
- Reduce oversized headings with responsive `clamp()` values.
- Use compact line heights and spacing while preserving mobile readability.
- Keep uppercase tracking for small labels, but reduce tracking on narrow
  screens to avoid wrapping and clipping.

## Verification

Tests and source-level QA must verify that Who We Are receives the shared card
class, card backgrounds are transparent, full-screen overlay backgrounds remain
intact, and mobile/desktop typography remains within readable bounds. Run the
focused UI tests, CSS/visual-QA assertions, and full test suite.
