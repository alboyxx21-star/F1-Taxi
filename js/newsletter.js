/* ============================================================
   F1 TAXI — newsletter.js
   Handles the subscribe band: validates the email, then swaps the
   form for a thank-you message. No backend — this is a front-end
   confirmation; wire it to a real list/endpoint when available.

   Classic script (no modules → works over file://).
   ============================================================ */

(function () {
  'use strict';

  function init() {
    var form = document.getElementById('newsletter-form');
    var done = document.getElementById('newsletter-done');
    if (!form || !done) return;

    var email = document.getElementById('newsletter-email');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.classList.add('is-validated');

      if (!form.checkValidity()) {
        if (email) email.focus();
        return;
      }

      // Save the subscriber to the backend (best-effort, with anti-bot fields)
      if (window.f1ApiPost) {
        var payload = { email: email.value.trim() };
        if (window.f1FormGuard) { var g = window.f1FormGuard(form); payload.hp_url = g.hp_url; payload.elapsed_ms = g.elapsed_ms; }
        window.f1ApiPost('/newsletter.php', payload);
      }

      form.hidden = true;
      done.hidden = false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
