/* ============================================================
   F1 TAXI — scroll.js
   GSAP ScrollTrigger cinematics (+ optional Lenis smoothing).

     · Kreu → Rreth Nesh: hero parallax/fade + video zoom

   Layered so each piece degrades on its own:
     - cinematics need GSAP + ScrollTrigger (Lenis is optional)
     - reduced motion skips the scroll cinematics
   ============================================================ */

(function () {
  'use strict';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;

  if (!reduce && gsap && ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    initLenis();
    initTransitions();
  }

  /* ---- Optional: Lenis smooth scroll, driven by the GSAP ticker ---- */
  function initLenis() {
    if (!window.Lenis) return; // no Lenis → native scroll, cinematics still run
    var lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    window.F1 = window.F1 || {};
    window.F1.lenis = lenis;
  }

  /* ---- Scroll-linked cinematics ---- */
  function initTransitions() {
    // Kreu → Rreth Nesh: hero lifts + fades, video zooms
    var kreu = document.getElementById('kreu');
    var kreuContent = document.querySelector('.kreu-content');
    var kreuVideo = document.querySelector('.kreu-video');
    if (kreu && kreuContent) {
      gsap.timeline({
        scrollTrigger: { trigger: kreu, start: 'top top', end: 'bottom top', scrub: true }
      })
        .to(kreuContent, { yPercent: -45, autoAlpha: 0, ease: 'none' }, 0)
        .to(kreuVideo, { scale: 1.18, yPercent: 10, ease: 'none' }, 0);
    }

    // Rreth Nesh: media blocks float up as they enter the viewport.
    // toggleActions "restart … reset": replay every time the block
    // re-enters from above, reset once it scrolls back out above.
    gsap.utils.toArray('#rreth-nesh [data-reveal], #sherbimet [data-reveal], #cmimet [data-reveal]').forEach(function (el) {
      gsap.from(el, {
        y: 48,
        autoAlpha: 0,
        duration: .9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          toggleActions: 'restart none none reset'
        }
      });
    });

    initAboutText();

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  /* ---- Rreth Nesh: word-by-word text reveal ----
     Each text element is split into masked word spans that rise
     into place on scroll. Re-splits after the SQ/EN toggle, since
     the toggle rewrites textContent and discards the spans. */
  function initAboutText() {
    var selector = [
      '#rreth-nesh .about__title',
      '#rreth-nesh .about__intro',
      '#rreth-nesh .about__quote-text',
      '#rreth-nesh .about__card-tag span',
      '#rreth-nesh .about__card p',
      '#rreth-nesh .about__stat span',
      '#rreth-nesh .about__vm-card h3',
      '#rreth-nesh .about__vm-card p'
    ].join(',');

    var els = gsap.utils.toArray(selector);
    if (!els.length) return;

    els.forEach(function (el) {
      splitWords(el);
      animateWords(el);
    });

    initStatCounters();

    // Decorative quote mark: simple fade-up alongside the quote text
    var mark = document.querySelector('#rreth-nesh .about__quotemark');
    if (mark) {
      gsap.from(mark, {
        y: 24,
        autoAlpha: 0,
        duration: .7,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: mark,
          start: 'top 90%',
          toggleActions: 'restart none none reset'
        }
      });
    }

    // The language toggle replaces textContent — split & animate again.
    // (These listeners run after the navbar's, so the new text is in place.)
    document.querySelectorAll('.menu__lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        els.forEach(function (el) {
          splitWords(el);
          animateWords(el);
        });
      });
    });
  }

  /** Count each stat number up from 0 when it scrolls into view.
      Parses the leading integer and keeps the rest as a suffix,
      so "10+" → 0+…10+, "50K+" → 0K+…50K+, "24/7" → 0/7…24/7. */
  function initStatCounters() {
    gsap.utils.toArray('#rreth-nesh .about__stat strong').forEach(function (el) {
      var m = el.textContent.trim().match(/^(\d+)(.*)$/);
      if (!m) return;
      var target = parseInt(m[1], 10);
      var suffix = m[2];
      var state = { v: 0 };
      el.textContent = '0' + suffix;
      gsap.to(state, {
        v: target,
        duration: 1.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'restart none none reset'
        },
        onUpdate: function () {
          el.textContent = Math.round(state.v) + suffix;
        }
      });
    });
  }

  /** Wrap every word in an overflow-hidden mask span for the rise effect. */
  function splitWords(el) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', text); // spans below are aria-hidden

    var frag = document.createDocumentFragment();
    text.split(' ').forEach(function (word, i) {
      if (i) frag.appendChild(document.createTextNode(' '));
      var mask = document.createElement('span');
      mask.className = 'aw-mask';
      mask.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'aw';
      inner.textContent = word;
      mask.appendChild(inner);
      frag.appendChild(mask);
    });

    el.textContent = '';
    el.appendChild(frag);
  }

  /** Stagger the words up out of their masks when the element scrolls in. */
  function animateWords(el) {
    // Drop the previous tween/trigger (they hold detached spans after a re-split)
    if (el._awTween) {
      if (el._awTween.scrollTrigger) el._awTween.scrollTrigger.kill();
      el._awTween.kill();
    }
    el._awTween = gsap.from(el.querySelectorAll('.aw'), {
      yPercent: 115,
      duration: .75,
      ease: 'power3.out',
      stagger: .028,
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
        toggleActions: 'restart none none reset'
      }
    });
  }
})();
