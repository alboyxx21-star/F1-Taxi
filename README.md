<p align="center">
  <img src="assets/media/readme-banner.svg" alt="F1 Taxi — Taksi 24/7 në Tiranë, Shqipëri" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Taksi-24%2F7-00FF39?style=for-the-badge&labelColor=283618" alt="24/7">
  <img src="https://img.shields.io/badge/Tiranë-Shqipëri-fefae0?style=for-the-badge&labelColor=181f0d" alt="Tiranë, Shqipëri">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%C2%B7%20CSS%20%C2%B7%20JS-ee1c25?style=for-the-badge&labelColor=283618" alt="Frontend stack">
  <img src="https://img.shields.io/badge/Backend-PHP%20%C2%B7%20MySQL-777bb4?style=for-the-badge&labelColor=283618" alt="Backend stack">
</p>

# F1 Taxi

This is the website I'm building for **F1 Taxi**, a taxi service in **Tirana, Albania**. It started
as a single scrolling page and has grown into a small **multi-page site with a real backend** —
customers can book a ride, report a problem, or subscribe to updates, and those submissions land in
a database and ping me by email and WhatsApp.

The frontend is plain **HTML, CSS and vanilla JavaScript** — no React, no build step. The only
"libraries" are GSAP, ScrollTrigger and Lenis, vendored locally under `js/vendor/` instead of a CDN.
The backend is plain **PHP + MySQL**, made to run on the same shared (Plesk) hosting as the site.

The whole site is **bilingual** — Albanian (`lang="sq"`) by default with a **SQ / EN toggle** in the
menu that swaps every piece of text.

## Pages

The home page (`index.html`) is the scrolling one — Kreu (hero), Rreth Nesh (about), FAQ, customer
reviews carousel, a newsletter sign-up band, and the footer. Everything else is its own page under
`html/`, all sharing one auto-routing navbar and the redesigned footer:

| Page                    | What it is                                                        |
|-------------------------|-------------------------------------------------------------------|
| `index.html`            | Home — hero, about, FAQ, reviews, newsletter, footer              |
| `html/sherbimet.html`   | Shërbimet — services (cards + features)                           |
| `html/rezervo.html`     | Rezervo — booking (City ride / Airport transfer, live fare)       |
| `html/kontakt.html`     | Kontakt — "report a problem" form + Google Maps embed             |
| `html/rreth-nesh.html`  | Rreth Nesh — standalone about page                                |
| `html/privatesia.html`  | Privacy Policy (Albanian law)                                     |
| `html/cookies.html`     | Cookie Policy (Albanian law)                                      |

The **fixed prices brochure** (Çmimet tona fikse nga Tirana) with per-destination photos lives on the
booking flow, and the **live fare calculator** estimates fares from Tirana's municipal taxi tariffs.

## The fare calculator

Still the piece I'm proudest of. You type where you're going and it estimates the fare. It works in
two modes and degrades gracefully:

- **Free mode (default, no keys, no billing).** `js/fare.js` takes your origin (GPS or typed) and
  destination, asks **OSRM** for the fastest driving route, and applies the Tirana tariff. `js/al-places.js`
  is a hand-made list of Albanian/Kosovo places with coordinates for instant autocomplete, with live
  **OpenStreetMap** search on top. No API key needed.
- **Google mode (optional upgrade).** Paste a Google **browser key** into `js/maps-config.js` and
  `js/fare-map.js` swaps in a real embedded Google map with Places Autocomplete + Directions. Leave
  the key empty and it quietly falls back to the free version.

## The backend (`api/`)

Plain PHP talking to MySQL over PDO. Three public endpoints, all fire-and-forget from the frontend
(the site also keeps its WhatsApp hand-off, so forms work even if the API is down):

| Endpoint              | Does                                                              |
|-----------------------|------------------------------------------------------------------|
| `api/booking.php`     | Stores a booking, then emails + WhatsApps me an alert            |
| `api/report.php`      | Stores a "report a problem" submission from the contact page     |
| `api/newsletter.php`  | Stores a newsletter e-mail (deduplicated)                        |
| `api/admin/`          | Password-protected dashboard to read bookings / reports / subs   |

- **Notifications** — `api/notify.php` sends email through the hosting's SMTP (with a `mail()`
  fallback) and, optionally, a WhatsApp message via the **WhatsApp Cloud API**.
- **Secrets** — every secret (DB, mailbox, admin, WhatsApp token) lives in `api/config.local.php`,
  which is **git-ignored and never committed**. `api/config.local.example.php` is the placeholder
  template. `api/schema.sql` creates the tables; `api/.htaccess` blocks direct access to config/SQL.
- Setup and deploy notes are in **`api/README.md`**.

## How it's put together

```
taxi f1/
├── index.html            Home page (hero, about, FAQ, reviews, newsletter, footer)
├── html/                 Sub-pages (services, booking, contact, about, privacy, cookies)
├── css/                  base/tokens, navbar, menu, stage, section styles, footer, legal…
├── js/
│   ├── navbar.js         Menu open/close, active link, SQ/EN toggle (saved to localStorage)
│   ├── main.js           Bootstrap — smooth scrolling + active-link tracking
│   ├── hero.js           Kreu typewriter intro
│   ├── scroll.js         GSAP ScrollTrigger cinematics (+ optional Lenis)
│   ├── fare.js           Free fare estimator (OSRM + Tirana tariffs)
│   ├── fare-map.js       Optional Google Maps version
│   ├── rezervo.js        Booking page logic → POSTs to api/booking.php
│   ├── kontakt.js        Contact form → POSTs to api/report.php
│   ├── newsletter.js     Newsletter band → POSTs to api/newsletter.php
│   ├── api-config.js     Small helper (base URL + fire-and-forget POST)
│   └── vendor/           gsap, ScrollTrigger, lenis (all local)
├── api/                  PHP + MySQL backend (see above)
└── assets/media/         logo, favicons, destination photos, car images, backgrounds
```

