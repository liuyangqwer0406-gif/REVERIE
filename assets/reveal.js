/* REVERIE — scroll reveal + cursor + magnetic motion */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Splash screen ──────────────────────────────────────────────────
  try {
    if (!sessionStorage.getItem('rv_splash')) {
      var splash = document.createElement('div');
      splash.id = 'splash';
      splash.innerHTML =
        '<div id="splash-inner">' +
        '<svg class="splash-star" viewBox="0 0 80 80"><path d="M40 6l6 18h20l-16 11.5 6 19L40 43 24 54.5l6-19L14 24h20L40 6z" fill="#c5a472"/></svg>' +
        '<h1 class="splash-title">REVERIE</h1>' +
        '<p class="splash-sub">NOMADIC EXPERIENTIAL ART</p></div>';
      document.body.appendChild(splash);
      requestAnimationFrame(function () { splash.classList.add('is-visible'); });
      var d = reduced ? 100 : 1200;
      setTimeout(function () {
        splash.classList.add('is-hidden');
        setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 600);
      }, d);
      sessionStorage.setItem('rv_splash', '1');
    }
  } catch (_) {}

  // ── IntersectionObserver: add .in-view when elements enter ─────────
  (function () {
    var t = '.world-row, .essay-section, .image-strip, .craft-card';
    var els = document.querySelectorAll(t);
    if (reduced || !('IntersectionObserver' in window)) {
      for (var i = 0; i < els.length; i++) els[i].classList.add('in-view');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
        });
      }, { threshold: 0.08 });
      for (var j = 0; j < els.length; j++) io.observe(els[j]);
      setTimeout(function () {
        var all = document.querySelectorAll(t);
        for (var k = 0; k < all.length; k++) all[k].classList.add('in-view');
      }, 2000);
    }
  })();

  // ── Cursor (dual mass-spring w/ overshoot resonance — Emil Kowalski) ──
  if (!reduced) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var mx = -200, my = -200;
    var rx = -200, ry = -200, vx = 0, vy = 0;
    var sx = -200, sy = -200, svx = 0, svy = 0;
    var stiffness = 0.072, damping = 0.68;
    var sStiff = 0.028, sDamp = 0.64;
    var s = 1, sv = 0, hov = false;
    var hv = 'a, button, .craft-card, .world-row, .frame, .chip, .btn, .portrait, .magnetic, .lb-overlay, .is-zoomable, .site-nav a, input, textarea, select';
    var idleT = 0;

    document.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      try { var el = document.elementFromPoint(mx, my); hov = !!(el && el.closest(hv)); } catch (_) {}
    });

    function tickSpring() {
      // Primary spring (ring core)
      var dx = mx - rx, dy = my - ry;
      vx = (vx + dx * stiffness) * damping;
      vy = (vy + dy * stiffness) * damping;
      rx += vx; ry += vy;

      // Secondary spring — follows primary with lag = overshoot resonance
      var sdx = rx - sx, sdy = ry - sy;
      svx = (svx + sdx * sStiff) * sDamp;
      svy = (svy + sdy * sStiff) * sDamp;
      sx += svx; sy += svy;

      // Scale spring — overshoots on hover entry
      var ht = hov ? 1.18 : 1;
      sv = (sv + (ht - s) * 0.082) * 0.71;
      s += sv;

      // Idle micro-wobble (barely perceptible, only when stationary)
      idleT += 0.008;
      var drift = Math.sin(idleT * 0.6) * 0.4;

      ring.className = 'cursor-ring' + (hov ? ' is-hover' : '');
      ring.style.transform = 'translate(' + (sx + drift) + 'px,' + (sy + drift * 0.7) + 'px) scale(' + s + ')';
      requestAnimationFrame(tickSpring);
    }
    tickSpring();

    // Click micro-feedback (spring pop)
    document.addEventListener('mousedown', function () { dot.classList.add('is-active'); sv = -0.14; });
    document.addEventListener('mouseup', function () { dot.classList.remove('is-active'); sv = 0.1; setTimeout(function () { sv = 0; }, 80); });

    var itmr;
    document.addEventListener('mousemove', function () {
      dot.style.opacity = '1'; ring.style.opacity = '1';
      clearTimeout(itmr);
      itmr = setTimeout(function () { dot.style.opacity = '0'; ring.style.opacity = '0'; }, 4000);
    });
  }

  // ── Nav underline spring follower ────────────────────────────────
  (function () {
    var nav = document.querySelector('.site-nav');
    if (!nav || reduced) return;
    var links = nav.querySelectorAll('a');
    var indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    nav.appendChild(indicator);

    function getActive() { return nav.querySelector('a.is-current'); }
    function pos(el) {
      if (!el) return { left: 0, width: 0, opacity: 0 };
      var r = el.getBoundingClientRect(), nr = nav.getBoundingClientRect();
      return { left: r.left - nr.left, width: r.width, opacity: 1 };
    }

    var active = getActive();
    var target = pos(active), cur = { left: target.left, width: target.width, opacity: target.opacity };

    links.forEach(function (link) {
      link.addEventListener('mouseenter', function () { var p = pos(link); target.left = p.left; target.width = p.width; target.opacity = p.opacity; });
      link.addEventListener('mouseleave', function () { var p = pos(getActive()); target.left = p.left; target.width = p.width; target.opacity = p.opacity; });
    });

    function tickNav() {
      cur.left += (target.left - cur.left) * 0.13;
      cur.width += (target.width - cur.width) * 0.13;
      cur.opacity += (target.opacity - cur.opacity) * 0.13;
      indicator.style.transform = 'translateX(' + cur.left + 'px)';
      indicator.style.width = cur.width + 'px';
      indicator.style.opacity = cur.opacity;
      requestAnimationFrame(tickNav);
    }
    setTimeout(function () {
      var p = pos(getActive()); cur.left = p.left; cur.width = p.width; cur.opacity = p.opacity; target.left = p.left; target.width = p.width; target.opacity = p.opacity;
      tickNav();
    }, 80);
  })();

  // ── Card hover content spring lift ───────────────────────────────
  (function () {
    var cards = document.querySelectorAll('.craft-card');
    if (!cards.length || reduced) return;
    cards.forEach(function (card) {
      card.addEventListener('mouseenter', function () { card.classList.add('is-hover'); });
      card.addEventListener('mouseleave', function () { card.classList.remove('is-hover'); });
    });
  })();

  // ── Hero parallax (scroll-driven, Emil spring lerp) ─────────────────
  (function () {
    var hero = document.querySelector('.world-hero');
    var pageHero = document.querySelector('main.page > section:first-child');
    var target = hero || (pageHero && pageHero.style.backgroundImage ? pageHero : null);
    if (!target || reduced) return;
    if (!hero) target.style.backgroundAttachment = 'scroll';

    var cur = 50, vel = 0, springStiff = 0.035, springDamp = 0.72;

    window.addEventListener('scroll', function () {
      var rect = target.getBoundingClientRect();
      var viewH = window.innerHeight;
      var progress = 1 - (rect.bottom + rect.height * 0.2) / (viewH + rect.height * 1.4);
      progress = Math.max(0, Math.min(1, progress));
      target.style.setProperty('--parallax-progress', progress);
    });

    function tickParallax() {
      var p = parseFloat(target.style.getPropertyValue('--parallax-progress')) || 0;
      var targetY = 30 + p * 10;
      var d = targetY - cur;
      vel = (vel + d * springStiff) * springDamp;
      cur += vel;
      target.style.backgroundPosition = '50% ' + cur + '%';
      requestAnimationFrame(tickParallax);
    }
    tickParallax();
  })();

  // ── Portrait tilt w/ spring smoothing (Emil) ──────────────────────
  (function () {
    var portraits = document.querySelectorAll('.craft-card .portrait');
    if (!portraits.length || reduced) return;
    portraits.forEach(function (p) {
      var tx = 0, ty = 0, vx = 0, vy = 0, ttx = 0, tty = 0;
      p.addEventListener('mousemove', function (e) {
        var r = p.getBoundingClientRect();
        ttx = ((e.clientX - r.left) / r.width - 0.5) * 4;
        tty = -((e.clientY - r.top) / r.height - 0.5) * 4;
      });
      p.addEventListener('mouseleave', function () { ttx = 0; tty = 0; });
      function tickTilt() {
        vx = (vx + (ttx - tx) * 0.07) * 0.76;
        vy = (vy + (tty - ty) * 0.07) * 0.76;
        tx += vx; ty += vy;
        p.style.transform = 'scale(1.04) perspective(800px) rotateX(' + ty + 'deg) rotateY(' + tx + 'deg)';
        requestAnimationFrame(tickTilt);
      }
      tickTilt();
    });
  })();

  // ── World-row thumbnail tilt w/ spring ─────────────────────────────
  (function () {
    var rows = document.querySelectorAll('.world-row .thumb');
    if (!rows.length || reduced) return;
    rows.forEach(function (thumb) {
      var tx = 0, ty = 0, vx = 0, vy = 0, ttx = 0, tty = 0;
      thumb.addEventListener('mousemove', function (e) {
        var r = thumb.getBoundingClientRect();
        ttx = ((e.clientX - r.left) / r.width - 0.5) * 10;
        tty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      });
      thumb.addEventListener('mouseleave', function () { ttx = 0; tty = 0; });
      function tickRow() {
        vx = (vx + (ttx - tx) * 0.06) * 0.72;
        vy = (vy + (tty - ty) * 0.06) * 0.72;
        tx += vx; ty += vy;
        thumb.style.transform = 'scale(1.04) translate(' + tx + 'px,' + ty + 'px)';
        requestAnimationFrame(tickRow);
      }
      tickRow();
    });
  })();

  // ── Image-strip frame tilt ─────────────────────────────────────────
  var frames = document.querySelectorAll('.image-strip .frame');
  if (frames.length && !reduced) {
    frames.forEach(function (frame) {
      frame.classList.add('magnetic');
      frame.addEventListener('mousemove', function (e) {
        var r = frame.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.transform = 'perspective(600px) rotateX(' + (-py * 6) + 'deg) rotateY(' + (px * 6) + 'deg) scale(1.03)';
      });
      frame.addEventListener('mouseleave', function () { frame.style.transform = ''; });
    });
  }

  // ── Magnetic lift on buttons ───────────────────────────────────────
  var magnetics = document.querySelectorAll('.btn, .cta-btn, .chip');
  if (magnetics.length && !reduced) {
    magnetics.forEach(function (el) {
      el.classList.add('magnetic');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translate(' + (px * 4) + 'px,' + (py * 4) + 'px) scale(1.03)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  // ── Lightbox ────────────────────────────────────────────────────────
  var lb = document.createElement('div');
  lb.className = 'lb-overlay';
  var li = document.createElement('img');
  li.className = 'lb-img'; li.alt = '';
  var lc = document.createElement('span');
  lc.className = 'lb-close'; lc.textContent = '×';
  lc.setAttribute('aria-label', '关闭');
  lb.appendChild(li); lb.appendChild(lc);
  document.body.appendChild(lb);

  function openLb(u) { li.src = u; lb.classList.add('is-open'); }
  function closeLb() { lb.classList.remove('is-open'); }
  lb.addEventListener('click', function (e) { if (e.target !== li) closeLb(); });
  lc.addEventListener('click', closeLb);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); });

  document.querySelectorAll('.image-strip .frame, .craft-card .portrait').forEach(function (el) {
    el.classList.add('is-zoomable');
    el.addEventListener('click', function () {
      var bg = window.getComputedStyle(el).backgroundImage;
      var m = bg.match(/url\(["']?([^"')]+)["']?\)/);
      if (m) openLb(m[1]);
    });
  });

})();
