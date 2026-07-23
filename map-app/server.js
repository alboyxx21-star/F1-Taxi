/* ============================================================
   F1 TAXI — map-app backend
   • Serves the full-screen map page, injecting the referrer-
     restricted BROWSER key at request time.
   • Proxies Google Places Autocomplete + Details using the
     IP-restricted SERVER key, which never reaches the client.
   Node >= 18 (uses the built-in global fetch).
   ============================================================ */
'use strict';

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BROWSER_KEY = process.env.MAPS_BROWSER_KEY || '';
const SERVER_KEY = process.env.GOOGLE_SERVER_KEY || '';
const COUNTRIES = (process.env.PLACES_COUNTRIES || 'al,xk')
  .split(',')
  .map((c) => 'country:' + c.trim())
  .join('|');

if (!BROWSER_KEY || !SERVER_KEY) {
  console.warn('\n[!] MAPS_BROWSER_KEY / GOOGLE_SERVER_KEY missing.');
  console.warn('    Copy .env.example to .env and add your keys.\n');
}

const PUBLIC = path.join(__dirname, 'public');

/* ---- Home page: inject the browser key into the template ---- */
app.get('/', (req, res) => {
  fs.readFile(path.join(PUBLIC, 'index.html'), 'utf8', (err, html) => {
    if (err) return res.status(500).send('Server error');
    res.type('html').send(html.replace(/%%MAPS_BROWSER_KEY%%/g, BROWSER_KEY));
  });
});

/* ---- Static assets (css/js), but NOT index.html directly ---- */
app.use(express.static(PUBLIC, { index: false }));

/* ---- Small helper to call a Google web service ---- */
async function googleGet(url, res) {
  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      // Surface Google's error status without leaking the key/URL
      return res.status(502).json({ error: data.status });
    }
    return data;
  } catch (e) {
    res.status(504).json({ error: 'UPSTREAM_UNAVAILABLE' });
    return null;
  }
}

/* ---- Places Autocomplete proxy ---- */
app.get('/api/autocomplete', async (req, res) => {
  const input = (req.query.input || '').toString().trim();
  const token = (req.query.session || '').toString();
  if (input.length < 2) return res.json({ predictions: [] });

  const url =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json' +
    '?input=' + encodeURIComponent(input) +
    '&components=' + encodeURIComponent(COUNTRIES) +
    '&language=sq' +
    (token ? '&sessiontoken=' + encodeURIComponent(token) : '') +
    '&key=' + SERVER_KEY;

  const data = await googleGet(url, res);
  if (!data) return;
  res.json({
    predictions: (data.predictions || []).map((p) => ({
      description: p.description,
      place_id: p.place_id,
      main: p.structured_formatting && p.structured_formatting.main_text,
      secondary: p.structured_formatting && p.structured_formatting.secondary_text
    }))
  });
});

/* ---- Place Details proxy (returns coordinates) ---- */
app.get('/api/place', async (req, res) => {
  const id = (req.query.place_id || '').toString();
  const token = (req.query.session || '').toString();
  if (!id) return res.status(400).json({ error: 'MISSING_PLACE_ID' });

  const url =
    'https://maps.googleapis.com/maps/api/place/details/json' +
    '?place_id=' + encodeURIComponent(id) +
    '&fields=geometry,name,formatted_address' +
    (token ? '&sessiontoken=' + encodeURIComponent(token) : '') +
    '&key=' + SERVER_KEY;

  const data = await googleGet(url, res);
  if (!data) return;
  const r = data.result || {};
  const loc = r.geometry && r.geometry.location;
  if (!loc) return res.status(404).json({ error: 'NO_LOCATION' });
  res.json({ lat: loc.lat, lng: loc.lng, name: r.name, address: r.formatted_address });
});

app.listen(PORT, () => {
  console.log(`F1 Taxi map app → http://localhost:${PORT}`);
});
