/* ============================================================
   F1 TAXI — map.js
   Full-screen Google Map + backend-proxied Places search.
   Autocomplete/Details go through /api/* (server key hidden);
   only the referrer-restricted browser key loads the map.
   ============================================================ */
'use strict';

var TIRANA = { lat: 41.3275, lng: 19.8189 };

/* Dark premium map style with subtle green-tinted water/roads */
var DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0e130f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e130f' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7d8a80' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a231b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0b0f0c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243627' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#12351d' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1a12' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#101711' }] }
];

var map, marker, geocoder;
var qEl, sugEl, hintEl, locateEl;
var session = null;         // Places session token (billing/grouping)
var activeIdx = -1;
var lastItems = [];

/* ---- Google callback ---- */
window.initMap = function () {
  qEl = document.getElementById('q');
  sugEl = document.getElementById('suggest');
  hintEl = document.getElementById('hint');
  locateEl = document.getElementById('locate');

  map = new google.maps.Map(document.getElementById('map'), {
    center: TIRANA,
    zoom: 12,
    styles: DARK_STYLE,
    disableDefaultUI: true,
    zoomControl: true,
    gestureHandling: 'greedy',
    clickableIcons: false
  });
  geocoder = new google.maps.Geocoder();
  newSession();

  addRecenterControl();
  wireSearch();
  introAnimation();
};

/* A fresh session token per search-then-pick cycle */
function newSession() {
  session = 's-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ---- GSAP intro ---- */
function introAnimation() {
  if (!window.gsap) { document.getElementById('search').style.opacity = 1; return; }
  gsap.to('#search', { opacity: 1, duration: 0.6, ease: 'power2.out' });
  gsap.from('#search', { y: -22, duration: 0.9, ease: 'expo.out' });
  gsap.from('.search__brand', { y: -10, opacity: 0, duration: 0.7, delay: 0.15, ease: 'power2.out' });
}

/* ---- Search wiring ---- */
function wireSearch() {
  var run = debounce(function () {
    var v = qEl.value.trim();
    if (v.length < 2) { hideSuggest(); return; }
    fetchJSON('/api/autocomplete?session=' + session + '&input=' + encodeURIComponent(v))
      .then(function (data) { renderSuggest(data.predictions || []); })
      .catch(function () { setHint('Search unavailable. Try again.', true); });
  }, 300);

  qEl.addEventListener('input', run);
  qEl.addEventListener('keydown', onKeyNav);
  locateEl.addEventListener('click', useMyLocation);
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#search')) hideSuggest();
  });
}

function renderSuggest(items) {
  lastItems = items;
  activeIdx = -1;
  sugEl.innerHTML = '';
  if (!items.length) { hideSuggest(); return; }

  items.forEach(function (it, i) {
    var li = document.createElement('li');
    li.className = 'suggest__item';
    li.innerHTML =
      '<span class="suggest__pin"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21.5s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z"/><circle cx="12" cy="10.3" r="2.6"/></svg></span>' +
      '<span class="suggest__text"><span class="suggest__main"></span><span class="suggest__sec"></span></span>';
    li.querySelector('.suggest__main').textContent = it.main || it.description;
    li.querySelector('.suggest__sec').textContent = it.secondary || '';
    li.addEventListener('mousedown', function (e) { e.preventDefault(); choose(i); });
    sugEl.appendChild(li);
  });

  sugEl.hidden = false;
  if (window.gsap) {
    gsap.from('.suggest__item', { y: 8, opacity: 0, duration: 0.32, stagger: 0.04, ease: 'power2.out' });
  }
}

function hideSuggest() { sugEl.hidden = true; activeIdx = -1; }

/* Keyboard navigation */
function onKeyNav(e) {
  if (sugEl.hidden) return;
  var items = sugEl.querySelectorAll('.suggest__item');
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1, items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1, items); }
  else if (e.key === 'Enter') { e.preventDefault(); choose(activeIdx >= 0 ? activeIdx : 0); }
  else if (e.key === 'Escape') { hideSuggest(); }
}
function move(dir, items) {
  if (!items.length) return;
  if (activeIdx >= 0) items[activeIdx].classList.remove('is-active');
  activeIdx = (activeIdx + dir + items.length) % items.length;
  items[activeIdx].classList.add('is-active');
}

/* Pick a suggestion → fetch coords → fly there */
function choose(i) {
  var it = lastItems[i];
  if (!it) return;
  qEl.value = it.description;
  hideSuggest();
  qEl.blur();
  setHint('');

  fetchJSON('/api/place?session=' + session + '&place_id=' + encodeURIComponent(it.place_id))
    .then(function (p) {
      newSession(); // token consumed by a details call
      flyTo({ lat: p.lat, lng: p.lng }, p.name || it.description);
    })
    .catch(function () { setHint('Could not load that place.', true); });
}

/* ---- Smooth pan + zoom + marker drop ---- */
function flyTo(loc, label) {
  map.panTo(loc);
  smoothZoom(16, map.getZoom());
  dropMarker(loc, label);
}

/* Step the zoom up one level at a time for a cinematic feel */
function smoothZoom(target, current) {
  if (current >= target) return;
  var listener = google.maps.event.addListenerOnce(map, 'zoom_changed', function () {
    smoothZoom(target, current + 1);
  });
  setTimeout(function () { map.setZoom(current + 1); }, 130);
}

function dropMarker(loc, label) {
  if (marker) marker.setMap(null);
  marker = new google.maps.Marker({
    position: loc,
    map: map,
    title: label || '',
    animation: google.maps.Animation.DROP,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: '#00ff39',
      fillOpacity: 1,
      strokeColor: '#0a0e0b',
      strokeWeight: 3
    }
  });
}

/* ---- Use my location (browser GPS) ---- */
function useMyLocation() {
  if (!navigator.geolocation) { setHint('Geolocation not supported.', true); return; }
  setHint('Finding your location…');
  locateEl.classList.add('is-loading');
  navigator.geolocation.getCurrentPosition(function (pos) {
    locateEl.classList.remove('is-loading');
    var loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setHint('');
    flyTo(loc, 'You');
    if (geocoder) {
      geocoder.geocode({ location: loc }, function (res, status) {
        if (status === 'OK' && res[0]) qEl.value = res[0].formatted_address;
      });
    }
  }, function () {
    locateEl.classList.remove('is-loading');
    setHint('Location permission denied.', true);
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
}

/* ---- Recenter-to-Tirana control ---- */
function addRecenterControl() {
  var btn = document.createElement('button');
  btn.className = 'map-btn';
  btn.title = 'Recenter';
  btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2"/></svg>';
  btn.addEventListener('click', function () { map.panTo(TIRANA); smoothZoom(12, map.getZoom()); });
  map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(btn);
}

/* ---- Utils ---- */
function fetchJSON(url) {
  return fetch(url).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.json();
  });
}
function setHint(msg, isErr) {
  hintEl.textContent = msg || '';
  hintEl.className = 'search__hint' + (isErr ? ' is-error' : '');
}
function debounce(fn, ms) {
  var t;
  return function () {
    var a = arguments, c = this;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(c, a); }, ms);
  };
}

/* If the Maps script fails (bad/missing key), tell the user plainly */
window.gm_authFailure = function () {
  var s = document.getElementById('search');
  if (s) s.style.opacity = 1;
  var h = document.getElementById('hint');
  if (h) { h.textContent = 'Map failed to load — check the browser API key & referrer settings.'; h.className = 'search__hint is-error'; }
};
