# F1 Taxi — Full-screen Map Search (with key-hiding backend)

A standalone mini-app: a full-screen interactive Google Map with a floating
glassmorphism search bar. Places Autocomplete + Details are proxied through a
Node backend so the **sensitive Google key never reaches the browser**.

## Architecture / security

Two Google keys, each locked down differently:

| Key | Where it lives | Restriction | Used for |
|-----|----------------|-------------|----------|
| **Browser key** (`MAPS_BROWSER_KEY`) | Injected into the page HTML by the server | **HTTP referrer** = your domain only | Loading the Maps JavaScript API (the map itself) |
| **Server key** (`GOOGLE_SERVER_KEY`) | `.env` on the server, **never sent to the client** | **IP address** = your server only | Places Autocomplete + Details (`/api/*` proxy) |

> The Maps JavaScript key is *always* visible in the browser — that is how
> Google's JS map works. It is secured by the **referrer restriction**, which
> makes it unusable on any other site. The Places key is the truly secret one,
> and it stays in the backend.

## Setup

Requires **Node 18+**.

```bash
cd map-app
cp .env.example .env      # then edit .env and paste your two keys
npm install
npm start                 # → http://localhost:3000
```

## Getting the keys (Google Cloud Console)

1. Create a project and **enable billing**.
2. Enable APIs: **Maps JavaScript API** and **Places API**.
3. Create **two** API keys under *APIs & Services → Credentials*:
   - **Browser key** → Application restriction **HTTP referrers**, add
     `http://localhost:3000/*` (dev) and `https://YOURDOMAIN/*` (prod).
     API restriction → **Maps JavaScript API** only. Put it in `MAPS_BROWSER_KEY`.
   - **Server key** → Application restriction **IP addresses**, add your
     server's public IP. API restriction → **Places API** only. Put it in
     `GOOGLE_SERVER_KEY`.
4. Restart the server after editing `.env`.

## Files

- `server.js` — Express: injects the browser key, proxies `/api/autocomplete`
  and `/api/place` with the server key.
- `public/index.html` / `map.css` / `map.js` — the dark glass UI, GSAP
  animations, and map fly-to logic.

## Notes

- Place search is limited to the countries in `PLACES_COUNTRIES` (default `al,xk`).
- To embed this in the main site later, link the "Rezervo" button to this app's
  URL, or run it behind the same domain path (e.g. `/harta`).
