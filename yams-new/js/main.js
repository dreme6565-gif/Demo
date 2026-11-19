/* Студия ЯМС — «Линия ухода». Без сторонних библиотек, без cookie и хранилищ. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SHEET = window.matchMedia('(max-width: 1059px)');
  var D = window.YAMS || { items: {}, phone: '79522086611', tg: '' };
  var ruble = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽'; };

  /* ---------- шапка и меню ---------- */
  var header = $('#top'), burger = $('.burger'), drawer = $('#drawer');
  function onScrollHdr() { header.classList.toggle('scrolled', window.scrollY > 8); }
  function setDrawer(open) {
    if (!drawer) return;
    drawer.classList.toggle('open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (burger) {
    burger.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', function () { setDrawer(false); }); });
  }
  window.addEventListener('scroll', onScrollHdr, { passive: true }); onScrollHdr();

  /* ---------- появление блоков ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }) : null;
  $$('.rv,[data-split]').forEach(function (el) {
    if (io && !REDUCED) io.observe(el); else el.classList.add('in');
  });

  /* ---------- кнопки: магнит (компьютер) / волна от касания (телефон) ---------- */
  $$('.btn').forEach(function (b) {
    if (FINE && b.hasAttribute('data-mag') && !REDUCED) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    }
    if (!FINE) {
      b.addEventListener('pointerdown', function (e) {
        var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = document.createElement('i');
        i.className = 'rip'; i.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
        b.appendChild(i); setTimeout(function () { i.remove(); }, 720);
      });
    }
  });

  /* ---------- аккордеон меню ухода ---------- */
  function setBand(band, open) {
    var head = $('.band-head', band), body = $('.band-body', band);
    band.classList.toggle('open', open);
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { body.classList.add('vis'); }
    else { setTimeout(function () { if (!band.classList.contains('open')) body.classList.remove('vis'); }, 650); }
  }
  var bands = $$('.band');
  bands.forEach(function (band) {
    $('.band-head', band).addEventListener('click', function () {
      var willOpen = !band.classList.contains('open');
      bands.forEach(function (o) { if (o !== band) setBand(o, false); });
      setBand(band, willOpen);
    });
  });

  /* ---------- калькулятор «Ваш уход» ---------- */
  var cart = {};
  var receipt = $('#receipt'), list = $('#rc-list'), roll = $('#roll'), srTotal = $('#rc-sr');
  var cnt = $('#rc-cnt'), wave = $('#rc-w'), clr = $('#rc-clr');
  var rcWa = $('#rc-wa'), rcTg = $('#rc-tg'), mbN = $('#mb-n'), mbS = $('#mb-s'), mbWa = $('#mb-wa'), mbOpen = $('#mb-open');
  var scrim = $('#scrim');
  var rollSig = '', rollEls = [];

  function plural(n) { var m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? 'процедура' : (m >= 2 && m <= 4 && (h < 12 || h > 14)) ? 'процедуры' : 'процедур'; }
  function total() { var s = 0; for (var k in cart) s += cart[k] * D.items[k].p; return s; }
  function count() { var c = 0; for (var k in cart) c += cart[k]; return c; }

  function renderRoll(n) {
    if (!roll) return;
    var str = ruble(n), sig = str.replace(/\d/g, '0');
    if (sig !== rollSig) {
      rollSig = sig; roll.innerHTML = ''; rollEls = [];
      str.split('').forEach(function (ch) {
        var s = document.createElement('span');
        if (/\d/.test(ch)) {
          s.className = 'd'; var i = document.createElement('i');
          for (var k = 0; k < 10; k++) { var b = document.createElement('b'); b.textContent = k; i.appendChild(b); }
          s.appendChild(i); rollEls.push(i);
        } else { s.className = 'c'; s.textContent = ch; }
        roll.appendChild(s);
      });
      requestAnimationFrame(function () { requestAnimationFrame(function () { setRoll(str); }); });
    } else setRoll(str);
  }
  function setRoll(str) {
    var digits = str.replace(/\D/g, '').split(''), start = 0;
    rollEls.forEach(function (i, idx) { i.style.transform = 'translateY(-' + (+digits[idx]) + 'em)'; });
  }

  function message() {
    var lines = ['Здравствуйте! Хочу записаться в студию ЯМС.'];
    var ks = Object.keys(cart);
    if (ks.length) {
      lines.push('Хочу:');
      ks.forEach(function (k) {
        var it = D.items[k], q = cart[k];
        lines.push('• ' + it.n + (q > 1 ? ' × ' + q : '') + ' — ' + ruble(q * it.p));
      });
      lines.push('Итого по прайсу: ' + ruble(total()) + ' (ориентировочно).');
    }
    lines.push('Подскажите, пожалуйста, ближайшее свободное время.');
    return lines.join('\n');
  }

  function renderCart(opts) {
    var ks = Object.keys(cart), c = count(), t = total();
    $$('.item').forEach(function (li) {
      var q = cart[li.dataset.id] || 0;
      li.classList.toggle('sel', q > 0);
      var o = $('output', li); if (o) o.textContent = q || 1;
    });
    if (!ks.length) list.innerHTML = '<p class="rc-empty">Пока пусто. Добавьте процедуры из меню, и здесь появится расчёт.</p>';
    else list.innerHTML = ks.map(function (k) {
      var it = D.items[k], q = cart[k];
      return '<div class="rc-row"><span>' + it.n + '<br><small>' + q + ' × ' + ruble(it.p) + '</small></span><b>' + ruble(q * it.p) + '</b></div>';
    }).join('');
    cnt.textContent = c + ' ' + plural(c);
    renderRoll(t);
    if (srTotal) srTotal.textContent = 'Итого ' + ruble(t);
    wave.style.strokeDashoffset = String(1 - Math.min(1, c / 6));
    clr.hidden = !ks.length;
    var msg = message(), url = 'https://wa.me/' + D.phone + '?text=' + encodeURIComponent(msg);
    rcWa.href = url; mbWa.href = url;
    $$('a[data-wa]').forEach(function (a) { a.href = url; });
    mbN.textContent = c; mbS.textContent = c ? '· ' + ruble(t) : '';
    mbN.parentNode.setAttribute('aria-label', 'Мой уход: ' + c + ' ' + plural(c) + (c ? ', ' + ruble(t) : ''));
  }

  function changeQty(id, d, silent) {
    var q = (cart[id] || 0) + d;
    if (q <= 0) delete cart[id]; else cart[id] = Math.min(q, 20);
    renderCart();
    if (d > 0 && !silent) pulse();
  }
  function pulse() { if (!receipt || REDUCED) return; receipt.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.012)' }, { transform: 'scale(1)' }], { duration: 400 }); }

  $$('.item').forEach(function (li) {
    var id = li.dataset.id;
    $('.add', li).addEventListener('click', function () { changeQty(id, 1); });
    $('.p', li).addEventListener('click', function () { changeQty(id, 1); });
    $('.m', li).addEventListener('click', function () { changeQty(id, -1); });
  });
  if (clr) clr.addEventListener('click', function () { cart = {}; renderCart(); });

  /* toast */
  var toastEl = document.createElement('div'); toastEl.id = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl);
  var toastT;
  function toast(t) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('on'); }, 3200); }

  /* Telegram: копируем список и открываем чат */
  if (rcTg) rcTg.addEventListener('click', function () {
    var msg = message();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(msg);
      else { var ta = document.createElement('textarea'); ta.value = msg; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      toast('Список скопирован. В Telegram нажмите «Вставить».');
    } catch (e) { toast('Откройте чат и напишите администратору.'); }
  });

  /* нижний лист на телефоне */
  function openSheet(open) {
    if (!SHEET.matches) return;
    receipt.classList.toggle('open', open); scrim.classList.toggle('on', open);
    mbOpen.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) receipt.focus({ preventScroll: true }); else mbOpen.focus({ preventScroll: true });
  }
  if (mbOpen) mbOpen.addEventListener('click', function () { openSheet(!receipt.classList.contains('open')); });
  if (scrim) scrim.addEventListener('click', function () { openSheet(false); });
  $('.rc-close').addEventListener('click', function () { openSheet(false); });
  SHEET.addEventListener && SHEET.addEventListener('change', function () { receipt.classList.remove('open'); scrim.classList.remove('on'); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (receipt && receipt.classList.contains('open')) openSheet(false);
    if (drawer && drawer.classList.contains('open')) { setDrawer(false); burger.focus(); }
  });

  var smasAdd = $('#smas-add');
  if (smasAdd) smasAdd.addEventListener('click', function () { changeQty('smas', 1); toast('SMAS-лифтинг добавлен в ваш уход'); });
  renderCart();

  /* ---------- линия-волна (фишка) ---------- */
  var svg = $('#thread'), tp = $('#tp'), tg = $('#tg'), tn = $('#tn'), th = $('#th');
  var T = { H: 0, W: 0, x0: 12, A: 5, nodes: [], cur: 0, tgt: 0, raf: 0 };
  function wx(y) { return T.x0 + T.A * (0.55 + 0.45 * Math.sin(y / 900)) * Math.sin(y / 34); }
  function buildThread() {
    var H = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), W = document.documentElement.clientWidth;
    T.H = H; T.W = W;
    var w = $('.wrap'), left = w ? w.getBoundingClientRect().left : 28;
    T.x0 = clamp(left * 0.45, 10, 70); T.A = W >= 900 ? 8 : 4;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H); svg.style.height = H + 'px';
    var d = 'M' + wx(0).toFixed(1) + ' 0';
    for (var y = 16; y <= H; y += 16) d += 'L' + wx(y).toFixed(1) + ' ' + y;
    tp.setAttribute('d', d); tg.setAttribute('d', d);
    tn.innerHTML = '';
    T.nodes = $$('[data-node]').map(function (el) {
      var r = el.getBoundingClientRect(), y = el.tagName === 'SECTION' ? 70 + window.scrollY + r.top : window.scrollY + r.top + Math.min(14, r.height / 2);
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', wx(y).toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', 5.5); tn.appendChild(c);
      return { y: y, c: c };
    });
    updateThread(true);
  }
  function threadTarget() { return clamp((window.scrollY + window.innerHeight * 0.55) / T.H, 0, 1); }
  function updateThread(instant) {
    T.tgt = REDUCED ? 1 : threadTarget();
    if (instant) T.cur = T.tgt;
    if (!T.raf) T.raf = requestAnimationFrame(stepThread);
  }
  function stepThread() {
    T.raf = 0;
    T.cur = lerp(T.cur, T.tgt, 0.14);
    if (Math.abs(T.cur - T.tgt) < 0.0003) T.cur = T.tgt; else T.raf = requestAnimationFrame(stepThread);
    tp.style.strokeDashoffset = (1 - T.cur).toFixed(4);
    var hy = T.cur * T.H;
    th.setAttribute('cx', wx(hy).toFixed(1)); th.setAttribute('cy', hy.toFixed(1)); th.style.opacity = REDUCED ? 0 : 1;
    T.nodes.forEach(function (n) { n.c.classList.toggle('on', hy >= n.y); });
  }
  var rbT;
  function rebuild() { clearTimeout(rbT); rbT = setTimeout(buildThread, 120); }
  window.addEventListener('resize', rebuild);
  window.addEventListener('load', buildThread);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(document.body);
  buildThread();

  /* ---------- свет: пятно за курсором / за активным блоком; параллакс героя ---------- */
  var spot = $('#spot'), art = $('#art');
  var P = { x: innerWidth * .65, y: innerHeight * .4, tx: innerWidth * .65, ty: innerHeight * .4, mx: 0, my: 0, tmx: 0, tmy: 0 };
  if (FINE) {
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      P.tx = e.clientX; P.ty = e.clientY;
      P.tmx = (e.clientX / innerWidth - .5); P.tmy = (e.clientY / innerHeight - .5);
    }, { passive: true });
  } else if (io) {
    var spots = $$('[data-spot]'), sx = [0.3, 0.72, 0.3, 0.72];
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var i = spots.indexOf(e.target); P.tx = innerWidth * sx[i % sx.length]; P.ty = innerHeight * .5; } });
    }, { threshold: 0.35 });
    spots.forEach(function (s) { so.observe(s); });
  }
  var lastSY = -1;
  function frame() {
    if (!REDUCED) {
      P.x = lerp(P.x, P.tx, .06); P.y = lerp(P.y, P.ty, .06);
      if (spot) spot.style.transform = 'translate3d(' + P.x.toFixed(1) + 'px,' + P.y.toFixed(1) + 'px,0)';
      P.mx = lerp(P.mx, P.tmx, .06); P.my = lerp(P.my, P.tmy, .06);
      var sy = window.scrollY;
      if (art && sy < innerHeight * 1.2) {
        if (FINE) art.style.transform = 'translate3d(' + (P.mx * -26).toFixed(1) + 'px,' + (P.my * -18).toFixed(1) + 'px,0)';
        else if (sy !== lastSY) art.style.transform = 'translate3d(0,' + (sy * 0.14).toFixed(1) + 'px,0)';
      }
      lastSY = sy;
    }
    requestAnimationFrame(frame);
  }
  if (!REDUCED) requestAnimationFrame(frame);

  /* ---------- SMAS: контур лица поднимается по скроллу ---------- */
  var smas = $('#smas'), fCur = $('#f-cur'), fOld = $('#f-old'), fLift = $('#f-lift'), fCap = $('#f-cap'), fProg = $('#f-prog');
  function faceD(t) {
    var cheek = lerp(262, 238, t), jx = lerp(262, 284, t), jy = lerp(356, 322, t), cy = lerp(418, 396, t);
    var jx2 = 400 - jx;
    return 'M302 176C300 ' + cheek + ' ' + (jx + 14) + ' ' + (jy - 30) + ' ' + jx + ' ' + jy +
      'C' + (jx - 26) + ' ' + (jy + 40) + ' 236 ' + cy + ' 200 ' + cy +
      'C164 ' + cy + ' ' + (jx2 + 26) + ' ' + (jy + 40) + ' ' + jx2 + ' ' + jy +
      'C' + (jx2 - 14) + ' ' + (jy - 30) + ' 100 ' + cheek + ' 98 176';
  }
  var F = { cur: 0, tgt: 0, raf: 0 };
  if (fOld) fOld.setAttribute('d', faceD(0));
  function smasTarget() {
    var r = smas.getBoundingClientRect(), total = r.height - innerHeight;
    var p = clamp(-r.top / Math.max(total, 1), 0, 1);
    return { p: p, t: clamp((p - 0.1) / 0.7, 0, 1) };
  }
  function stepFace() {
    F.raf = 0;
    var s = smasTarget(); F.tgt = s.t;
    F.cur = lerp(F.cur, F.tgt, REDUCED ? 1 : .12);
    if (Math.abs(F.cur - F.tgt) < .0005) F.cur = F.tgt; else F.raf = requestAnimationFrame(stepFace);
    var e = F.cur * F.cur * (3 - 2 * F.cur);
    fCur.setAttribute('d', faceD(e));
    fLift.style.opacity = String(Math.sin(Math.PI * e).toFixed(2));
    fLift.style.transform = 'translateY(' + (-e * 20).toFixed(1) + 'px)';
    fProg.style.transform = 'scaleX(' + s.p.toFixed(3) + ')';
    fCap.textContent = e < .12 ? 'Схема: контур овала лица' : e < .88 ? 'Контур подтягивается…' : 'Схема: линия овала чётче. Иллюстрация, а не результат процедуры.';
  }
  function kickFace() { if (smas && !F.raf) F.raf = requestAnimationFrame(stepFace); }
  window.addEventListener('scroll', function () { updateThread(false); kickFace(); }, { passive: true });
  window.addEventListener('resize', kickFace);
  if (fCur) stepFace();
})();
