/* Кабинет эстетической косметологии — поведение страницы. Без внешних скриптов, без cookie и localStorage. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var TG = 'https://t.me/+79069767564';
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var vh = function () { return window.innerHeight || root.clientHeight; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  /* ---- разбивка заголовков на слова ---- */
  $$('[data-split]').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/( +)/).forEach(function (part) {
            if (!part) return;
            if (/^ +$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            var s = d.createElement('span');
            s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = part;
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
  });

  /* ---- появление блоков ---- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }) : null;
  $$('.rv,[data-split],.layer').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });
  // заголовок первого экрана показываем сразу
  requestAnimationFrame(function () { $$('.hero [data-split], .hero .rv').forEach(function (el) { el.classList.add('in'); }); });

  /* ---- шапка ---- */
  var head = $('.head');
  /* ---- меню ---- */
  var burger = $('.burger'), nav = $('#nav');
  function menu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) { var a = $('a', nav); a && a.focus(); } else if (d.activeElement && nav.contains(d.activeElement)) burger.focus();
  }
  burger.addEventListener('click', function () { menu(!root.classList.contains('menu-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) menu(false); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) menu(false); });
  // Tab не уходит за пределы открытого меню
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !root.classList.contains('menu-open')) return;
    var f = $$('a,button', nav).concat([burger]).filter(function (x) { return x.offsetParent !== null; });
    var first = burger, last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---- пузырьки сыворотки ---- */
  var bub = $('.bubbles');
  if (bub && !reduce) {
    var n = window.innerWidth < 700 ? 9 : 16;
    for (var b = 0; b < n; b++) {
      var i = d.createElement('i'), s = 6 + Math.random() * 16;
      i.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;width:' + s + 'px;height:' + s + 'px;animation-duration:' + (16 + Math.random() * 18).toFixed(1) + 's;animation-delay:' + (-Math.random() * 24).toFixed(1) + 's;--dx:' + ((Math.random() - .5) * 90).toFixed(0) + 'px';
      bub.appendChild(i);
    }
  }

  /* ---- свет по курсору (компьютер) / по касанию и скроллу (телефон) ---- */
  var hero = $('.hero'), glowT;
  function setGlow(x, y) { hero.style.setProperty('--gx', x + '%'); hero.style.setProperty('--gy', y + '%'); }
  if (hero && !reduce) {
    if (fine) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        setGlow((px * 100).toFixed(1), (py * 100).toFixed(1));
        hero.style.setProperty('--mx', (px - .5).toFixed(3)); hero.style.setProperty('--my', (py - .5).toFixed(3));
        hero.style.setProperty('--go', '.9');
      });
      hero.addEventListener('mouseleave', function () { hero.style.setProperty('--go', '.55'); hero.style.setProperty('--mx', 0); hero.style.setProperty('--my', 0); });
    } else {
      hero.addEventListener('pointerdown', function (e) {
        var r = hero.getBoundingClientRect();
        setGlow(((e.clientX - r.left) / r.width * 100).toFixed(1), ((e.clientY - r.top) / r.height * 100).toFixed(1));
        hero.style.setProperty('--go', '.95'); clearTimeout(glowT);
        glowT = setTimeout(function () { hero.style.setProperty('--go', '.55'); }, 900);
      }, { passive: true });
    }
  }

  /* ---- скролл: параллакс, шкала глубины, шапка ---- */
  var pars = $$('[data-par]'), layersEl = $('#layers'), layers = $$('.layer[id]'), gauge = $('.gauge');
  var gItems = $$('.gauge li'), gLabel = $('.gauge-label'), ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY || root.scrollTop, h = vh();
    head.classList.toggle('is-solid', y > 30);
    if (!reduce) {
      pars.forEach(function (el) {
        var r = el.parentNode.getBoundingClientRect();
        if (r.bottom < -200 || r.top > h + 200) return;
        var k = parseFloat(el.getAttribute('data-par')) || 0.06;
        el.style.transform = 'translate3d(0,' + (((r.top + r.height / 2) - h / 2) * -k).toFixed(1) + 'px,0)';
      });
      if (!fine && hero) { setGlow(60, clamp(30 + y / h * 40, 20, 80).toFixed(1)); }
    }
    if (layersEl && gauge) {
      var lr = layersEl.getBoundingClientRect();
      gauge.classList.toggle('show', lr.top < h * 0.55 && lr.bottom > h * 0.45);
      var p = clamp((h * 0.5 - lr.top) / lr.height, 0, 1);
      gauge.style.setProperty('--p', p.toFixed(4));
      var act = 0;
      layers.forEach(function (l, idx) { if (l.getBoundingClientRect().top < h * 0.5) act = idx; });
      gItems.forEach(function (li, idx) { li.classList.toggle('act', idx === act); });
      if (gLabel) gLabel.textContent = '0' + (act + 1) + ' · ' + (layers[act].getAttribute('data-name') || '');
    }
  }
  function req() { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  onScroll();

  /* ---- строки прайса на телефоне: подсветка строки в центре экрана ---- */
  if (!fine && 'IntersectionObserver' in window && !reduce) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('focus', e.isIntersecting); });
    }, { rootMargin: '-42% 0px -42% 0px' });
    $$('.row').forEach(function (r) { io2.observe(r); });
  }

  /* ---- калькулятор ---- */
  var rows = $$('.row'), chosen = {}, order = [];
  var itemsEl = $('#calc-items'), emptyEl = $('#calc-empty'), sumEl = $('#calc-sum'), hintEl = $('#calc-hint');
  var countEls = $$('[data-count]'), shown = 0, anim;
  function data(r) { return { id: r.getAttribute('data-id'), name: r.getAttribute('data-name'), price: +r.getAttribute('data-price'), from: r.getAttribute('data-from') === '1' }; }
  function tally() {
    var sum = 0, from = false;
    order.forEach(function (id) { sum += chosen[id].price; if (chosen[id].from) from = true; });
    return { sum: sum, from: from, n: order.length };
  }
  function setSum(to, from) {
    cancelAnimationFrame(anim);
    var start = shown, t0 = null, dur = reduce ? 0 : 520;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = dur ? clamp((t - t0) / dur, 0, 1) : 1, e = 1 - Math.pow(1 - k, 3);
      shown = start + (to - start) * e;
      sumEl.innerHTML = (from ? '<span class="from">от</span>' : '') + money(shown) + ' ₽';
      if (k < 1) anim = requestAnimationFrame(step);
    }
    anim = requestAnimationFrame(step);
  }
  function render(bumpEl) {
    var t = tally();
    itemsEl.innerHTML = '';
    order.forEach(function (id) {
      var c = chosen[id], li = d.createElement('li');
      li.innerHTML = '<span class="n"></span><span class="p"></span><button type="button" aria-label="Убрать из программы"><span aria-hidden="true">×</span></button>';
      li.querySelector('.n').textContent = c.name;
      li.querySelector('.p').textContent = (c.from ? 'от ' : '') + money(c.price) + ' ₽';
      li.querySelector('button').setAttribute('aria-label', 'Убрать из программы: ' + c.name);
      li.querySelector('button').addEventListener('click', function () { toggle(id); });
      itemsEl.appendChild(li);
    });
    emptyEl.hidden = t.n > 0;
    $('#calc-list-title').hidden = t.n === 0;
    setSum(t.sum, t.from && t.sum > 0);
    hintEl.textContent = t.n === 0 ? 'Отметьте процедуры в прайсе выше — сумма посчитается сама.' :
      (t.from ? 'Где указано «от», итог зависит от зоны и состава — точную сумму назовут до процедуры.' : 'Ориентировочная сумма по прайсу. Итог подтверждается на консультации.');
    countEls.forEach(function (el) { el.textContent = t.n; });
    if (bumpEl) { bumpEl.classList.remove('bump'); void bumpEl.offsetWidth; bumpEl.classList.add('bump'); }
  }
  function toggle(id) {
    var r = rows.filter(function (x) { return x.getAttribute('data-id') === id; })[0];
    if (!r) return;
    var on = !chosen[id];
    if (on) { chosen[id] = data(r); order.push(id); } else { delete chosen[id]; order.splice(order.indexOf(id), 1); }
    r.classList.toggle('on', on);
    r.querySelector('.row-btn').setAttribute('aria-pressed', on ? 'true' : 'false');
    render(sumEl);
  }
  rows.forEach(function (r) { r.querySelector('.row-btn').addEventListener('click', function () { toggle(r.getAttribute('data-id')); }); });
  render();

  function programText() {
    var t = tally();
    if (!t.n) return '';
    var s = order.map(function (id) { var c = chosen[id]; return '• ' + c.name + ' — ' + (c.from ? 'от ' : '') + money(c.price) + ' ₽'; }).join('\n');
    return s + '\nИтого по прайсу: ' + (t.from ? 'от ' : '') + money(t.sum) + ' ₽';
  }

  /* ---- отправка в Telegram: текст копируется и открывается чат (данные никуда сами не уходят) ---- */
  var toast = $('#toast'), toastT;
  function say(msg) { toast.textContent = msg; toast.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('on'); }, 4200); }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return new Promise(function (res) {
      var ta = d.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
      d.body.appendChild(ta); ta.select(); var ok = false; try { ok = d.execCommand('copy'); } catch (e) {} d.body.removeChild(ta); res(ok);
    });
  }
  function sendTg(text) {
    var w = window.open(TG, '_blank', 'noopener');
    copy(text).then(function (ok) {
      say(ok ? 'Текст скопирован — вставьте его в чат с Ириной' : 'Откройте чат и напишите Ирине вручную');
      if (!w) window.location.href = TG;
    });
  }
  var sendBtn = $('#calc-send');
  sendBtn.addEventListener('click', function () {
    var p = programText();
    sendTg('Здравствуйте! Хочу записаться в кабинет косметолога (Тюмень, Гондатти, 2).' + (p ? '\nМоя программа:\n' + p : '') + '\nПодскажите, пожалуйста, свободное время.');
  });
  var clr = $('#calc-clear');
  clr.addEventListener('click', function () { order.slice().forEach(toggle); });

  /* ---- форма записи ---- */
  var form = $('#form'), err = $('#form-err');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim(), phone = form.elements.phone.value.trim(), digits = phone.replace(/\D/g, '');
    err.textContent = '';
    if (name.length < 2) { err.textContent = 'Укажите имя.'; form.elements.name.focus(); return; }
    if (digits.length < 10 || digits.length > 12) { err.textContent = 'Проверьте номер телефона.'; form.elements.phone.focus(); return; }
    if (!form.elements.adult.checked) { err.textContent = 'Запись доступна с 18 лет — отметьте подтверждение.'; form.elements.adult.focus(); return; }
    if (!form.elements.consent.checked) { err.textContent = 'Нужно согласие на обработку персональных данных.'; form.elements.consent.focus(); return; }
    var p = programText(), cm = form.elements.comment.value.trim();
    sendTg('Здравствуйте! Меня зовут ' + name + ', телефон ' + phone + '.\nХочу записаться на приём.' + (p ? '\nПрограмма:\n' + p : '') + (cm ? '\nКомментарий: ' + cm : ''));
    form.reset();
  });
})();
