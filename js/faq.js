/* ============================================================
   F1 TAXI — faq.js
   FAQ section: category tabs switch the visible question group;
   cards are a single-open accordion. Selecting a category opens
   that group's first question (mirrors the original design).
   Classic script, no deps.
   ============================================================ */

(function () {
  'use strict';

  function init() {
    var faq = document.getElementById('faq');
    if (!faq) return;

    var tabs = Array.prototype.slice.call(faq.querySelectorAll('.faq__tab'));
    var groups = Array.prototype.slice.call(faq.querySelectorAll('.faq__group'));

    /** Open/close a single card and keep its button's ARIA in sync. */
    function setOpen(card, open) {
      card.classList.toggle('is-open', open);
      var btn = card.querySelector('.faq__q-btn');
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    /** Open only the first card of a group, collapse the rest. */
    function openFirst(group) {
      var cards = group.querySelectorAll('.faq__card');
      for (var i = 0; i < cards.length; i++) setOpen(cards[i], i === 0);
    }

    // Category tabs → swap the active group, reset to its first answer
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cat = tab.getAttribute('data-cat');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        groups.forEach(function (g) {
          var on = g.getAttribute('data-cat') === cat;
          g.classList.toggle('is-active', on);
          if (on) openFirst(g);
        });
      });
    });

    // Accordion: one open card per group
    faq.querySelectorAll('.faq__card').forEach(function (card) {
      var btn = card.querySelector('.faq__q-btn');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var wasOpen = card.classList.contains('is-open');
        var group = card.closest('.faq__group');
        if (group) {
          group.querySelectorAll('.faq__card').forEach(function (c) { setOpen(c, false); });
        }
        setOpen(card, !wasOpen);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