There's also a separate **`map-app/`** folder — a small Node backend for doing Google Maps search
safely (two-key setup so the private key never reaches the browser). Not wired into the site; parked
until the Google Cloud keys are sorted.

## Security

The guiding principle: **the server is the only real boundary.** Anything in the browser can be
inspected, bypassed, or replayed with `curl`, so every request is validated and throttled server-side
regardless of what the client does. On top of that:

**Secrets**
- All secrets (DB, mailbox, admin, WhatsApp token) live in `api/config.local.php`, which is
  **git-ignored** and never committed — only a placeholder `config.local.example.php` is in the repo.
- `api/.htaccess` blocks direct web access to `config.local.php` and `.sql` files (returns 403).

**Backend (`api/`)**
- **SQL injection** — every query uses PDO **prepared statements** (`EMULATE_PREPARES = false`).
- **Honeypot + time-trap** — each form has a hidden `hp_url` field and sends `elapsed_ms`; bot
  submissions (field filled, or posted in < 1.2s) get a silent fake success and are dropped.
- **Rate limiting** — per-IP sliding window on every public endpoint (booking 6/5 min, report
  5/5 min, newsletter 5/10 min → HTTP 429). File-based, fails *open* so a disk issue never blocks
  real customers.
- **Admin brute-force lockout** — 5 failed logins from an IP → 15-minute lockout; session id is
  rotated on success (`hash_equals` for the credential check).
- **CORS** limited to `https://f1taxi.al` / `https://www.f1taxi.al`; generic error messages (no
  stack traces or DB details leaked).

**Frontend**
- **Content-Security-Policy** (`<meta>` on every page) with **`script-src 'self'`** — all JS is local
  and there are no inline scripts, so injected/XSS scripts can't execute. Only the fonts, jsDelivr
  flag icons, and the Google Maps iframe the site uses are allow-listed. In the HTML so it applies
  even when nginx serves static files and skips `.htaccess`.
- **Security headers** (root `.htaccess`, `IfModule`-guarded so it can't 500): `X-Frame-Options`
  (clickjacking), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`,
  and `-Indexes`.
- **Self-XSS console warning** — every page prints a bilingual "don't paste code here" notice to
  deter the social-engineering scam that targets non-technical users.

**Not handled in-app**
- **Volumetric DDoS** can only be absorbed at the network edge — put the domain behind **Cloudflare**
  for that. The app-level rate limits above stop application/spam floods, not raw packet floods.
- The secrets used during setup were shared in plaintext, so **rotate** them (DB / mailbox / admin
  passwords, WhatsApp token) before launch.

## Conventions

- **CSS** uses BEM-ish names (`block__element--modifier`), state classes are `is-*`, and all tokens
  live in `:root` in `base.css`. Palette: green `#00FF39`, red `#ee1c25`, cornsilk `#fefae0`, dark
  forest greens.
- **JS** files are classic scripts (work over `file://`), one IIFE each, hung off `window.F1`.
- **Bilingual text**: anything with both `data-sq` and `data-en` gets swapped by the toggle — new copy
  just needs both attributes. (A text node with a child link needs the text wrapped in a `<span>`.)

## Running it

Frontend only — just open `index.html`, or serve it:

```sh
npx serve .
```

The **backend** needs PHP + MySQL. Copy `api/config.local.example.php` to `api/config.local.php`,
fill in your values, import `api/schema.sql`, and serve the folder from a PHP host (see `api/README.md`).

## Status — done ✅

- [x] **Multi-page site**, fully **bilingual** (SQ/EN toggle on every text)
- [x] **Booking** (Rezervo) — city / airport, live fare, submits to the backend + WhatsApp
- [x] **Contact** — "report a problem" form + Google Maps embed, submits to the backend
- [x] **Newsletter** sign-up band, stored in the database
- [x] **Backend** — PHP/MySQL, email + WhatsApp notifications, admin dashboard
- [x] **Abuse protection** — honeypot + time-trap on the forms, per-IP rate
      limiting on all endpoints, and a brute-force lockout on the admin login
- [x] **Legal** — Privacy Policy + Cookie Policy pages (Albanian law)
- [x] **Reviews** carousel, **FAQ**, redesigned dark footer, fixed-price brochure with photos

## Status — still to do 🚧

- [ ] **Go live.** Site is built and tested on the hosting IP, but the domain's DNS still points to
      the old host — nameservers need to move to the hosting provider so `f1taxi.al` serves this site.
- [ ] **SSL + mail once DNS moves.** Enable Let's Encrypt for `f1taxi.al` / `www`, and confirm
      `booking@f1taxi.al` sends/receives (WhatsApp Cloud API also has a 24-hour messaging window to mind).
- [ ] **Rotate the secrets** that were used during setup, as a hygiene step before launch.
- [ ] **Google Maps key.** Calculator runs on the free OpenStreetMap fallback; `map-app/` is parked
      until the Google Cloud keys are set up.
- [ ] **SEO / share tags.** Basic `<meta description>` + favicons are done; still want Open Graph /
      Twitter cards for link previews.
- [ ] **Accessibility + cross-browser pass** — keyboard nav, reduced-motion, older browsers.

## Notes

Personal project, not open for contributions right now — but feel free to look around.
