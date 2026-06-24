/* REVERIE — scroll reveal + cursor + magnetic motion (single rAF loop) */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animQueue = [];

  /* ── Unified animation scheduler ───────────────────────────────────── */
  function addAnim(fn) { if (typeof fn === 'function' && animQueue.indexOf(fn) < 0) animQueue.push(fn); }

  function tickAll() {
    if (document.hidden) { requestAnimationFrame(tickAll); return; }
    for (var i = 0; i < animQueue.length; i++) animQueue[i]();
    requestAnimationFrame(tickAll);
  }
  requestAnimationFrame(tickAll);

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
  var cursorState = null;
  if (!reduced) {
    var dot = document.createElement('div');
    dot.className = 'cursor-dot';
    var ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    cursorState = {
      mx: -200, my: -200,
      rx: -200, ry: -200, vx: 0, vy: 0,
      s: 1, sv: 0, hov: false,
      idleT: 0
    };
    var hv = 'a, button, .craft-card, .world-row, .frame, .chip, .btn, .portrait, .magnetic, .lb-overlay, .is-zoomable, .site-nav a, input, textarea, select';

    document.addEventListener('mousemove', function (e) {
      cursorState.mx = e.clientX; cursorState.my = e.clientY;
      dot.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
      try { var el = document.elementFromPoint(e.clientX, e.clientY); cursorState.hov = !!(el && el.closest(hv)); } catch (_) {}
    });

    function tickCursor() {
      var c = cursorState;
      var dx = c.mx - c.rx, dy = c.my - c.ry;
      c.vx = (c.vx + dx * 0.12) * 0.72;
      c.vy = (c.vy + dy * 0.12) * 0.72;
      c.rx += c.vx; c.ry += c.vy;

      // Scale spring
      var ht = c.hov ? 1.18 : 1;
      c.sv = (c.sv + (ht - c.s) * 0.082) * 0.71;
      c.s += c.sv;

      // Idle micro-wobble
      c.idleT += 0.008;
      var drift = Math.sin(c.idleT * 0.6) * 0.4;

      ring.className = 'cursor-ring' + (c.hov ? ' is-hover' : '');
      ring.style.transform = 'translate(' + (c.rx + drift) + 'px,' + (c.ry + drift * 0.7) + 'px) scale(' + c.s + ')';
    }
    addAnim(tickCursor);
    // Force 0.5s idle before first tick to avoid initial flash
    setTimeout(function () { if (cursorState) { cursorState.idleT = 0; } }, 500);

    // Click micro-feedback
    document.addEventListener('mousedown', function () { dot.classList.add('is-active'); if (cursorState) cursorState.sv = -0.14; });
    document.addEventListener('mouseup', function () { dot.classList.remove('is-active'); if (cursorState) cursorState.sv = 0.1; setTimeout(function () { if (cursorState) cursorState.sv = 0; }, 80); });

    var itmr;
    document.addEventListener('mousemove', function () {
      dot.style.opacity = '1'; ring.style.opacity = '1';
      clearTimeout(itmr);
      itmr = setTimeout(function () { dot.style.opacity = '0'; ring.style.opacity = '0'; }, 4000);
    });
  }

  // ── Nav underline spring follower ────────────────────────────────
  var navState = null;
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
    var tp = pos(active);
    navState = { cur: { left: tp.left, width: tp.width, opacity: tp.opacity }, target: { left: tp.left, width: tp.width, opacity: tp.opacity } };

    links.forEach(function (link) {
      link.addEventListener('mouseenter', function () { var p = pos(link); navState.target.left = p.left; navState.target.width = p.width; navState.target.opacity = p.opacity; });
      link.addEventListener('mouseleave', function () { var p = pos(getActive()); navState.target.left = p.left; navState.target.width = p.width; navState.target.opacity = p.opacity; });
    });

    function tickNav() {
      navState.cur.left += (navState.target.left - navState.cur.left) * 0.13;
      navState.cur.width += (navState.target.width - navState.cur.width) * 0.13;
      navState.cur.opacity += (navState.target.opacity - navState.cur.opacity) * 0.13;
      indicator.style.transform = 'translateX(' + navState.cur.left + 'px)';
      indicator.style.width = navState.cur.width + 'px';
      indicator.style.opacity = navState.cur.opacity;
    }
    setTimeout(function () {
      var p = pos(getActive()); navState.cur.left = p.left; navState.cur.width = p.width; navState.cur.opacity = p.opacity;
      navState.target.left = p.left; navState.target.width = p.width; navState.target.opacity = p.opacity;
      addAnim(tickNav);
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

  // ── Hero parallax (scroll-driven, spring lerp) ─────────────────
  (function () {
    var hero = document.querySelector('.world-hero');
    var pageHero = document.querySelector('main.page > section:first-child');
    var target = hero || (pageHero && pageHero.style.backgroundImage ? pageHero : null);
    if (!target || reduced) return;
    if (!hero) target.style.backgroundAttachment = 'scroll';

    var cur = 50, vel = 0;

    window.addEventListener('scroll', function () {
      var rect = target.getBoundingClientRect();
      var viewH = window.innerHeight;
      var p = 1 - (rect.bottom + rect.height * 0.2) / (viewH + rect.height * 1.4);
      target.style.setProperty('--parallax-progress', Math.max(0, Math.min(1, p)));
    }, { passive: true });

    function tickParallax() {
      var p = parseFloat(target.style.getPropertyValue('--parallax-progress')) || 0;
      var targetY = 30 + p * 10;
      vel = (vel + (targetY - cur) * 0.035) * 0.72;
      cur += vel;
      target.style.backgroundPosition = '50% ' + cur + '%';
    }
    addAnim(tickParallax);
  })();

  // ── Portrait tilt w/ spring smoothing (Emil) ──────────────────────
  var tiltItems = [];
  (function () {
    var portraits = document.querySelectorAll('.craft-card .portrait');
    if (!portraits.length || reduced) return;
    portraits.forEach(function (p) {
      var state = { tx: 0, ty: 0, vx: 0, vy: 0, ttx: 0, tty: 0 };
      p.addEventListener('mousemove', function (e) {
        var r = p.getBoundingClientRect();
        state.ttx = ((e.clientX - r.left) / r.width - 0.5) * 4;
        state.tty = -((e.clientY - r.top) / r.height - 0.5) * 4;
      });
      p.addEventListener('mouseleave', function () { state.ttx = 0; state.tty = 0; });
      tiltItems.push({ el: p, state: state });
    });
  })();

  function tickTilts() {
    for (var i = 0; i < tiltItems.length; i++) {
      var item = tiltItems[i], s = item.state, st = 0.07, sd = 0.76;
      s.vx = (s.vx + (s.ttx - s.tx) * st) * sd;
      s.vy = (s.vy + (s.tty - s.ty) * st) * sd;
      s.tx += s.vx; s.ty += s.vy;
      item.el.style.transform = 'scale(1.04) perspective(800px) rotateX(' + s.ty + 'deg) rotateY(' + s.tx + 'deg)';
    }
  }
  if (tiltItems.length) addAnim(tickTilts);

  // ── World-row thumbnail tilt w/ spring ─────────────────────────────
  var rowTilts = [];
  (function () {
    var rows = document.querySelectorAll('.world-row .thumb');
    if (!rows.length || reduced) return;
    rows.forEach(function (thumb) {
      var state = { tx: 0, ty: 0, vx: 0, vy: 0, ttx: 0, tty: 0 };
      thumb.addEventListener('mousemove', function (e) {
        var r = thumb.getBoundingClientRect();
        state.ttx = ((e.clientX - r.left) / r.width - 0.5) * 10;
        state.tty = ((e.clientY - r.top) / r.height - 0.5) * 10;
      });
      thumb.addEventListener('mouseleave', function () { state.ttx = 0; state.tty = 0; });
      rowTilts.push({ el: thumb, s: state });
    });
  })();

  function tickRowTilts() {
    for (var i = 0; i < rowTilts.length; i++) {
      var item = rowTilts[i], s = item.s;
      s.vx = (s.vx + (s.ttx - s.tx) * 0.06) * 0.72;
      s.vy = (s.vy + (s.tty - s.ty) * 0.06) * 0.72;
      s.tx += s.vx; s.ty += s.vy;
      item.el.style.transform = 'scale(1.04) translate(' + s.tx + 'px,' + s.ty + 'px)';
    }
  }
  if (rowTilts.length) addAnim(tickRowTilts);

  // ── Image-strip frame tilt ─────────────────────────────────────────
  var frames = document.querySelectorAll('.image-strip .frame');
  if (frames.length && !reduced) {
    frames.forEach(function (frame) {
      var r = null;
      frame.classList.add('magnetic');
      frame.addEventListener('mouseenter', function () { r = frame.getBoundingClientRect(); });
      frame.addEventListener('mousemove', function (e) {
        if (!r) return;
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        frame.style.transform = 'perspective(600px) rotateX(' + (-py * 6) + 'deg) rotateY(' + (px * 6) + 'deg) scale(1.03)';
      });
      frame.addEventListener('mouseleave', function () { frame.style.transform = ''; r = null; });
    });
  }

  // ── Magnetic lift on buttons ───────────────────────────────────────
  var magnetics = document.querySelectorAll('.btn, .cta-btn, .chip');
  if (magnetics.length && !reduced) {
    magnetics.forEach(function (el) {
      var r = null;
      el.classList.add('magnetic');
      el.addEventListener('mouseenter', function () { r = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!r) return;
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translate(' + (px * 4) + 'px,' + (py * 4) + 'px) scale(1.03)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; r = null; });
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
