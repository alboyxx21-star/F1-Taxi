/* ============================================================
   F1 TAXI — main.js
   Bootstrap: wires the navbar to plain in-page scrolling.
   Nav clicks smooth-scroll to the matching section; the active
   nav link tracks whichever section is centre-screen.
   ============================================================ */

(function () {
  'use strict';

  /** Page order — must match the DOM order of [data-slide] sections. */
  var PAGES = ['kreu', 'rreth-nesh', 'sherbimet', 'cmimet', 'rezervo', 'kontakt'];

  function init() {
    var navbar = new window.F1.Navbar({
      onNavigate: function (page) {
        var el = document.getElementById(page);
        if (!el) return;
        // Prefer Lenis (js/scroll.js) so nav jumps use the same smoothing.
        if (window.F1 && window.F1.lenis) {
          window.F1.lenis.scrollTo(el, { offset: 0, duration: 1.2 });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    // Navbar is transparent over the hero video, green once scrolled down.
    var nav = document.getElementById('nav');
    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-scrolled', window.scrollY > 60);
      };
      onScroll(); // set correct state on load (e.g. refresh mid-page)
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    // Highlight the nav link for whichever section sits at centre-screen.
    var sections = PAGES
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var current = null;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.target.id !== current) {
            current = entry.target.id;
            navbar.setActive(current);
          }
        });
      }, {
        // a thin band across the vertical middle of the viewport
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0
      });

      sections.forEach(function (s) { io.observe(s); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
