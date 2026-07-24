/* ============================================================
   F1 TAXI — booking-modal.js
   Opens the popup reservation card from any destination card.

   The cards stay real <a href="rezervo.html?..."> links, so with
   JS off (or if this file fails) they still reach the booking
   page. Here we just intercept the click.

   Classic script (no modules → works over file://).
   ============================================================ */

(function () {
  'use strict';

  var BUSY_MS = 1600;    // "Finding your driver…" dwell
  var EXIT_MS = 470;     // must match the closed-state transition in the CSS (.45s)
  var ENTER_MS = 1000;   // must cover the open-state transition in the CSS (.95s)
  var HOME = 'Tiranë';   // every fixed-price route departs from Tirana
  var PAX_MIN = 1, PAX_MAX = 8, PAX_DEFAULT = 2;
  var DEFAULT_CC = 'AL';

  /** Paint an element as a country flag (flag-icons sprite classes). */
  function paintFlag(el, iso) {
    // Token-wise, not string-wise: a regex over className would eat the "fi"
    // out of "fi-al" and weld the leftover onto the neighbouring class.
    Array.prototype.slice.call(el.classList).forEach(function (c) {
      if (c === 'fi' || /^fi-[a-z]{2}$/.test(c)) el.classList.remove(c);
    });
    el.classList.add('fi', 'fi-' + iso.toLowerCase());
    el.textContent = iso;   // shown only if the CDN stylesheet never arrives
  }

  /** Did the flag-icons stylesheet actually load? */
  function flagsRender() {
    var probe = document.createElement('span');
    probe.className = 'fi fi-al';
    probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
    document.body.appendChild(probe);
    var bg = '';
    try { bg = window.getComputedStyle(probe).backgroundImage || ''; } catch (e) {}
    document.body.removeChild(probe);
    return bg !== '' && bg !== 'none';
  }

  function init() {
    var root = document.getElementById('bkm');
    var form = document.getElementById('bkm-form');
    if (!root || !form) return;
    if (root.dataset.ready) return;   // never bind twice
    root.dataset.ready = '1';

    var card = root.querySelector('.bkm__card');
    var fromEl = document.getElementById('bkm-from');
    var toEl = document.getElementById('bkm-to');
    var dateEl = document.getElementById('bkm-date');
    var timeEl = document.getElementById('bkm-time');
    var phoneEl = document.getElementById('bkm-phone');
    var paxEl = document.getElementById('bkm-pax');
    var swapEl = document.getElementById('bkm-swap');
    var submitEl = document.getElementById('bkm-submit');
    var footEl = document.getElementById('bkm-foot');
    var confirmEl = document.getElementById('bkm-confirm');
    var confirmPhone = document.getElementById('bkm-confirm-phone');
    var cancelEl = document.getElementById('bkm-cancel');
    var fareEl = document.getElementById('bkm-fare');
    var farePrice = document.getElementById('bkm-fare-price');

    var ccBtn = document.getElementById('bkm-cc-btn');
    var ccPop = document.getElementById('bkm-cc-pop');
    var ccList = document.getElementById('bkm-cc-list');
    var ccSearch = document.getElementById('bkm-cc-search');
    var ccNone = document.getElementById('bkm-cc-none');
    var ccFlag = document.getElementById('bkm-cc-flag');
    var ccDial = document.getElementById('bkm-cc-dial');

    var lastFocus = null;
    var busyTimer = null;
    var exitTimer = null;
    var promoteTimer = null;
    var pax = PAX_DEFAULT;
    var countries = window.F1_COUNTRIES || [];
    var current = null;

    // The CDN stylesheet may still be in flight when deferred scripts run, so
    // re-check on load before falling back to ISO-code chips.
    function checkFlags() {
      root.classList.toggle('bkm--no-flags', !flagsRender());
    }
    checkFlags();
    if (root.classList.contains('bkm--no-flags')) {
      window.addEventListener('load', checkFlags, { once: true });
    }

    /* ---- Country picker ---- */

    function setCountry(c) {
      current = c;
      paintFlag(ccFlag, c[1]);
      ccDial.textContent = '+' + c[2];
      ccBtn.setAttribute('aria-label', c[0] + ' +' + c[2]);
    }

    function renderList(query) {
      var q = (query || '').trim().toLowerCase();
      ccList.textContent = '';
      var shown = 0;

      countries.forEach(function (c) {
        if (q && c[0].toLowerCase().indexOf(q) === -1 &&
            c[1].toLowerCase().indexOf(q) === -1 &&
            ('+' + c[2]).indexOf(q) === -1 && c[2].indexOf(q) === -1) return;

        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bkm__cc-opt';
        btn.setAttribute('role', 'option');
        if (current && current[1] === c[1]) btn.setAttribute('aria-selected', 'true');

        var flag = document.createElement('span');
        flag.className = 'bkm__cc-flag';
        paintFlag(flag, c[1]);

        var name = document.createElement('span');
        name.className = 'bkm__cc-opt-name';
        name.textContent = c[0];

        var dial = document.createElement('span');
        dial.className = 'bkm__cc-opt-dial';
        dial.textContent = '+' + c[2];

        btn.appendChild(flag); btn.appendChild(name); btn.appendChild(dial);
        btn.addEventListener('click', function () {
          setCountry(c);
          closeCC();
          phoneEl.focus();
        });

        li.appendChild(btn);
        ccList.appendChild(li);
        shown++;
      });

      ccNone.hidden = shown > 0;
    }

    function openCC() {
      renderList('');
      ccSearch.value = '';
      ccPop.hidden = false;
      ccBtn.setAttribute('aria-expanded', 'true');
      ccSearch.focus();
      // Keep the selected country in view.
      var sel = ccList.querySelector('[aria-selected="true"]');
      if (sel) ccList.scrollTop = sel.offsetTop - 80;
    }

    function closeCC() {
      ccPop.hidden = true;
      ccBtn.setAttribute('aria-expanded', 'false');
    }

    ccBtn.addEventListener('click', function () {
      ccPop.hidden ? openCC() : closeCC();
    });

    ccSearch.addEventListener('input', function () { renderList(ccSearch.value); });

    // Enter picks the only remaining match.
    ccSearch.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      var first = ccList.querySelector('.bkm__cc-opt');
      if (first) first.click();
    });

    document.addEventListener('click', function (e) {
      if (ccPop.hidden) return;
      if (!ccPop.contains(e.target) && !ccBtn.contains(e.target)) closeCC();
    });

    setCountry(
      countries.filter(function (c) { return c[1] === DEFAULT_CC; })[0] ||
      countries[0] || ['Albania', 'AL', '355']
    );

    /* ---- Passengers stepper ---- */

    function renderPax() {
      paxEl.textContent = pax;
      root.querySelectorAll('.bkm__step').forEach(function (b) {
        var next = pax + Number(b.dataset.step);
        b.disabled = next < PAX_MIN || next > PAX_MAX;
      });
    }

    root.querySelectorAll('.bkm__step').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pax = Math.min(PAX_MAX, Math.max(PAX_MIN, pax + Number(btn.dataset.step)));
        renderPax();
      });
    });

    /* ---- Swap From / To ---- */

    swapEl.addEventListener('click', function () {
      var a = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = a;
      swapEl.classList.toggle('is-flipped');
    });

    /* ---- Defaults: today, next full hour ---- */

    function localNow(offsetHours) {
      var d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + (offsetHours || 0));
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    }

    function applyDefaults() {
      var iso = localNow(1);
      dateEl.value = iso.slice(0, 10);
      timeEl.value = iso.slice(11, 16);
      dateEl.min = localNow(0).slice(0, 10);
    }

    /* ---- State machine: idle → busy → done ---- */

    function setFormDisabled(off) {
      form.querySelectorAll('input, .bkm__step, .bkm__swap, .bkm__cc-btn').forEach(function (el) {
        el.disabled = off;
      });
      if (!off) renderPax(); // restore the stepper's own min/max disabling
    }

    function toIdle() {
      clearTimeout(busyTimer);
      submitEl.classList.remove('is-busy', 'is-done');
      submitEl.disabled = false;
      form.classList.remove('is-checked');
      confirmEl.hidden = true;
      footEl.hidden = false;
      closeCC();
      setFormDisabled(false);
    }

    function fullPhone() {
      return ccDial.textContent + ' ' + phoneEl.value.trim();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('is-checked');

      if (!form.checkValidity()) {
        var bad = form.querySelector('.bkm__input:invalid');
        if (bad) bad.focus();
        return;
      }

      submitEl.classList.add('is-busy');
      submitEl.disabled = true;
      setFormDisabled(true);
      footEl.hidden = true;

      busyTimer = setTimeout(function () {
        submitEl.classList.remove('is-busy');
        submitEl.classList.add('is-done');
        confirmPhone.textContent = fullPhone();
        confirmEl.hidden = false;
        cancelEl.focus();
      }, BUSY_MS);
    });

    cancelEl.addEventListener('click', function () {
      toIdle();
      form.reset();
      pax = PAX_DEFAULT;
      renderPax();
      swapEl.classList.remove('is-flipped');
      // form.reset() wipes the prefill, so put the trip back.
      fromEl.value = root.dataset.from || '';
      toEl.value = root.dataset.to || '';
      applyDefaults();
      phoneEl.focus();
    });

    /* ---- Open / close ---- */

    function open(dest, price) {
      clearTimeout(exitTimer);
      clearTimeout(promoteTimer);
      lastFocus = document.activeElement;

      toIdle();
      form.reset();
      pax = PAX_DEFAULT;
      renderPax();
      swapEl.classList.remove('is-flipped');

      root.dataset.from = dest ? HOME : '';
      root.dataset.to = dest || '';
      fromEl.value = root.dataset.from;
      toEl.value = root.dataset.to;
      applyDefaults();

      if (price) {
        farePrice.textContent = '€' + price;
        fareEl.hidden = false;
      } else {
        fareEl.hidden = true;
      }

      root.hidden = false;
      root.classList.add('is-animating');
      // Force a reflow between un-hiding and flipping the class, otherwise the
      // browser batches both and the card appears with no travel.
      void root.offsetWidth;
      root.classList.add('is-open');
      // Drop the layer promotion once the glide is done.
      clearTimeout(promoteTimer);
      promoteTimer = setTimeout(function () {
        root.classList.remove('is-animating');
      }, ENTER_MS);

      document.body.style.overflow = 'hidden';
      if (window.F1 && window.F1.lenis) window.F1.lenis.stop();

      // Destination is already known — the pickup address is what's missing.
      (dest ? fromEl : toEl).focus();
    }

    function finishClose() {
      root.hidden = true;
      root.classList.remove('is-animating');
      document.body.style.overflow = '';
      if (window.F1 && window.F1.lenis) window.F1.lenis.start();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function close() {
      if (root.hidden) return;
      clearTimeout(busyTimer);
      closeCC();
      clearTimeout(promoteTimer);
      root.classList.add('is-animating');
      root.classList.remove('is-open');

      var reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) { finishClose(); return; }

      // Stay mounted until the card has slid back out.
      clearTimeout(exitTimer);
      exitTimer = setTimeout(finishClose, EXIT_MS);
    }

    root.querySelectorAll('[data-bkm-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (root.hidden) return;

      if (e.key === 'Escape') {
        // The country list closes first, then the dialog.
        if (!ccPop.hidden) { closeCC(); ccBtn.focus(); } else { close(); }
        return;
      }
      if (e.key !== 'Tab') return;

      // Keep focus inside the dialog while it is open.
      var focusable = card.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
      );
      focusable = Array.prototype.filter.call(focusable, function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    /* ---- Hook up the destination cards ---- */

    function intercept(link) {
      link.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab work
        e.preventDefault();
        var q;
        try { q = new URL(link.href, window.location.href).searchParams; } catch (err) { return; }
        open(q.get('dest') || '', (q.get('price') || '').replace(/[^0-9]/g, ''));
      });
    }

    document.querySelectorAll('.pricing__dest-go, .f1-showcase__button').forEach(intercept);

    renderPax();
    applyDefaults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
