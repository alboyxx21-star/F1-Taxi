/* ============================================================
   F1 TAXI — fare-map.js
   Live Google map embedded in the Çmimet fare calculator.
   Active ONLY when window.F1_MAPS_KEY (js/maps-config.js) is set;
   otherwise js/fare.js runs the free OpenStreetMap fallback.

   Places Autocomplete + Directions run client-side under the
   referrer-restricted BROWSER key (Google's accepted model for
   the JS API). Fare uses the same Tirana meter as the OSM path:
   base + distance + traffic-adjusted time (night = less traffic
   = cheaper).
   ============================================================ */
(function () {
  'use strict';

  var KEY = window.F1_MAPS_KEY;
  if (!KEY) return; // no key → OSM fallback (fare.js) stays in charge

  var TIRANA = { lat: 41.3275, lng: 19.8189 };
  var INCLUDED_KM = 1.5;
  var RATES = {
    day:   { base: 300, kmMin: 95, kmMax: 120, perMin: 25, traffic: 1.40 },
    night: { base: 300, kmMin: 95, kmMax: 120, perMin: 25, traffic: 1.00 }
  };
  var ALL_PER_EUR = 100;

  var DARK_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0e130f' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0e130f' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7d8a80' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a231b' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243627' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1a12' }] }
  ];

  /* ---- DOM ---- */
  var $ = function (id) { return document.getElementById(id); };
  var originIn = $('fare-origin');
  var destIn   = $('fare-dest');
  var geoBtn   = $('fare-geo');
  var goBtn    = $('fare-go');
  var mapEl    = $('fare-map');
  var statusEl = $('fare-status');
  var resultEl = $('fare-result');
  var kmEl     = $('fare-km');
  var durEl    = $('fare-dur');
  var allEl    = $('fare-all');
  var eurEl    = $('fare-eur');
  var modeBtns = document.querySelectorAll('.fare-calc__mode');
  if (!originIn || !destIn || !goBtn || !mapEl) return;

  /* Hide the custom OSM suggestion lists — Google draws its own dropdown */
  ['fare-origin-suggest', 'fare-dest-suggest'].forEach(function (id) {
    var el = $(id); if (el) el.remove();
  });

  var map, dirService, dirRenderer, geocoder;
  var originLoc = null, destLoc = null;
  var mode = 'day';

  function lang() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'sq';
  }
  var T = {
    locating: { sq: 'Duke gjetur vendndodhjen tuaj…', en: 'Finding your location…' },
    needBoth: { sq: 'Zgjidhni nisjen dhe destinacionin.', en: 'Choose a start and a destination.' },
    routing:  { sq: 'Duke llogaritur rrugën…', en: 'Calculating the route…' },
    noRoute:  { sq: 'Nuk u gjet rrugë me makinë.', en: 'No driving route found.' },
    geoDenied:{ sq: 'Nuk u lejua vendndodhja.', en: 'Location permission denied.' },
    min: { sq: 'min', en: 'min' }, hr: { sq: 'orë', en: 'hr' }
  };
  function t(k) { return (T[k] || {})[lang()] || ''; }
  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'fare-calc__status' + (kind ? ' is-' + kind : '');
  }

  /* ---- Load the Maps JS API, then init ---- */
  window.__fareMapInit = init;
  var s = document.createElement('script');
  s.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(KEY) +
          '&libraries=places&callback=__fareMapInit&loading=async&v=weekly';
  s.async = true; s.defer = true;
  s.onerror = function () { setStatus('Google Maps failed to load.', 'error'); };
  document.head.appendChild(s);

  window.gm_authFailure = function () {
    setStatus('Map key rejected — check referrer & API restrictions.', 'error');
  };

  function init() {
    // Map stays hidden until the first search, then opens with the route.
    map = new google.maps.Map(mapEl, {
      center: TIRANA, zoom: 12, styles: DARK_STYLE,
      disableDefaultUI: true, zoomControl: true,
      gestureHandling: 'greedy', clickableIcons: false
    });
    dirService = new google.maps.DirectionsService();
    dirRenderer = new google.maps.DirectionsRenderer({
      map: map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: '#1a73e8', strokeWeight: 6, strokeOpacity: 0.95 }
    });
    geocoder = new google.maps.Geocoder();

    var opts = {
      componentRestrictions: { country: ['al', 'xk'] },
      fields: ['geometry', 'name', 'formatted_address']
    };
    var acO = new google.maps.places.Autocomplete(originIn, opts);
    var acD = new google.maps.places.Autocomplete(destIn, opts);
    acO.addListener('place_changed', function () { originLoc = pickPlace(acO); });
    acD.addListener('place_changed', function () { destLoc = pickPlace(acD); });

    goBtn.addEventListener('click', calculate);
    destIn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); calculate(); }
    });
    if (geoBtn) geoBtn.addEventListener('click', useMyLocation);

    modeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        mode = b.getAttribute('data-mode') || 'day';
        modeBtns.forEach(function (x) { x.classList.toggle('is-active', x === b); });
        if (!resultEl.hidden && originLoc && destLoc) calculate();
      });
    });

    updateNote();
    document.querySelectorAll('.menu__lang-btn').forEach(function (b) {
      b.addEventListener('click', function () { setTimeout(updateNote, 0); });
    });
  }

  function pickPlace(ac) {
    var p = ac.getPlace();
    if (!p || !p.geometry) return null;
    return p.geometry.location;
  }

  /* Reveal the (initially hidden) map and force a resize so tiles render */
  function revealMap() {
    if (!mapEl.hidden) return;
    mapEl.hidden = false;
    google.maps.event.trigger(map, 'resize');
  }

  /* ---- Fare from distance + traffic-adjusted time ---- */
  function fareRange(km, durSec) {
    var r = RATES[mode];
    var extra = Math.max(0, km - INCLUDED_KM);
    var minutes = (durSec / 60) * r.traffic;
    var timeCost = minutes * r.perMin;
    return {
      lo: Math.round((r.base + extra * r.kmMin + timeCost) / 10) * 10,
      hi: Math.round((r.base + extra * r.kmMax + timeCost) / 10) * 10,
      minutes: minutes
    };
  }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function fmtDur(sec) {
    var m = Math.round(sec / 60);
    if (m < 60) return m + ' ' + t('min');
    return Math.floor(m / 60) + ' ' + t('hr') + (m % 60 ? ' ' + (m % 60) + ' ' + t('min') : '');
  }

  /* ---- Calculate + draw route ---- */
  function calculate() {
    if (!originLoc || !destLoc) { setStatus(t('needBoth'), 'error'); return; }
    setStatus(t('routing'));
    goBtn.classList.add('is-loading');
    resultEl.hidden = true;

    dirService.route({
      origin: originLoc, destination: destLoc,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: false
    }, function (res, status) {
      goBtn.classList.remove('is-loading');
      if (status !== 'OK' || !res.routes.length) { setStatus(t('noRoute'), 'error'); return; }

      // Open the map now, size it, then draw the fastest route (blue line)
      revealMap();
      dirRenderer.setDirections(res);

      var leg = res.routes[0].legs[0];
      var km = leg.distance.value / 1000;
      var f = fareRange(km, leg.duration.value);

      kmEl.textContent = km.toFixed(1);
      durEl.textContent = '≈ ' + fmtDur(f.minutes * 60);
      allEl.textContent = group(f.lo) + ' – ' + group(f.hi) + ' ALL';
      eurEl.textContent = '≈ €' + Math.round(f.lo / ALL_PER_EUR) + ' – €' + Math.round(f.hi / ALL_PER_EUR);
      resultEl.hidden = false;
      setStatus('');
    });
  }

  /* ---- Use my location ---- */
  function useMyLocation() {
    if (!navigator.geolocation) return;
    setStatus(t('locating'));
    geoBtn.classList.add('is-loading');
    navigator.geolocation.getCurrentPosition(function (pos) {
      geoBtn.classList.remove('is-loading');
      var loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
      originLoc = loc;
      revealMap();
      map.panTo(loc); map.setZoom(15);
      setStatus('');
      geocoder.geocode({ location: loc }, function (r, st) {
        if (st === 'OK' && r[0]) originIn.value = r[0].formatted_address;
      });
    }, function () {
      geoBtn.classList.remove('is-loading');
      setStatus(t('geoDenied'), 'error');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function updateNote() {
    var note = document.querySelector('.fare-calc__note');
    if (!note) return;
    note.textContent = lang() === 'en'
      ? 'Distance and time are measured on the fastest route (Google Maps). Daytime prices rise with traffic; at night, with less traffic, the ride is faster and cheaper.'
      : 'Distanca dhe koha llogariten në rrugën më të shpejtë (Google Maps). Ditën çmimi rritet nga trafiku; natën, me më pak trafik, udhëtimi është më i shpejtë dhe më i lirë.';
  }
})();
