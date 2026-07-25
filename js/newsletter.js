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

      // Save the subscriber to the backend (best-effort)
      if (window.f1ApiPost) window.f1ApiPost('/newsletter.php', { email: email.value.trim() });

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
