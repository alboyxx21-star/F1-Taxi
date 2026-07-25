/* ============================================================
   F1 TAXI — api-config.js
   One place that defines where the backend lives and a tiny
   fire-and-forget POST helper the forms use. Same-origin in
   production (site + api both on f1taxi.al), so base = "/api".
   ============================================================ */

window.F1_API_BASE = '/api';

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
