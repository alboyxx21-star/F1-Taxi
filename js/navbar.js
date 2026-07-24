/* ============================================================
   F1 TAXI — navbar.js
   Navbar + fullscreen menu overlay: open/close (with the
   headlight-blink close), active-link state, language toggle.

   Classic script (no modules → works over file://). Exposes:
     window.F1.Navbar
   ============================================================ */

(function () {
  'use strict';

  var BLINK_MS = 950;           // matches the hlblink animation window
  var LANG_KEY = 'f1taxi.lang'; // localStorage persistence

  function Navbar(opts) {
    this.menu = document.getElementById('menu');
    this.toggleBtn = document.getElementById('nav-toggle');
    this.links = Array.prototype.slice.call(document.querySelectorAll('.menu__link'));
    this.langBtns = Array.prototype.slice.call(document.querySelectorAll('.menu__lang-btn'));
    this.logo = document.querySelector('.nav__logo');

    this.isOpen = false;
    this._blinkT = null;

    /** Injected by main.js — receives a page id on nav clicks. */
    this.onNavigate = (opts && opts.onNavigate) || function () {};

    this._bind();
    this._restoreLang();
  }

  Navbar.prototype._bind = function () {
    var self = this;

    this.toggleBtn.addEventListener('click', function () { self.toggle(); });

    // Nav links: if the target section lives on THIS page, smooth-scroll to
    // it (SPA-style); otherwise the href points to the other document, so let
    // the browser navigate there normally.
    this.links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        self._activate(link.getAttribute('data-page'), e);
      });
    });

    // Logo → home (Kreu). Same rule: scroll if here, navigate if not.
    if (this.logo) {
      this.logo.addEventListener('click', function (e) {
        self._activate(self.logo.getAttribute('data-page') || 'kreu', e);
      });
    }

    // Language toggle
    this.langBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.setLang(btn.getAttribute('data-lang'));
      });
    });

    // Escape closes the menu
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && self.isOpen) self.close();
    });
  };

  /** Route a nav/logo click. If the section exists in this document we handle
      it in-page (smooth scroll); otherwise we fall through to the link's href
      so the browser loads the other page. */
  Navbar.prototype._activate = function (page, e) {
    if (page && document.getElementById(page)) {
      if (e) e.preventDefault();
      this.setActive(page);
      this.close();
      this.onNavigate(page);
    }
    // else: cross-page link → do nothing, let the href navigate.
  };

  /* ---- Open / close ---- */

  Navbar.prototype.toggle = function () {
    this.isOpen ? this.close() : this.open();
  };

  Navbar.prototype.open = function () {
    clearTimeout(this._blinkT);
    this.isOpen = true;
    this.menu.classList.remove('is-closing');
    this.menu.classList.add('is-open');
    this.menu.setAttribute('aria-hidden', 'false');
    this.toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    // Freeze the page underneath so the overlay is static (no scroll bleed,
    // no car drift). Lenis owns the scroll when active; body overflow covers
    // the reduced-motion / no-Lenis case.
    if (window.F1 && window.F1.lenis) window.F1.lenis.stop();
  };

  Navbar.prototype.close = function () {
    if (!this.isOpen) return;
    var self = this;
    this.isOpen = false;
    this.menu.classList.remove('is-open');
    this.menu.classList.add('is-closing'); // car headlights blink out
    this.menu.setAttribute('aria-hidden', 'true');
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (window.F1 && window.F1.lenis) window.F1.lenis.start();
    clearTimeout(this._blinkT);
    this._blinkT = setTimeout(function () {
      self.menu.classList.remove('is-closing');
    }, BLINK_MS);
  };

  /* ---- Active link ---- */

  Navbar.prototype.setActive = function (page) {
    this.links.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-page') === page);
    });
  };

  /* ---- Language ---- */

  Navbar.prototype.setLang = function (lang) {
    lang = lang === 'EN' ? 'EN' : 'SQ';

    document.documentElement.setAttribute('lang', lang === 'EN' ? 'en' : 'sq');

    // Swap every translatable node on the page
    document.querySelectorAll('[data-sq][data-en]').forEach(function (el) {
      el.textContent = lang === 'EN'
        ? el.getAttribute('data-en')
        : el.getAttribute('data-sq');
    });

    // Inputs carry their copy in a placeholder rather than a text node.
    document.querySelectorAll('[data-sq-placeholder][data-en-placeholder]').forEach(function (el) {
      el.setAttribute('placeholder', lang === 'EN'
        ? el.getAttribute('data-en-placeholder')
        : el.getAttribute('data-sq-placeholder'));
    });

    this.langBtns.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-lang') === lang);
    });

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* private mode */ }
  };

  Navbar.prototype._restoreLang = function () {
    var saved = null;
    try { saved = localStorage.getItem(LANG_KEY); } catch (e) { /* private mode */ }
    if (saved === 'EN') this.setLang('EN');
  };

  window.F1 = window.F1 || {};
  window.F1.Navbar = Navbar;
})();
