/* ============================================================
   F1 TAXI — rezervo.js  (Book a Taxi)
   Drives the two-panel booking card:
     · City / Airport service toggle (swaps the left photo panel)
     · Passenger stepper
     · Prefill from ?dest=&price= (the pricing destination cards)
     · Validation → confirmation screen + WhatsApp hand-off

   Classic script (no modules → works over file://).
   ============================================================ */

(function () {
  'use strict';

  var WHATSAPP = '355682550000';   // same number as the footer / tel: links
  var MAX_DEST = 60;               // query values are untrusted; keep them short

  function isEN() { return document.documentElement.getAttribute('lang') === 'en'; }
  function t(sq, en) { return isEN() ? en : sq; }

  function init() {
    var card = document.getElementById('rez-card');
    var form = document.getElementById('rez-form');
    if (!card || !form) return;

    var confirm   = document.getElementById('rez-confirm');
    var errorBox  = document.getElementById('rez-error');
    var toField   = document.getElementById('rez-to');
    var dateField = document.getElementById('rez-date');
    var paxHidden = document.getElementById('rez-pax');
    var paxVal    = document.getElementById('rez-pax-val');

    /* ---- Service mode toggle (city / airport) ---- */

    var modeBtns = form.querySelectorAll('.rez__mode');
    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        card.setAttribute('data-mode', mode);
        modeBtns.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
    });

    /* ---- Passenger stepper ---- */

    function setPax(n) {
      n = Math.max(1, Math.min(8, n));
      paxHidden.value = String(n);
      paxVal.textContent = String(n);
    }
    document.getElementById('rez-pax-dec').addEventListener('click', function () {
      setPax(parseInt(paxHidden.value, 10) - 1);
    });
    document.getElementById('rez-pax-inc').addEventListener('click', function () {
      setPax(parseInt(paxHidden.value, 10) + 1);
    });

    /* ---- Prefill destination from the card that was clicked ---- */

    var params = new URLSearchParams(window.location.search);
    var dest = (params.get('dest') || '').trim().slice(0, MAX_DEST);
    var price = (params.get('price') || '').replace(/[^0-9]/g, '');

    if (dest && toField) {
      toField.value = dest;
      if (dateField) {
        try { dateField.focus({ preventScroll: true }); } catch (e) { dateField.focus(); }
      }
    }

    /* ---- A booking can't be for a date already past ---- */

    if (dateField) {
      var now = new Date();
      var today = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString().slice(0, 10);
      dateField.min = today;
      if (!dateField.value) dateField.value = today;
    }

    /* ---- Helpers for the confirmation screen ---- */

    function prettyDate(d) {
      if (!d) return '—';
      var dt = new Date(d + 'T00:00:00');
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString(isEN() ? 'en-GB' : 'sq-AL',
        { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }

    function addRow(dl, k, v) {
      var row = document.createElement('div');
      row.className = 'rez__receipt-row';
      var dt = document.createElement('dt'); dt.textContent = k;
      var dd = document.createElement('dd'); dd.textContent = v;
      row.appendChild(dt); row.appendChild(dd);
      dl.appendChild(row);
    }

    function showConfirmation(data, isAirport) {
      var name = (data.get('name') || '').trim();
      var first = name.split(/\s+/)[0] || t('ju', 'there');

      document.getElementById('rez-confirm-title').textContent =
        t('Gati, ' + first + '!', "You're all set, " + first + '!');

      var sub = document.getElementById('rez-confirm-sub');
      sub.textContent = '';
      sub.appendChild(document.createTextNode(
        t('E morëm ' + (isAirport ? 'transferin e aeroportit' : 'udhëtimin në qytet') +
            '. Një shofer konfirmohet së shpejti dhe merr një mesazh te ',
          "We've got your " + (isAirport ? 'airport transfer' : 'city ride') +
            '. A driver will be confirmed shortly and you’ll get a text at ')));
      var b = document.createElement('b');
      b.textContent = data.get('phone') || '';
      sub.appendChild(b);
      sub.appendChild(document.createTextNode('.'));

      var dl = document.getElementById('rez-summary');
      dl.textContent = '';
      addRow(dl, t('Shërbimi', 'Service'), isAirport ? t('Transfer aeroporti', 'Airport transfer') : t('Udhëtim në qytet', 'City ride'));
      addRow(dl, t('Pasagjeri', 'Passenger'), name || '—');
      addRow(dl, t('Marrja', 'Pickup'), data.get('from') || '—');
      addRow(dl, t('Destinacioni', 'Drop-off'), data.get('to') || '—');
      addRow(dl, t('Kur', 'When'), prettyDate(data.get('date')) + ' · ' + (data.get('time') || '—'));
      addRow(dl, t('Pasagjerë', 'Passengers'), data.get('pax'));
      if ((data.get('note') || '').trim()) addRow(dl, t('Shënime', 'Notes'), data.get('note'));

      card.classList.add('is-confirmed');
      confirm.hidden = false;
    }

    /* ---- Book another ride → back to the form ---- */

    document.getElementById('rez-again').addEventListener('click', function () {
      confirm.hidden = true;
      card.classList.remove('is-confirmed', 'is-validated');
      form.classList.remove('is-validated');
      form.reset();
      form.querySelector('#rez-from').value = 'Tiranë';
      setPax(2);
      // reset to city mode
      card.setAttribute('data-mode', 'city');
      modeBtns.forEach(function (b) {
        var on = b.getAttribute('data-mode') === 'city';
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (dateField && dateField.min) dateField.value = dateField.min;
    });

    /* ---- Submit → confirmation + WhatsApp ---- */

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('is-validated');

      if (!form.checkValidity()) {
        var firstBad = form.querySelector(':invalid');
        if (errorBox) {
          errorBox.textContent = t('Ju lutem plotësoni fushat e theksuara.',
                                   'Please fill in the highlighted fields.');
          errorBox.hidden = false;
        }
        if (firstBad) firstBad.focus();
        return;
      }
      if (errorBox) errorBox.hidden = true;

      var isAirport = card.getAttribute('data-mode') === 'airport';
      var data = new FormData(form);

      // Hand the booking to WhatsApp
      var lines = [
        'Rezervim F1 Taxi',
        (isAirport ? 'Transfer aeroporti' : 'Udhëtim në qytet'),
        'Nga: ' + data.get('from'),
        'Për: ' + data.get('to'),
        'Data: ' + data.get('date') + ' ' + data.get('time'),
        'Pasagjerë: ' + data.get('pax'),
        'Emri: ' + data.get('name'),
        'Telefoni: ' + data.get('phone')
      ];
      if (price) lines.push('Çmimi fiks: €' + price);
      if ((data.get('note') || '').trim()) lines.push('Shënime: ' + data.get('note'));

      window.open(
        'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank', 'noopener'
      );

      showConfirmation(data, isAirport);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
