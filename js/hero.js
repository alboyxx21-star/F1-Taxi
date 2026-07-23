/* ============================================================
   F1 TAXI — hero.js
   Kreu hero: types the two paragraphs out like a typewriter
   (after the heading slides in), then reveals the social icons.
   Classic script, no deps. Reduced-motion → show everything at
   once with no typing.
   ============================================================ */

(function () {
  'use strict';

  var LEAD_SPEED = 24; // ms per character (lead line)
  var TEXT_SPEED = 15; // ms per character (body line)
  var START_DELAY = 950; // wait for the heading slide-in first

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

  function initHero() {
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
