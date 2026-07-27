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

This is the website for **F1 Taxi**, a taxi service in **Tirana, Albania** — **live at
[f1taxi.al](https://f1taxi.al)** over HTTPS. It started as a single scrolling page and grew into a
small **multi-page site with a real backend**: customers can book a ride, report a problem, or
subscribe to updates, and every submission is stored in a database and **emailed to us automatically
by the server** — the customer never has to open their own WhatsApp. (WhatsApp alerts are wired up
in the code but not switched on — see [WhatsApp alerts](#whatsapp-alerts-still-open) below.)

The frontend is plain **HTML, CSS and vanilla JavaScript** — no React, no build step. The only
"libraries" are GSAP, ScrollTrigger and Lenis, vendored locally under `js/vendor/` instead of a CDN.
The backend is plain **PHP + MySQL**, made to run on the same shared (Plesk) hosting as the site.

The whole site is **bilingual** — Albanian (`lang="sq"`) by default with a **SQ / EN toggle** in the
menu that swaps every piece of text.

## Pages

The home page (`index.html`) is the scrolling one — Kreu (hero), Rreth Nesh (about), FAQ, customer
reviews carousel, a newsletter sign-up band, and the footer. Everything else is its own page under
`html/`, all sharing one auto-routing navbar and the redesigned footer. The pages are served at
**clean URLs** (`/rezervo`, not `/html/rezervo.html`) via `.htaccess` rewrites:

| URL           | File                    | What it is                                            |
|---------------|-------------------------|-------------------------------------------------------|
| `/`           | `index.html`            | Home — hero, about, FAQ, reviews, newsletter, footer  |
| `/sherbimet`  | `html/sherbimet.html`   | Shërbimet — services (cards + features)               |
| `/rezervo`    | `html/rezervo.html`     | Rezervo — booking (City ride / Airport transfer)      |
| `/kontakt`    | `html/kontakt.html`     | Kontakt — "report a problem" form + Google Maps embed |
| `/rreth-nesh` | `html/rreth-nesh.html`  | Rreth Nesh — standalone about page                    |
| `/privatesia` | `html/privatesia.html`  | Privacy Policy (Albanian law)                         |
| `/cookies`    | `html/cookies.html`     | Cookie Policy (Albanian law)                          |

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

Plain PHP talking to MySQL over PDO. Every form POSTs here and the **server** handles the notifying —
the customer's own WhatsApp is never opened:

| Endpoint              | Does                                                                      |
|-----------------------|---------------------------------------------------------------------------|
| `api/booking.php`     | Stores a booking, then emails + WhatsApps the business an alert           |
| `api/report.php`      | Stores a contact "report a problem" and emails it to the team             |
| `api/newsletter.php`  | Stores a subscriber, sends them a branded **welcome email**, pings the biz |
| `api/admin/`          | Password-protected dashboard to read bookings / reports / subscribers     |
| `api/whatsapp-webhook.php` | Meta's verification handshake + inbound message/status events (logged) |

- **Notifications** — `api/notify.php` sends email through the hosting's SMTP and, optionally, a
  WhatsApp message via the **WhatsApp Cloud API**. `mail()` is **disabled on this host**
  (`disable_functions`), so SMTP is the primary path and `mail()` only a guarded fallback.
  `send_email()` takes an optional recipient + HTML flag, so business alerts go out as plain text
  while a new subscriber gets an HTML welcome layout.
- **Secrets** — every secret (DB, mailbox, admin, WhatsApp token) lives in `api/config.local.php`,
  which is **git-ignored and never committed**. `api/config.local.example.php` is the placeholder
  template. `api/schema.sql` creates the tables; `api/.htaccess` blocks direct access to config/SQL.
- Setup and deploy notes are in **`api/README.md`**.

## WhatsApp alerts (still open)

Email works and is the reliable channel. The WhatsApp leg in `send_whatsapp()` is written and
correct, but **not switched on** — the Cloud API needs a token that doesn't expire and, for a message
the *server* starts rather than the customer, an **approved template**. Parked for now; the options,
so future-me doesn't have to re-derive them:

| Option | Keys needed | Automatic? | Notes |
|--------|-------------|-----------|-------|
| **`wa.me` deep link** | none | no — customer taps send | Just a URL with the booking pre-typed in `text=`. Nothing to expire or approve. Arrives from the customer's number, which also opens the free 24-hour reply window. |
| **Telegram bot** | one permanent token | yes | Free, no approval, ~15 lines next to `send_whatsapp()`. Instant push to the dispatcher — but it's Telegram, not WhatsApp. |
| **Meta Cloud API** | System User token + template | yes | The code is already here; it's Business Manager paperwork, not development. |
| **Unofficial bridge** (Baileys, whatsapp-web.js) | none | yes | Needs an always-on Node process (a VPS — Plesk shared hosting won't run it), breaks WhatsApp's terms, and **the business number can be banned**. Not worth the risk for the main dispatch line. |

Watching the Roundcube inbox over IMAP was considered and rejected: `api/booking.php` already has the
booking data at submit time, so polling email is a slower, lossier trigger for the *same* blocked
send step.

## How it's put together

```
taxi f1/
├── index.html            Home page (hero, about, FAQ, reviews, newsletter, footer)
├── html/                 Sub-pages (services, booking, contact, about, privacy, cookies)
├── css/                  base/tokens, navbar, menu, stage, section styles, footer, legal…
├── js/
│   ├── navbar.js         Menu open/close, active link, SQ/EN toggle (saved to localStorage)
│   ├── main.js           Bootstrap — smooth scrolling + active-link tracking
│   ├── hero.js           Kreu reveal (staggered fade/slide) + lazy background video
│   ├── scroll.js         GSAP ScrollTrigger cinematics (+ Lenis, paused on input focus)
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

## Performance

Tuned against Google PageSpeed (mobile):

- **Video** — the hero background was 1080p/9.4MB; re-encoded to 720p (**~0.9MB**) with `ffmpeg`, plus
  a poster image and `preload="none"`. `hero.js` shows the poster instantly (fast LCP) and lazy-loads
  the video; Data Saver keeps just the poster.
- **Layout shift (CLS)** — explicit `width`/`height` on every `<img>` (extracted with `ffprobe`) so
  the browser reserves space and nothing jumps.
- **Caching** — `.htaccess` sets long cache lifetimes for media/fonts (1 year, immutable) and CSS/JS
  (7 days); HTML is never long-cached so updates show immediately.
- **Result** — SEO / Best-Practices **100**, Accessibility **~100**; the remaining mobile-perf lever
  is converting the destination photos to WebP.

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

- [x] **Live** at `f1taxi.al` — domain on the hosting nameservers, **Let's Encrypt HTTPS** for the
      domain, `www` and `webmail`.
- [x] **Multi-page site** at **clean URLs** (`/rezervo`, `/kontakt`, …), fully **bilingual** (SQ/EN)
- [x] **Booking** (Rezervo) — city / airport, fixed-price brochure; server-side notify on confirm
- [x] **Contact** — "report a problem" form; server emails the team, thank-you state shown **only
      after a successful submit** (a class-level `display` was overriding the `hidden` attribute)
- [x] **Newsletter** — subscribers stored + a branded **HTML welcome email** sent automatically
- [x] **Backend** — PHP/MySQL, server-side email + WhatsApp notifications, admin dashboard
- [x] **Abuse protection** — honeypot + time-trap, per-IP rate limiting, admin brute-force lockout
- [x] **Security** — CSP + security headers, self-XSS console warning, secrets in git-ignored config
- [x] **Legal** — Privacy Policy + Cookie Policy pages (Albanian law)
- [x] **Reviews** carousel, **FAQ**, redesigned dark footer
- [x] **SEO** — titles/descriptions, `robots.txt` + `sitemap.xml`, canonicals, Open Graph + Twitter,
      `TaxiService`/`LocalBusiness` JSON-LD, one H1 per page, keyword-rich image alt
- [x] **Performance** — compressed hero video + poster, image dimensions (CLS), browser caching
- [x] **Mobile fixes** — the booking sheet is a flex column (fixed header + scrolling `.bkm__body`),
      clamped to the visual viewport so the **on-screen keyboard can't break the layout**; the focused
      field scrolls itself into view; Lenis pauses on input focus

## Status — still to do 🚧

- [ ] **Rotate the secrets** used during setup (DB / mailbox / admin passwords, WhatsApp token).
- [ ] **Decide the WhatsApp route** — see [WhatsApp alerts](#whatsapp-alerts-still-open). Email always
      works, so this is an upgrade, not a blocker.
- [ ] **Google Business Profile** + submit the sitemap in **Google Search Console** (biggest local-SEO
      wins now that the site is live).
- [ ] **Convert destination photos to WebP** — the last chunk of mobile page weight.
- [ ] **Google Maps key.** The fare calculator runs on the free OpenStreetMap fallback; the optional
      Google Maps upgrade is on hold until the Google Cloud keys are set up.
- [ ] **Nice-to-have** — a dedicated 1200×630 share image, a custom 404 page, and optionally Cloudflare
      in front for edge caching + DDoS protection.

## Notes

Personal project, not open for contributions right now — but feel free to look around.
