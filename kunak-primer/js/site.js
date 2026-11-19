/* Кунак (пример сайта) — интерактив и движение. Без библиотек: transform / opacity / clip-path. */
(function () {
  'use strict';
  var d = document.documentElement;
  var mqCalm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var calm = function () { return mqCalm.matches; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var header = $('#top-header');
  var headerH = function () { return header ? header.offsetHeight : 0; };

  /* Плавная прокрутка с фиксированной длительностью (M06: до 350 мс) */
  function scrollToY(y, dur) {
    y = Math.max(0, Math.round(y));
    if (calm() || !dur) { window.scrollTo(0, y); return; }
    var y0 = window.scrollY, dy = y - y0, t0 = performance.now();
    if (Math.abs(dy) < 2) return;
    (function step(now) {
      var t = clamp((now - t0) / dur, 0, 1);
      window.scrollTo(0, y0 + dy * easeIO(t));
      if (t < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ---------- Сцена M01 ---------- */
  var scene = $('.scene'), stage = $('.stage');
  var pin = { on: false };
  if (scene) {
    var frame = $('.frame', scene), img = $('.frame img', scene), shade = $('.frame__shade', scene);
    var cap = $('.frame__cap', scene), heroCopy = $('.hero__copy', scene), tableCopy = $('.table__copy', scene);
    var cards = $$('.cards .card', scene).slice(1);
    var IW = 1600, IH = 900;
    var BASE = [ // прогресс → x, y, w, h для viewport 1440×900 (CLAUDE-SPEC §5)
      { p: 0, r: null },
      { p: .20, r: [72, 100, 1296, 730] },
      { p: .65, r: [680, 200, 688, 480] },
      { p: 1, r: [680, 190, 688, 430] }
    ];
    var CARD = [[680, 650, 330, 185], [1038, 650, 330, 185]];
    var L = {};

    var wantPin = function () {
      var weak = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) ||
                 (navigator.connection && navigator.connection.saveData);
      return !calm() && !weak && window.innerWidth >= 1200 && window.innerHeight >= 640;
    };
    var map = function (r) {
      return [L.offx + r[0] * L.s, L.hdr + (r[1] - 80) * L.k, r[2] * L.s, r[3] * L.k];
    };

    var layout = function () {
      var on = wantPin();
      if (on !== pin.on) {
        pin.on = on;
        d.classList.toggle('pin', on);
        if (!on) {
          [img, shade, cap, heroCopy, tableCopy, frame].concat(cards).forEach(function (el) { el && el.removeAttribute('style'); });
          stage.removeAttribute('style');
        }
      }
      if (!on) return;
      var W = window.innerWidth, H = window.innerHeight;
      L.W = W; L.H = H; L.hdr = headerH() || 80;
      L.s = Math.min(W, 1440) / 1440; L.offx = (W - 1440 * L.s) / 2; L.k = (H - L.hdr) / 820;
      L.kb = Math.max(W / IW, H / IH);
      stage.style.setProperty('--s', L.s.toFixed(4));
      stage.style.setProperty('--k', L.k.toFixed(4));
      stage.style.setProperty('--offx', L.offx.toFixed(1));
      img.style.width = IW * L.kb + 'px'; img.style.height = IH * L.kb + 'px';
      L.keys = BASE.map(function (b) { return { p: b.p, r: b.r ? map(b.r) : [0, 0, W, H] }; });
      cards.forEach(function (c, i) {
        var r = map(CARD[i]);
        c.style.left = r[0] + 'px'; c.style.top = r[1] + 'px'; c.style.width = r[2] + 'px'; c.style.height = r[3] + 'px';
      });
      L.capH = cap.offsetHeight;
      update();
    };

    var progress = function () {
      var dist = scene.offsetHeight - window.innerHeight;
      return clamp(-scene.getBoundingClientRect().top / dist, 0, 1);
    };
    var rectAt = function (p) {
      var K = L.keys, i = 0;
      while (i < K.length - 2 && p > K[i + 1].p) i++;
      var a = K[i], b = K[i + 1], t = easeIO(clamp((p - a.p) / (b.p - a.p), 0, 1));
      return a.r.map(function (v, j) { return v + (b.r[j] - v) * t; });
    };

    var update = function () {
      if (!pin.on) return;
      var p = progress(), W = L.W, H = L.H;
      var r = rectAt(p), x = r[0], y = r[1], w = r[2], h = r[3];
      // кадр: cover внутри прямоугольника, точка фокуса 60%/50%; геометрия еды не искажается
      var kr = Math.max(w / IW, h / IH), sc = kr / L.kb;
      var ix = x + (w - IW * kr) * .6, iy = y + (h - IH * kr) * .5;
      img.style.transform = 'translate3d(' + ix.toFixed(2) + 'px,' + iy.toFixed(2) + 'px,0) scale(' + sc.toFixed(5) + ')';
      frame.style.clipPath = 'inset(' + y.toFixed(2) + 'px ' + (W - x - w).toFixed(2) + 'px ' + (H - y - h).toFixed(2) + 'px ' + x.toFixed(2) + 'px)';

      var a = easeIO(clamp(p / .2, 0, 1));
      shade.style.opacity = (1 - a).toFixed(3);
      heroCopy.style.opacity = (1 - a).toFixed(3);
      heroCopy.style.transform = 'translate3d(0,' + (-40 * a).toFixed(2) + 'px,0)';
      heroCopy.style.pointerEvents = a < .5 ? 'auto' : 'none';

      var b = easeIO(clamp((p - .22) / .36, 0, 1));
      tableCopy.style.opacity = b.toFixed(3);
      tableCopy.style.transform = 'translate3d(0,' + (24 * (1 - b)).toFixed(2) + 'px,0)';
      tableCopy.style.pointerEvents = b > .5 ? 'auto' : 'none';

      var c = easeIO(clamp((p - .72) / .23, 0, 1));
      var tilt = [-1, 1.2];
      cards.forEach(function (el, i) {
        el.style.opacity = c.toFixed(3);
        el.style.transform = 'translate3d(0,' + (20 * (1 - c)).toFixed(2) + 'px,0) rotate(' + (tilt[i] * c).toFixed(3) + 'deg)';
        el.style.pointerEvents = c > .5 ? 'auto' : 'none';
      });
      cap.style.pointerEvents = c > .5 ? 'auto' : 'none';
      cap.style.opacity = c.toFixed(3);
      cap.style.transform = 'translate3d(' + (x + 12).toFixed(2) + 'px,' + (y + h - 12 - L.capH).toFixed(2) + 'px,0)';

      if (header && !header.classList.contains('header--light')) header.classList.toggle('solid', p > .01 || window.scrollY > 8);
      d.dataset.m01 = Math.round(p * 100);
    };

    // скролл до конца сцены (якорь «О кафе» и клавиатурный фокус)
    pin.endY = function () { return scene.offsetTop + scene.offsetHeight - window.innerHeight; };
    pin.aboutY = function () {
      if (pin.on) return pin.endY();
      return $('#about').getBoundingClientRect().top + window.scrollY - headerH();
    };
    scene.addEventListener('focusin', function (e) {
      if (!pin.on) return;
      var p = progress();
      if (heroCopy.contains(e.target) && p > .1) window.scrollTo(0, scene.offsetTop);
      if ((tableCopy.contains(e.target) || cap.contains(e.target) || cards.some(function (c) { return c.contains(e.target); })) && p < .95) window.scrollTo(0, pin.endY());
    });

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', layout);
    mqCalm.addEventListener && mqCalm.addEventListener('change', layout);
    if (img.complete) layout(); else { layout(); img.addEventListener('load', layout); }
  }

  /* Хедер главной: прозрачный над hero, тёмный после прокрутки */
  if (header && !header.classList.contains('header--light')) {
    var solid = function () { if (!pin.on) header.classList.toggle('solid', window.scrollY > 8); };
    window.addEventListener('scroll', solid, { passive: true }); solid();
  }

  /* Якоря «О кафе» с учётом сцены */
  var goAbout = function (instant) { if ($('#about')) scrollToY(pin.aboutY ? pin.aboutY() : 0, instant ? 0 : 350); };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#about"]');
    if (a && !a.closest('.panel')) { e.preventDefault(); goAbout(); history.replaceState(null, '', '#about'); }
  });
  if (location.hash === '#about') window.addEventListener('load', function () { setTimeout(function () { goAbout(true); }, 30); });

  /* ---------- Панели M05 / M06 ---------- */
  var openPanel = null;
  function panelOpen(panel, trigger) {
    if (openPanel) panelClose(openPanel, true);
    openPanel = { el: panel, trigger: trigger };
    panel.hidden = false; panel.classList.remove('closing');
    void panel.offsetHeight;
    panel.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    if (trigger.classList.contains('burger')) trigger.setAttribute('aria-label', 'Закрыть меню навигации');
    header && header.classList.add('menu-open');
    document.body.classList.add('locked');
    var f = $('a, button', panel); f && f.focus({ preventScroll: true });
  }
  function panelClose(state, silent, after) {
    var panel = state.el, trigger = state.trigger;
    panel.classList.remove('open'); panel.classList.add('closing');
    trigger.setAttribute('aria-expanded', 'false');
    if (trigger.classList.contains('burger')) trigger.setAttribute('aria-label', 'Открыть меню навигации');
    header && header.classList.remove('menu-open');
    document.body.classList.remove('locked');
    openPanel = null;
    var dur = calm() ? 0 : 180;
    setTimeout(function () { if (!panel.classList.contains('open')) panel.hidden = true; if (after) after(); }, dur);
    if (!silent) trigger.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (e) {
    if (!openPanel) return;
    if (e.key === 'Escape') { e.preventDefault(); panelClose(openPanel); return; }
    if (e.key === 'Tab') { // ловушка фокуса: триггер + элементы панели
      var list = [openPanel.trigger].concat($$('a, button', openPanel.el));
      var i = list.indexOf(document.activeElement);
      var next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i === list.length - 1 ? 0 : i + 1);
      e.preventDefault(); list[next].focus();
    }
  });

  var burger = $('.burger'), navPanel = $('#nav-panel');
  if (burger && navPanel) {
    burger.addEventListener('click', function () {
      if (openPanel) panelClose(openPanel); else panelOpen(navPanel, burger);
    });
    $$('a', navPanel).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href.charAt(0) !== '#') { if (openPanel) panelClose(openPanel, true); return; }
        e.preventDefault();
        panelClose(openPanel, false, function () {
          if (href === '#about') goAbout();
          else if (href === '#top') scrollToY(0, 350);
          else { var t = $(href); t && scrollToY(t.getBoundingClientRect().top + window.scrollY - headerH(), 350); }
        });
      });
    });
  }

  /* ---------- Категории меню ---------- */
  var cats = $$('.mcat');
  if (cats.length) {
    var catsBtn = $('.cats__btn'), catsPanel = $('#cats-panel'), label = $('.cats__label');
    var stickyH = function () { return headerH() + $('.cats').offsetHeight + 8; };
    var setActive = function (id) {
      cats.forEach(function (c) { c.classList.toggle('is-active', c.id === id); });
      $$('.cats__bar a, #cats-panel a').forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id || (!id && a.getAttribute('href') === '#menu-top');
        on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current');
      });
      if (label) { var h = id && $('#' + id + ' h2'); label.textContent = h ? h.textContent : 'Все категории'; }
    };
    var goCat = function (href) {
      if (href === '#menu-top') { scrollToY(0, 350); setActive(''); return; }
      var t = $(href); if (!t) return;
      scrollToY(t.getBoundingClientRect().top + window.scrollY - stickyH(), 350);
      setActive(t.id);
      history.replaceState(null, '', href);
    };
    $$('.cats__bar a').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); goCat(a.getAttribute('href')); var h = $(a.getAttribute('href') + ' h2'); h && h.setAttribute('tabindex', '-1'); h && h.focus({ preventScroll: true }); });
    });
    catsBtn.addEventListener('click', function () {
      if (openPanel && openPanel.el === catsPanel) panelClose(openPanel); else panelOpen(catsPanel, catsBtn);
    });
    $$('a', catsPanel).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var href = a.getAttribute('href');
        panelClose(openPanel, false, function () { goCat(href); });
      });
    });
    var spy = function () {
      var y = stickyH() + 24, id = '';
      cats.forEach(function (c) { if (c.getBoundingClientRect().top <= y) id = c.id; });
      if (window.innerWidth >= 1200) { // две колонки: активна та, у которой заголовок выше линии последним
        var best = null;
        cats.forEach(function (c) { var t = c.getBoundingClientRect().top; if (t <= y && (!best || t > best.t)) best = { id: c.id, t: t }; });
        id = best ? best.id : '';
      }
      setActive(id);
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(spy); }, { passive: true });
    spy();
    if (location.hash && $(location.hash) && $(location.hash).classList.contains('mcat')) {
      window.addEventListener('load', function () { setTimeout(function () { goCat(location.hash); }, 30); });
    }
  }

  /* ---------- Диалог контакта (desktop) ---------- */
  var dlg = $('#call-dialog');
  if (dlg && typeof dlg.showModal === 'function') {
    $$('[data-call]').forEach(function (a) {
      a.addEventListener('click', function (e) {
                e.preventDefault(); dlg.showModal();
      });
    });
    $$('[data-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------- Копирование адреса ---------- */
  var copyBtn = $('[data-copy]');
  if (copyBtn && navigator.clipboard && window.isSecureContext) {
    copyBtn.hidden = false;
    copyBtn.addEventListener('click', function () {
      var out = $('.copy-ok');
      navigator.clipboard.writeText(copyBtn.dataset.copy).then(function () { out.textContent = 'Адрес скопирован'; },
        function () { out.textContent = 'Не получилось скопировать — выделите адрес вручную'; });
      setTimeout(function () { out.textContent = ''; }, 4000);
    });
  }

  /* ---------- Появления M02 / M03 / карточки ---------- */
  if (d.classList.contains('anim') && 'IntersectionObserver' in window) {
    var once = function (els, opts) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, opts);
      els.forEach(function (el) { io.observe(el); });
    };
    once($$('.rv'), { threshold: .2 });
    once($$('.coffee'), { threshold: .3 });
    once($$('.breakfast'), { threshold: .25 });
  } else {
    $$('.rv, .coffee, .breakfast').forEach(function (el) { el.classList.add('in'); });
  }

  /* M02: смещение фото кофе до 24 px, только desktop */
  var cph = $('[data-parallax]');
  if (cph && !calm()) {
    var mqDesk = window.matchMedia('(min-width: 1024px)');
    var par = function () {
      if (!mqDesk.matches) { cph.style.transform = ''; return; }
      var r = cph.parentNode.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var t = clamp((vh - r.top) / (vh + r.height), 0, 1);
      cph.style.transform = 'translate3d(0,' + ((t - .5) * 48).toFixed(1) + 'px,0)';
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(par); }, { passive: true });
    window.addEventListener('resize', par); par();
  }

  /* Нижняя кнопка звонка на странице меню: после шапки меню, прячется у финального блока */
  var bar = $('.callbar'), mhead = $('.mhead'), mcta = $('.mcta');
  if (bar && mhead && mcta) {
    var barTick = function () {
      var show = mhead.getBoundingClientRect().bottom < 0 && mcta.getBoundingClientRect().top > window.innerHeight - 40 && !openPanel;
      bar.classList.toggle('show', show);
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(barTick); }, { passive: true });
    barTick();
  }

  window.__mfReady = true; // страховка в <head> больше не нужна
})();
