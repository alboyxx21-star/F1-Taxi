/* ============================================================
   F1 TAXI — fare.js
   Location-based Tirana fare estimator.
   Flow:  origin (GPS or typed) + destination (typed)
          → OSRM fastest driving route (km + time)
          → fare from official Tirana municipal tariffs.

   Services (no API key, no billing):
     • Nominatim (OpenStreetMap) — address search + reverse geocode
     • OSRM demo server          — fastest-route driving distance
   Both are public/demo endpoints: we debounce typing and cache
   the picked coordinates so we stay well within fair-use limits.
   ============================================================ */
(function () {
  'use strict';

  /* When a Google Maps key is set, fare-map.js takes over with a live
     map + Google routing. This OSM fallback then stands down entirely. */
  if (window.F1_MAPS_KEY) return;

  /* ---- Tariff model (Tirana meter: base + distance + time) ----
     Real municipal components: ~300 ALL base incl. first 1.5 km,
     ~95–120 ALL/km, ~25 ALL per minute in traffic.
     Day vs night differ by TRAFFIC TIME, not a surcharge: daytime
     congestion multiplies travel time (→ pricier), while at night
     traffic flows freely (→ faster and cheaper). */
  var INCLUDED_KM = 1.5;
  var RATES = {
    day:   { base: 300, kmMin: 95, kmMax: 120, perMin: 25, traffic: 1.40 },
    night: { base: 300, kmMin: 95, kmMax: 120, perMin: 25, traffic: 1.00 }
  };
  var ALL_PER_EUR = 100;

  var NOMINATIM = 'https://nominatim.openstreetmap.org';
  var OSRM = 'https://router.project-osrm.org';
  /* Bias searches to Albania + neighbours so short queries resolve locally */
  var VIEWBOX = '18.5,42.9,21.9,39.5'; // lon/lat: NW then SE (Albania + Kosovo)

  /* ---- DOM ---- */
  var $ = function (id) { return document.getElementById(id); };
  var originIn  = $('fare-origin');
  var destIn    = $('fare-dest');
  var originSug = $('fare-origin-suggest');
  var destSug   = $('fare-dest-suggest');
  var geoBtn    = $('fare-geo');
  var goBtn     = $('fare-go');
  var statusEl  = $('fare-status');
  var resultEl  = $('fare-result');
  var kmEl      = $('fare-km');
  var durEl     = $('fare-dur');
  var allEl     = $('fare-all');
  var eurEl     = $('fare-eur');
  var modeBtns  = document.querySelectorAll('.fare-calc__mode');
  if (!originIn || !destIn || !goBtn) return;

  var mode = 'day';
  var origin = null; // { lat, lon, label }
  var dest   = null;

  /* ---- Language helper (mirror the site's SQ/EN state) ---- */
  function lang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'sq';
  }
  var T = {
    locating:  { sq: 'Duke gjetur vendndodhjen tuaj…', en: 'Finding your location…' },
    located:   { sq: 'Vendndodhja u gjet.', en: 'Location found.' },
    geoDenied: { sq: 'Nuk u lejua vendndodhja. Shkruajeni me dorë.', en: 'Location denied. Type it manually.' },
    geoUnsup:  { sq: 'Shfletuesi nuk e mbështet vendndodhjen.', en: 'Your browser does not support geolocation.' },
    needBoth:  { sq: 'Zgjidhni nisjen dhe destinacionin.', en: 'Choose a start and a destination.' },
    routing:   { sq: 'Duke llogaritur rrugën më të shpejtë…', en: 'Calculating the fastest route…' },
    noRoute:   { sq: 'Nuk u gjet rrugë me makinë mes këtyre pikave.', en: 'No driving route found between these points.' },
    netErr:    { sq: 'Gabim rrjeti. Provoni përsëri.', en: 'Network error. Please try again.' },
    notFound:  { sq: 'Vendi nuk u gjet. Provoni një emër tjetër.', en: 'Place not found. Try another name.' },
    min:       { sq: 'min', en: 'min' },
    hr:        { sq: 'orë', en: 'hr' }
  };
  function t(key) { return (T[key] || {})[lang()] || ''; }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'fare-calc__status' + (kind ? ' is-' + kind : '');
  }

  /* ---- Small utils ---- */
  function debounce(fn, ms) {
    var timer;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }
  function roundTo10(n) { return Math.round(n / 10) * 10; }
  function groupThousands(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function shortLabel(display) {
    // Nominatim returns a long comma path; keep the first 2 parts.
    return display.split(',').slice(0, 2).join(',').trim();
  }

  /* Diacritic-insensitive normaliser: "tirane" matches "Tiranë" */
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  /* ---- Curated local dataset (js/al-places.js) ---- */
  var PLACES = window.AL_PLACES || [];

  function localSearch(query) {
    var q = norm(query);
    var hits = [];
    for (var i = 0; i < PLACES.length && hits.length < 5; i++) {
      var p = PLACES[i];
      if (norm(p.name).indexOf(q) !== -1 || norm(p.area).indexOf(q) !== -1) {
        hits.push({
          display_name: p.name + ', ' + p.area,
          lat: p.lat, lon: p.lon, __local: true
        });
      }
    }
    // Prefer name-prefix matches at the top
    hits.sort(function (a, b) {
      var an = norm(a.display_name).indexOf(q) === 0 ? 0 : 1;
      var bn = norm(b.display_name).indexOf(q) === 0 ? 0 : 1;
      return an - bn;
    });
    return hits;
  }

  function mergeResults(locals, remote) {
    var seen = {}, out = [];
    function push(it) {
      var k = norm(shortLabel(it.display_name));
      if (!seen[k]) { seen[k] = 1; out.push(it); }
    }
    locals.forEach(push);
    (remote || []).forEach(push);
    return out.slice(0, 7);
  }

  /* ---- Nominatim: forward search (autocomplete) ---- */
  function search(query) {
    // countrycodes + bounded viewbox → results limited to Albania (+ Kosovo)
    var url = NOMINATIM + '/search?format=jsonv2&limit=6&addressdetails=0' +
              '&countrycodes=al,xk&bounded=1&viewbox=' + VIEWBOX +
              '&accept-language=' + lang() +
              '&q=' + encodeURIComponent(query);
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); });
  }

  /* ---- Nominatim: reverse geocode (coords → label) ---- */
  function reverse(lat, lon) {
    var url = NOMINATIM + '/reverse?format=jsonv2&accept-language=' + lang() +
              '&lat=' + lat + '&lon=' + lon;
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) { return r.json(); });
  }

  /* ---- OSRM: fastest driving route between two coords ---- */
  function route(a, b) {
    var url = OSRM + '/route/v1/driving/' +
              a.lon + ',' + a.lat + ';' + b.lon + ',' + b.lat +
              '?overview=false&alternatives=false';
    return fetch(url).then(function (r) { return r.json(); });
  }

  /* ---- Autocomplete wiring for one input ---- */
  function wireAutocomplete(input, list, assign) {
    var fetchRemote = debounce(function (q, locals) {
      search(q).then(function (items) {
        renderList(list, mergeResults(locals, items), input, assign);
      }).catch(function () { /* keep the instant local results on error */ });
    }, 350);

    input.addEventListener('input', function () {
      assign(null);                       // typing invalidates a previous pick
      var q = input.value.trim();
      if (q.length < 2) { hideList(list); return; }
      var locals = localSearch(q);
      if (locals.length) renderList(list, locals, input, assign); // instant
      else hideList(list);
      if (q.length >= 3) fetchRemote(q, locals);                  // + live streets
    });
    input.addEventListener('focus', function () {
      if (list.children.length) list.hidden = false;
    });
    document.addEventListener('click', function (e) {
      if (e.target !== input && !list.contains(e.target)) hideList(list);
    });
  }

  function renderList(list, items, input, assign) {
    list.innerHTML = '';
    if (!items || !items.length) { hideList(list); return; }
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.className = 'fare-calc__suggest-item' + (it.__local ? ' is-local' : '');
      li.textContent = shortLabel(it.display_name);
      // Use mousedown + preventDefault so the input keeps focus (the field
      // stays raised) and the tap can't fall through to the button below.
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var label = shortLabel(it.display_name);
        input.value = label;
        assign({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), label: label });
        hideList(list);
        input.blur();
      });
      list.appendChild(li);
    });
    list.hidden = false;
  }
  function hideList(list) { list.hidden = true; }

  /* ---- Geolocation button ---- */
  function useMyLocation() {
    if (!navigator.geolocation) { setStatus(t('geoUnsup'), 'error'); return; }
    setStatus(t('locating'));
    geoBtn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      reverse(lat, lon).then(function (data) {
        var label = data && data.display_name ? shortLabel(data.display_name)
                                              : lat.toFixed(4) + ', ' + lon.toFixed(4);
        originIn.value = label;
        origin = { lat: lat, lon: lon, label: label };
        setStatus(t('located'), 'ok');
      }).catch(function () {
        originIn.value = lat.toFixed(4) + ', ' + lon.toFixed(4);
        origin = { lat: lat, lon: lon, label: originIn.value };
        setStatus(t('located'), 'ok');
      }).then(function () { geoBtn.classList.remove('is-loading'); });
    }, function () {
      geoBtn.classList.remove('is-loading');
      setStatus(t('geoDenied'), 'error');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  /* ---- Resolve an input to coords (use picked, else geocode text) ---- */
  function resolve(input, picked) {
    if (picked) return Promise.resolve(picked);
    var q = input.value.trim();
    if (!q) return Promise.resolve(null);
    return search(q).then(function (items) {
      if (!items || !items.length) return null;
      return { lat: parseFloat(items[0].lat), lon: parseFloat(items[0].lon),
               label: shortLabel(items[0].display_name) };
    });
  }

  /* ---- Fare from route distance + traffic-adjusted time ---- */
  function fareRange(km, durSec) {
    var r = RATES[mode];
    var extra = Math.max(0, km - INCLUDED_KM);
    var minutes = (durSec / 60) * r.traffic;   // day inflates time, night doesn't
    var timeCost = minutes * r.perMin;
    return {
      lo: roundTo10(r.base + extra * r.kmMin + timeCost),
      hi: roundTo10(r.base + extra * r.kmMax + timeCost),
      minutes: minutes
    };
  }

  function fmtDuration(sec) {
    var min = Math.round(sec / 60);
    if (min < 60) return min + ' ' + t('min');
    var h = Math.floor(min / 60), m = min % 60;
    return h + ' ' + t('hr') + (m ? ' ' + m + ' ' + t('min') : '');
  }

  /* ---- Main calculate ---- */
  function calculate() {
    setStatus(t('routing'));
    goBtn.classList.add('is-loading');
    resultEl.hidden = true;

    Promise.all([resolve(originIn, origin), resolve(destIn, dest)])
      .then(function (pts) {
        var a = pts[0], b = pts[1];
        if (!a || !b) { setStatus(a && b ? t('notFound') : t('needBoth'), 'error'); throw 'stop'; }
        origin = a; dest = b;
        return route(a, b);
      })
      .then(function (data) {
        if (!data || data.code !== 'Ok' || !data.routes || !data.routes.length) {
          setStatus(t('noRoute'), 'error'); return;
        }
        var rt = data.routes[0];
        var km = rt.distance / 1000;
        var f = fareRange(km, rt.duration);

        kmEl.textContent = km.toFixed(1);
        durEl.textContent = '≈ ' + fmtDuration(f.minutes * 60);
        allEl.textContent = groupThousands(f.lo) + ' – ' + groupThousands(f.hi) + ' ALL';
        eurEl.textContent = '≈ €' + (f.lo / ALL_PER_EUR).toFixed(0) +
                            ' – €' + (f.hi / ALL_PER_EUR).toFixed(0);
        resultEl.hidden = false;
        setStatus('');
      })
      .catch(function (err) {
        if (err !== 'stop') setStatus(t('netErr'), 'error');
      })
      .then(function () { goBtn.classList.remove('is-loading'); });
  }

  /* ---- Events ---- */
  wireAutocomplete(originIn, originSug, function (v) { origin = v; });
  wireAutocomplete(destIn, destSug, function (v) { dest = v; });
  geoBtn.addEventListener('click', useMyLocation);
  goBtn.addEventListener('click', calculate);
  destIn.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); calculate(); }
  });

  modeBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      mode = btn.getAttribute('data-mode') || 'day';
      modeBtns.forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      // Recompute silently if we already have a route on screen
      if (!resultEl.hidden && origin && dest) calculate();
    });
  });

  /* Keep placeholders in sync with the SQ/EN toggle */
  function syncPlaceholders() {
    [originIn, destIn].forEach(function (el) {
      var p = el.getAttribute('data-' + lang() + '-placeholder');
      if (p) el.placeholder = p;
    });
  }
  document.querySelectorAll('.menu__lang-btn').forEach(function (b) {
    b.addEventListener('click', function () { setTimeout(syncPlaceholders, 0); });
  });
  syncPlaceholders();
})();
