<p align="center">
  <img src="assets/media/readme-banner.svg" alt="F1 Taxi — Taksi 24/7 në Tiranë, Shqipëri" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Taksi-24%2F7-00FF39?style=for-the-badge&labelColor=283618" alt="24/7">
  <img src="https://img.shields.io/badge/Tiranë-Shqipëri-fefae0?style=for-the-badge&labelColor=181f0d" alt="Tiranë, Shqipëri">
  <img src="https://img.shields.io/badge/Stack-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-ee1c25?style=for-the-badge&labelColor=283618" alt="Stack">
</p>

# F1 Taxi

This is the website I'm building for **F1 Taxi**, a taxi service in **Tirana, Albania**. It's a
one-page site — you scroll through it top to bottom, one full-screen section per menu item —
with a fixed glass navbar and a fullscreen menu that animates a car driving in when you open it.

The whole thing is plain **HTML, CSS and vanilla JavaScript**. No React, no build step, no
`npm install` to look at it. I wanted it to stay light and to just open in a browser, so the
only "libraries" are GSAP, ScrollTrigger and Lenis, and I've vendored those locally under
`js/vendor/` instead of pulling them from a CDN.

The site is in **Albanian** (`lang="sq"`) with a **SQ / EN toggle** in the menu.

## What's on the page

The site scrolls through six sections, in this order:

| # | Section        | id           | What it is                                             |
|---|----------------|--------------|--------------------------------------------------------|
| 1 | Kreu           | `kreu`       | Hero / landing — typewriter intro + social icons       |
| 2 | Rreth Nesh     | `rreth-nesh` | About us                                               |
| 3 | Shërbimet      | `sherbimet`  | Services                                               |
| 4 | Çmimet         | `cmimet`     | Prices **+ the live fare calculator** (the fun part)   |
| 5 | Rezervo        | `rezervo`    | Booking                                                |
| 6 | Kontakt        | `kontakt`    | Contact                                                |

## The fare calculator

This is the piece I'm proudest of and the reason there's so much JavaScript. In **Çmimet** you
type where you're going, and it estimates the fare based on Tirana's municipal taxi tariffs.

It works in two modes, and it degrades gracefully:

- **Free mode (default, no keys, no billing).** `js/fare.js` takes your origin (GPS or typed)
  and destination, asks **OSRM** for the fastest driving route, gets the km + time back, and
  applies the Tirana tariff to get a price. `js/al-places.js` is a hand-made list of real
  Albanian (and a few Kosovo) places with coordinates so autocomplete feels instant, and live
  **OpenStreetMap** search runs on top for full street-level coverage. None of this needs an
  API key.
- **Google mode (optional upgrade).** If you paste a Google **browser key** into
  `js/maps-config.js`, `js/fare-map.js` swaps the calculator over to a real embedded Google map
  that draws the route with Places Autocomplete + Directions. Leave the key empty and it quietly
  falls back to the free OpenStreetMap version above — nothing breaks.

## How it's put together

```
taxi f1/
├── index.html            The whole page — semantic markup, no inline styles/scripts
├── css/
│   ├── base.css          Design tokens (the palette lives here in :root), reset
│   ├── navbar.css        Fixed top bar: logo + hamburger that morphs into an X
│   ├── menu.css          Fullscreen overlay: circle reveal, car drive-in, links, SQ/EN toggle
│   ├── stage.css         The scrolling sections' base layout
│   ├── about.css         Rreth Nesh styling (the sage/cornsilk look I reuse elsewhere)
│   ├── services.css      Shërbimet
│   └── pricing.css       Çmimet + calculator UI
├── js/
│   ├── navbar.js         Menu open/close, active link, language toggle (saved to localStorage)
│   ├── main.js           Bootstrap — smooth in-page scrolling + active-link tracking
│   ├── hero.js           Kreu typewriter intro + social icon reveal
│   ├── scroll.js         GSAP ScrollTrigger cinematics (+ optional Lenis smoothing)
│   ├── al-places.js      Curated Albanian/Kosovo places dataset for autocomplete
│   ├── fare.js           Free fare estimator (OSRM route + Tirana tariffs)
│   ├── fare-map.js       Optional Google Maps version of the calculator
│   ├── maps-config.js    Where you paste the Google browser key (empty by default)
│   └── vendor/           gsap, ScrollTrigger, lenis (all local)
└── assets/
    └── media/            logo.webp, favicon set, car images, video, section backgrounds
```

There's also a separate **`map-app/`** folder — a small Node backend I started for doing Google
Maps search safely (a two-key setup so the private key never ends up in the browser). It's not
wired into the site yet and it's parked until I sort out the Google Cloud keys.

## A few conventions I stuck to

- **CSS** uses BEM-ish names (`block__element--modifier`), state classes are `is-*` (like
  `.menu.is-open`), and all the colours/tokens live in `:root` in `base.css`. The palette is
  signature green `#00FF39`, red `#ee1c25`, cornsilk `#fefae0`, and dark forest greens.
- **JS** files are plain classic scripts (so they even work over `file://`), one IIFE each,
  everything hung off `window.F1`. `main.js` is the only place the pieces talk to each other.
- **Bilingual text**: anything with both `data-sq` and `data-en` attributes gets swapped by the
  language toggle, so any new copy just needs both attributes.

## Running it

Easiest is to just open `index.html` in a browser. If you want it served (recommended, closer to
production):

```sh
npx serve .
```

## What I haven't done yet

Being honest — this is still a work in progress:

- [ ] **Real content.** Some sections (Shërbimet, Rezervo, Kontakt) are still mostly layout and
      placeholder copy. Rreth Nesh and the calculator are the most finished.
- [ ] **The booking form (Rezervo) doesn't submit anywhere.** It's UI only right now — no backend,
      no email, no confirmation. Needs to actually send a request somewhere.
- [ ] **Real contact details and social links.** The icons are there but not pointed at real
      accounts yet.
- [ ] **Google Maps key.** The calculator runs on the free OpenStreetMap fallback for now; the
      `map-app/` backend is blocked until I set up the Google Cloud keys.
- [ ] **SEO / share tags.** Only the basic `<meta name="description">` and favicon are done — still
      need Open Graph / Twitter cards for nice link previews.
- [ ] **Accessibility + cross-browser pass.** Want to properly test keyboard nav, reduced-motion,
      and older browsers before calling it launch-ready.
- [ ] **Content cleanup.** The places dataset still lists some Kosovo cities; needs to be trimmed
      to whatever service area we actually cover.

## Notes

Personal project, not open for contributions right now — but feel free to look around.
