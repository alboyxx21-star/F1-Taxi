/* ============================================================
   F1 TAXI — hero.js
   Kreu hero: types the two paragraphs out like a typewriter
   (after the heading slides in), then reveals the social icons.
   Classic script, no deps. Reduced-motion → show everything at
   once with no typing.
   ============================================================ */

(function () {
  'use strict';

  var LEAD_SPEED = 11; // ms per character (lead line)
  var TEXT_SPEED = 6;  // ms per character (body line)
  var START_DELAY = 600; // wait for the heading slide-in first

  function type(el, text, speed) {
    return new Promise(function (resolve) {
      el.textContent = '';
      el.style.opacity = '1';
      el.classList.add('is-typing');
      var i = 0;
      (function step() {
        el.textContent = text.slice(0, i);
        if (i < text.length) {
          i++;
          setTimeout(step, speed);
        } else {
          el.classList.remove('is-typing');
          resolve();
        }
      })();
    });
  }

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

    var lead = document.querySelector('.kreu-lead');
    var text = document.querySelector('.kreu-text');
    var social = document.querySelector('.kreu-social');
    if (!lead || !text) return;

    var leadStr = lead.textContent.trim();
    var textStr = text.textContent.trim();

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      lead.style.opacity = '1';
      text.style.opacity = '1';
      if (social) social.classList.add('is-visible');
      return;
    }

    setTimeout(function () {
      type(lead, leadStr, LEAD_SPEED)
        .then(function () { return type(text, textStr, TEXT_SPEED); })
        .then(function () { if (social) social.classList.add('is-visible'); });
    }, START_DELAY);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHero);
  } else {
    initHero();
  }
})();
