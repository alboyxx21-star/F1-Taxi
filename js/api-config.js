/* ============================================================
   F1 TAXI — api-config.js
   One place that defines where the backend lives and a tiny
   fire-and-forget POST helper the forms use. Same-origin in
   production (site + api both on f1taxi.al), so base = "/api".
   ============================================================ */

window.F1_API_BASE = '/api';

/* When the page became interactive — used for the anti-bot time-trap.
   A human takes seconds to fill a form; a bot posts within milliseconds. */
window.__f1_start = Date.now();

/* Anti-bot fields to merge into any form submission:
   · hp_url    — value of the form's hidden honeypot input (empty for humans)
   · elapsed_ms — time on the page before submitting
   The backend silently drops anything that fails these checks. */
window.f1FormGuard = function (formEl) {
  var hp = formEl && formEl.querySelector ? formEl.querySelector('input[name="hp_url"]') : null;
  return {
    hp_url: hp ? hp.value : '',
    elapsed_ms: window.__f1_start ? (Date.now() - window.__f1_start) : 9999
  };
};

/* POST JSON to the API. Best-effort: never blocks the UI or throws.
   Returns a promise (callers may ignore it). */
window.f1ApiPost = function (path, data) {
  try {
    return fetch((window.F1_API_BASE || '/api') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
      keepalive: true
    }).catch(function () {});
  } catch (e) {
    return Promise.resolve();
  }
};
