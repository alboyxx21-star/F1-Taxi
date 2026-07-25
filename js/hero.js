/* ============================================================
   F1 TAXI — hero.js
   Kreu hero: types the two paragraphs out like a typewriter
   (after the heading slides in), then reveals the social icons.
   Classic script, no deps. Reduced-motion → show everything at
   once with no typing.
   ============================================================ */

/* ------------------------------------------------------------------
   Lazy background video. The <video> ships with data-src + a poster
   image and preload="none", so mobile just shows the lightweight
   poster (no multi-MB download). On larger screens — and only when the
   user isn't on Data Saver — we load and play the real video.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  function loadBgVideos() {
    var vids = document.querySelectorAll('video[data-src]');
    if (!vids.length) return;
    // Poster shows instantly (fast LCP); the small video then loads and plays
    // on every device. Only Data Saver keeps the poster to spare data.
    var conn = navigator.connection || {};
    if (conn.saveData) return;
    vids.forEach(function (v) {
      if (v.src) return;
      v.src = v.getAttribute('data-src');
      v.load();
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadBgVideos);
  } else {
    loadBgVideos();
  }
})();

(function () {
  'use strict';

  var START_DELAY = 550; // wait for the heading slide-in first
  var STAGGER = 170;     // gap between each line's fade/slide-in

  /* The hero video is muted+autoplay+playsinline, but browsers still
     occasionally skip the autoplay (slow decode, tab restore, throttling).
     Nudge it to play the moment we can, and retry on the events that fire as
     it becomes ready or the user first interacts. */
  function initVideo() {
    var v = document.querySelector('.kreu-video');
    if (!v) return;

    var play = function () {
      var p = v.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    };

    play();
    ['loadeddata', 'canplay'].forEach(function (ev) {
      v.addEventListener(ev, play, { once: true });
    });
    window.addEventListener('load', play, { once: true });

    // A blocked autoplay unblocks on the first gesture — resume then.
    var resume = function () { if (v.paused) play(); };
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
      document.addEventListener(ev, resume, { once: true, passive: true });
    });

    // Coming back to a backgrounded tab can leave it paused.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && v.paused) play();
    });
  }

  function initHero() {
    initVideo();

    var items = [
      document.querySelector('.kreu-lead'),
      document.querySelector('.kreu-text'),
      document.querySelector('.kreu-cta')
    ].filter(Boolean);
    var social = document.querySelector('.kreu-social');
    if (!items.length) return;

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      if (social) social.classList.add('is-visible');
      return;
    }

    // Staggered fade + slide-up (replaces the old typewriter effect).
    items.forEach(function (el, i) {
      setTimeout(function () { el.classList.add('is-in'); }, START_DELAY + i * STAGGER);
    });
    setTimeout(function () {
      if (social) social.classList.add('is-visible');
    }, START_DELAY + items.length * STAGGER + 80);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHero);
  } else {
    initHero();
  }
})();
