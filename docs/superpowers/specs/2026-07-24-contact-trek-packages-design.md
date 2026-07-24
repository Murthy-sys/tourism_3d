# Contact Trek Packages — Design

## Goal

Remove the entire customer-facing “Three Expedition Chapters” experience and
replace the Contact finale beneath “Where should we take you next?” with five
responsive transparent trek-package cards. Selecting a package opens a minimal
date form and continues to a prefilled WhatsApp conversation with
`7204033032`.

The posters are content references only. Their advertised dates are not copied
into the site.

## Retained journey

- The 3D mountain → water → forest journey, camera timing, transports,
  transitions, menu structure, Social Media Performance beat, and Contact
  boundary remain unchanged.
- For the former Expedition Chapters range before Social Media Performance,
  the UI shows the uninterrupted 3D journey without the heading, body, or three
  expedition cards.
- Contact still begins at progress `.94`.
- The old Contact CTA, email link, and support line are replaced by package
  selection.

## Authoritative package data

The site owns one `TREK_PACKAGES` array with five unique packages. The duplicate
Bandaje poster is ignored.

### Bandaje Waterfalls

- Price: `₹3,299` per person
- Duration: `1 Night · 1 Day`
- Bengaluru pickup and drop
- Adventurous Jeep Ride
- 2 Times Local Cuisine Food
- 1 Time Coffee or Snacks
- Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus
- Trek Entry
- Trek Guide
- Group Fun Activities

### Kurinjal Trek

- Price: `₹3,399` per person
- Duration: `1 Night · 1 Day`
- Bengaluru pickup and drop
- Adventurous Jeep Ride
- 2 Times Local Cuisine Food
- 1 Time Coffee, Tea or Snacks
- Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus
- Trek Entry
- Trek Guide
- Group Fun Activities

### Netravati Peak Trek

- Price: `₹3,499` per person
- Duration: `1 Night · 1 Day`
- Bengaluru pickup and drop
- Adventurous Jeep Ride
- 2 Times Local Cuisine Food
- 1 Time Coffee, Tea or Snacks
- Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus
- Trek Entry
- Trek Guide
- Group Fun Activities

### Kuduremukha Trek

- Price: `₹3,399` per person
- Duration: `1 Night · 1 Day`
- Bengaluru pickup and drop
- Adventurous Jeep Ride
- 2 Times Local Cuisine Food
- 1 Time Coffee, Tea or Snacks
- Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus
- Homestay for Fresh Up & Luggage
- Trek Entry
- Trek Guide
- Group Fun Activities

### Gangadikallu Trek

- Price: `₹3,399` per person
- Duration: `1 Night · 1 Day`
- Bengaluru pickup and drop
- Adventurous Jeep Ride
- 2 Times Local Cuisine Food
- 1 Time Coffee, Tea or Snacks
- Bangalore-to-Bangalore Pickup/Drop by TT or Mini Bus
- Trek Entry
- Group Fun Activities

The Gangadikallu poster does not list a trek guide, so the site must not invent
one.

## Contact layout

### Desktop

- Contact becomes a wide full-screen overlay while retaining the heading
  “Where should we take you next?”
- Five equal-width glass cards form one compact row.
- Each card shows destination, duration, per-person price, Bengaluru transfer,
  the exact poster inclusions, and a clear selection action.
- Cards use the transparent dark-to-olive What We Offer treatment.
- Inclusion typography matches the What We Offer card labels.
- The menu, chapter counter, and scroll cue remain unobstructed.

### Mobile

- The heading is reduced to preserve usable height.
- Cards become a horizontal swipe rail with one readable card emphasized at a
  time.
- Text remains at least `10px`, inclusions wrap, and each selection button has
  a comfortable touch target.
- The card rail clears the top-right menu, bottom-left counter, and right-side
  scroll cue.

## Date and WhatsApp flow

1. Selecting a card opens the existing full-screen cinematic dialog restyled
   for package booking.
2. The dialog identifies the selected package and displays required Start Date
   and End Date fields.
3. End Date cannot precede Start Date. Empty or invalid dates remain in the
   dialog with a readable error.
4. Pressing “Continue on WhatsApp” opens exactly one prefilled WhatsApp compose
   URL for Indian number `+91 7204033032`.
5. The message includes package name, price, duration, selected dates, and a
   request to confirm availability and booking details.

Web pages cannot silently send a WhatsApp message. The site opens the prefilled
conversation; the traveller completes the send inside WhatsApp.

## Accessibility and failure behavior

- Package selection uses real buttons with package-specific accessible names.
- The dialog remains modal, closes with Escape, and exposes labelled date
  fields and validation messages.
- The WhatsApp URL is generated from encoded text and the fixed approved phone
  number only.
- No poster date, second phone number, hidden customer data, backend, or
  automatic network request is introduced.

## Verification

- Data tests pin the five deduplicated packages, exact prices, duration, and
  inclusion differences.
- Component tests prove Expedition Chapters are absent, package cards render
  under Contact, and a selected package reaches the dialog.
- Dialog tests cover dates, invalid ranges, URL encoding, the exact
  `917204033032` WhatsApp target, and Escape.
- Desktop `1440×900` and mobile `390×844` visual QA verify package-card
  readability, transparency, viewport containment, and control clearance.
- The full suite, production build, independent review, commit, and push to
  `main` remain required.
