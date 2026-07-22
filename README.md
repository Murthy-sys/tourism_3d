# WanderLux Journeys — Tourism Management Site

A React + Vite single-page site for a tourism/travel management business, styled with an
immersive, award-site-inspired feel (preloader, custom cursor, mouse-parallax hero, scroll
reveals, 3D-tilt cards) — inspired by sebastien-lempens.com.

## Run it

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

## Build for production

```bash
npm run build
```

Output goes to `dist/`.

## Structure

- `src/App.jsx` — page composition
- `src/components/` — Preloader, CustomCursor, Navbar, Hero, Marquee, Services, Destinations,
  Stats, Testimonials, Booking (form), Footer
- `src/data.js` — services, destinations, stats, testimonial content (edit this to rebrand)
- `src/index.css` — all styling

## Notes

- The booking form is front-end only (no backend) — it shows a success state on submit. Wire
  `Booking.jsx`'s `handleSubmit` to your API/email service to make it functional.
- Swap `src/data.js` content and the accent color in `src/index.css` (`--accent`) to rebrand.
