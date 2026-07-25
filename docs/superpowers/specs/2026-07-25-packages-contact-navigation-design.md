# Packages and Contact Navigation Design

## Goal

Add a separate final Contact card without redesigning or changing existing UI.
Add Packages as a menu destination that navigates to the existing “Where should
we take you next?” card, and make Contact navigate to the new final card.

## Journey Structure

The existing final journey interval is divided into two consecutive destinations:

- `packages`: renders the existing “Where should we take you next?” package card
  with no visual or behavioral changes.
- `contact`: renders the new Contact card as the final UI card.

The Three.js contact environment and transport behavior remain unchanged. Only the
DOM content presented during the end interval changes.

## Menu Behavior

- Add `Packages` to the existing menu options.
- Selecting `Packages` navigates to the existing “Where should we take you next?”
  card.
- Selecting `Contact` navigates to the new final Contact card.
- Keep the existing Plan a Trip menu control and appearance unchanged; it
  continues to navigate to Packages.
- Preserve all other menu items, numbering style, layout, and interactions.

## Contact Card

The final card uses the existing transparent glass-card visual system and shows:

- Sanchari Kannadiga
- WhatsApp number `7204033032`
- WhatsApp number `7358369538`
- Instagram profile `@sanchari.kannadiga`

Each WhatsApp number is a separate link. It opens:

- `https://wa.me/917204033032`
- `https://wa.me/917358369538`

Both links include the same prepared general enquiry:

> Hello Sanchari Kannadiga, I would like to know more about your travel services.

The Instagram link reuses the existing confirmed profile URL. External links open
in a new tab with `noopener noreferrer`.

## Constraints

- Do not alter the existing package card UI, content, selection, or booking form.
- Do not alter existing card styling, menu styling, camera movement, terrain,
  transports, or desktop/mobile rendering.
- Do not replace the package booking WhatsApp number or its package-specific
  message.
- The Contact card must be the last card in the journey.
- The two WhatsApp numbers must remain separate selectable actions.

## Testing

- Chapter tests verify Packages precedes Contact and Contact is last.
- Menu tests verify Packages and Contact navigate to their distinct destination
  IDs while Plan a Trip continues to navigate to Packages.
- Contact-card tests verify visible identity, exact phone labels, exact `wa.me`
  destinations, encoded prepared message, Instagram URL, and safe external-link
  attributes.
- Existing package-card and booking-overlay tests remain unchanged and passing.
- Full tests, production build, and mobile/desktop visual checks verify no
  unrelated UI regression.
