/* ============================================================
   F1 TAXI — kontakt.js
   "Report a problem" form → validates, then hands the report to
   WhatsApp (same number as the footer / booking flow).

   Classic script (no modules → works over file://).
   ============================================================ */

(function () {
  'use strict';

  var WHATSAPP = '355682550000';

  function isEN() { return document.documentElement.getAttribute('lang') === 'en'; }

  function init() {
    var form = document.getElementById('kontakt-form');
    if (!form) return;

    var errorBox = document.getElementById('kontakt-error');
    var typeSel = document.getElementById('k-type');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('is-validated');

      if (!form.checkValidity()) {
        var firstBad = form.querySelector(':invalid');
        if (errorBox) {
          errorBox.textContent = isEN()
            ? 'Please fill in the highlighted fields.'
            : 'Ju lutem plotësoni fushat e theksuara.';
          errorBox.hidden = false;
        }
        if (firstBad) firstBad.focus();
        return;
      }
      if (errorBox) errorBox.hidden = true;

      var data = new FormData(form);
      // Human-readable label for the chosen issue type
      var typeLabel = '';
      if (typeSel && typeSel.selectedOptions.length) {
        typeLabel = typeSel.selectedOptions[0].textContent.trim();
      }

      var lines = [
        'Raport Problemi — F1 Taxi',
        'Emri: ' + data.get('name'),
        'Email: ' + data.get('email')
      ];
      if ((data.get('booking') || '').trim()) lines.push('ID: ' + data.get('booking'));
      if (typeLabel) lines.push('Lloji: ' + typeLabel);
      lines.push('Përshkrimi: ' + data.get('message'));

      // Save to the backend (best-effort, with anti-bot fields)
      if (window.f1ApiPost) {
        var payload = {
          name: data.get('name'), email: data.get('email'),
          booking_id: data.get('booking') || '',
          issue_type: typeLabel, message: data.get('message')
        };
        if (window.f1FormGuard) { var g = window.f1FormGuard(form); payload.hp_url = g.hp_url; payload.elapsed_ms = g.elapsed_ms; }
        window.f1ApiPost('/report.php', payload);
      }

      window.open(
        'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')),
        '_blank', 'noopener'
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
