(function () {
  'use strict';
  /* Настройки. Номер WhatsApp клиники не предоставлен: при null ссылка не создаётся, текст копируется. */
  var CONFIG = { whatsappNumber: null };

  var D = window.DENTIS_DATA, prices = D.prices, clinic = D.clinic;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phone = window.matchMedia('(max-width: 699px)');
  var nf = new Intl.NumberFormat('ru-RU');
  var rub = function (n) { return nf.format(n) + ' ₽'; };
  var byId = {}; prices.forEach(function (p) { byId[p.id] = p; });

  /* ---------- состояние плана ---------- */
  var plan = new Map();          // id -> количество, порядок добавления сохраняется
  var cats = []; prices.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });
  var tabOrder = ['Лечение', 'Гигиена', 'Удаление', 'Имплантация', 'Протезирование', 'Брекеты', 'Консультации'].filter(function (c) { return cats.indexOf(c) >= 0; });
  var current = tabOrder[0];

  function maxQty(p) { return p.unit === 'челюсть' ? 2 : 99; }
  function plural(n, a, b, c) { var m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14)) ? b : c; }
  function itemsOf(cat) {
    var list = prices.filter(function (p) { return p.category === cat; });
    if (cat === 'Лечение') list.sort(function (a, b) { return (a.name === 'Лечение кариеса' ? 0 : 1) - (b.name === 'Лечение кариеса' ? 0 : 1); });
    return list;
  }
  function total() { var s = 0; plan.forEach(function (q, id) { s += byId[id].price * q; }); return s; }
  function count() { return plan.size; }
  function msgName(p) {
    if (p.name === 'Анестезия импортная') return 'импортная анестезия';
    var n = p.name;
    return /^[А-ЯЁ][а-яё]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  }
  function message() {
    var parts = [];
    plan.forEach(function (q, id) { var p = byId[id]; parts.push(msgName(p) + ' × ' + q + ' — ' + rub(p.price * q)); });
    return 'Здравствуйте! Хочу записаться в Дентис. Предварительный план: ' + parts.join('; ') + '. Ориентировочная сумма: ' + rub(total()) + '. Подскажите доступное время и уточните план после осмотра.';
  }

  /* ---------- вкладки и список ---------- */
  var tabsEl = $('#tabs'), listEl = $('#list');
  function renderTabs() {
    tabsEl.innerHTML = '';
    tabOrder.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tab' + (i >= 3 ? ' tab--extra' : '');
      b.textContent = c; b.setAttribute('aria-pressed', String(c === current));
      b.addEventListener('click', function () { current = c; renderTabs(); renderList(); $('.tab[aria-pressed=true]', tabsEl).focus({ preventScroll: true }); });
      tabsEl.appendChild(b);
    });
    var more = document.createElement('button');
    more.type = 'button'; more.className = 'tab tab--more';
    var all = tabsEl.classList.contains('is-all');
    more.textContent = all ? 'Меньше −' : 'Ещё +'; more.setAttribute('aria-expanded', String(all));
    more.addEventListener('click', function () { tabsEl.classList.toggle('is-all'); renderTabs(); $('.tab--more', tabsEl).focus({ preventScroll: true }); });
    tabsEl.appendChild(more);
    if (!all && tabOrder.indexOf(current) >= 3) { tabsEl.classList.add('is-all'); }
    $('#implantWarn').hidden = current !== 'Имплантация';
  }
  function renderList() {
    listEl.innerHTML = '';
    itemsOf(current).forEach(function (p) {
      var li = document.createElement('li');
      var label = document.createElement('label'); label.className = 'row';
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = plan.has(p.id);
      var name = document.createElement('span'); name.className = 'row__name'; name.textContent = p.name;
      var price = document.createElement('span'); price.className = 'row__price'; price.textContent = rub(p.price) + (p.unit === 'челюсть' ? '' : '');
      cb.addEventListener('change', function () { if (cb.checked) plan.set(p.id, 1); else plan.delete(p.id); renderReceipt(true); });
      label.append(cb, name, price); li.appendChild(label); listEl.appendChild(li);
    });
    $('#implantWarn').hidden = current !== 'Имплантация';
  }

  /* ---------- чек ---------- */
  var linesEl = $('#lines'), totalEl = $('#total'), sendBtn = $('#send'), sendNote = $('#sendNote');
  var dock = $('#dock'), dockTotal = $('#dockTotal'), dockCount = $('#dockCount');
  var lastTotal = 0;
  function renderReceipt(userAction) {
    linesEl.innerHTML = '';
    if (!plan.size) {
      var e = document.createElement('li'); e.className = 'receipt__empty'; e.textContent = 'План пока пуст. Выберите процедуру.'; linesEl.appendChild(e);
    }
    plan.forEach(function (q, id) {
      var p = byId[id], li = document.createElement('li'); li.className = 'line';
      if (!userAction) li.style.animation = 'none';
      var nm = document.createElement('span'); nm.className = 'line__name'; nm.textContent = p.name + ' × ' + q;
      var sm = document.createElement('span'); sm.className = 'line__sum'; sm.textContent = rub(p.price * q);
      var ctl = document.createElement('div'); ctl.className = 'line__ctl';
      var minus = btn('−', 'Уменьшить количество: ' + p.name, function () { change(id, -1); }); minus.disabled = q <= 1;
      var val = document.createElement('span'); val.className = 'qval'; val.textContent = q;
      var plus = btn('+', 'Увеличить количество: ' + p.name, function () { change(id, 1); }); plus.disabled = q >= maxQty(p);
      ctl.append(minus, val, plus);
      if (p.unit === 'челюсть') { var u = document.createElement('span'); u.className = 'qunit'; u.textContent = plural(q, 'челюсть', 'челюсти', 'челюстей') + ', максимум 2'; ctl.appendChild(u); }
      var rm = btn('Убрать', 'Убрать из плана: ' + p.name, function () { plan.delete(id); renderList(); renderReceipt(true); }); rm.className = 'rm';
      ctl.appendChild(rm);
      li.append(nm, sm, ctl); linesEl.appendChild(li);
    });
    var t = total();
    totalEl.textContent = rub(t);
    if (userAction && t !== lastTotal && !reduce) { totalEl.classList.add('is-tick'); setTimeout(function () { totalEl.classList.remove('is-tick'); }, 150); }
    lastTotal = t;
    var empty = !plan.size;
    sendBtn.setAttribute('aria-disabled', String(empty));
    sendNote.textContent = empty ? 'Выберите процедуру, чтобы отправить план.' : 'В сообщении — процедуры и сумма.';
    dockTotal.textContent = rub(t);
    dockCount.textContent = count() + ' ' + plural(count(), 'процедура', 'процедуры', 'процедур') + ' · ориентировочно';
    updateDock();
  }
  function btn(txt, label, fn) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'qbtn'; b.textContent = txt; b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b;
  }
  function change(id, d) {
    var p = byId[id], q = Math.min(maxQty(p), Math.max(1, (plan.get(id) || 1) + d)); plan.set(id, q); renderReceipt(true);
  }

  /* ---------- отправка ---------- */
  var copybox = $('#copybox'), copyText = $('#copyText'), copyStatus = $('#copyStatus');
  function send() {
    if (!plan.size) return false;
    var text = message();
    if (CONFIG.whatsappNumber) { window.open('https://wa.me/' + CONFIG.whatsappNumber + '?text=' + encodeURIComponent(text), '_blank', 'noopener'); return true; }
    copyText.value = text; copyStatus.textContent = '';
    if (phoneSheetOpen) closeSheet(true);
    if (copybox.showModal) copybox.showModal(); else copybox.setAttribute('open', '');
    return true;
  }
  $('#copyBtn').addEventListener('click', function () {
    var done = function () { copyStatus.textContent = 'Текст скопирован.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(copyText.value).then(done, fallback); else fallback();
    function fallback() { copyText.select(); try { document.execCommand('copy'); done(); } catch (e) { copyStatus.textContent = 'Выделите текст и скопируйте вручную.'; } }
  });
  sendBtn.addEventListener('click', function () { if (sendBtn.getAttribute('aria-disabled') === 'true') { $('#list').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); return; } send(); });
  $$('[data-wa]').forEach(function (a) {
    a.addEventListener('click', function (e) { closeMenu(); if (plan.size) { e.preventDefault(); send(); } });
  });

  /* ---------- нижняя панель и лист чека (телефон) ---------- */
  var receipt = $('#receipt'), scrim = $('#scrim'), dockOpen = $('#dockOpen'), receiptClose = $('#receiptClose');
  var phoneSheetOpen = false, lastFocus = null;
  function updateDock() {
    var show = phone.matches && plan.size > 0 && !phoneSheetOpen;
    dock.hidden = !show; document.body.classList.toggle('has-dock', show);
  }
  function openSheet() {
    if (!phone.matches) return;
    phoneSheetOpen = true; lastFocus = dockOpen;
    receipt.classList.add('is-open'); receipt.setAttribute('role', 'dialog'); receipt.setAttribute('aria-modal', 'true'); receipt.setAttribute('aria-labelledby', 'receiptTitle');
    scrim.hidden = false; requestAnimationFrame(function () { scrim.classList.add('is-on'); });
    document.body.style.overflow = 'hidden'; updateDock();
    setTimeout(function () { receiptClose.focus(); }, 30);
  }
  function closeSheet(skipFocus) {
    if (!phoneSheetOpen) return;
    phoneSheetOpen = false;
    receipt.classList.remove('is-open'); receipt.removeAttribute('role'); receipt.removeAttribute('aria-modal'); receipt.removeAttribute('aria-labelledby');
    scrim.classList.remove('is-on'); setTimeout(function () { if (!phoneSheetOpen) scrim.hidden = true; }, 230);
    document.body.style.overflow = ''; updateDock();
    if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus(); else if (!skipFocus) dockOpen.focus();
  }
  dockOpen.addEventListener('click', openSheet);
  receiptClose.addEventListener('click', function () { closeSheet(); });
  scrim.addEventListener('click', function () { closeSheet(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (phoneSheetOpen) closeSheet(); else closeMenu(true); }
    if (e.key === 'Tab' && phoneSheetOpen) {
      var f = $$('button:not(:disabled), a[href]', receipt).filter(function (n) { return n.offsetParent !== null || n === document.activeElement; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  var onMq = function () { if (!phone.matches && phoneSheetOpen) closeSheet(true); updateDock(); };
  if (phone.addEventListener) phone.addEventListener('change', onMq); else phone.addListener(onMq);

  /* ---------- направления ---------- */
  var dirs = [
    { n: 'Лечение зубов', cat: 'Лечение', ref: 'Лечение кариеса' },
    { n: 'Чистка и отбеливание', cat: 'Гигиена', ref: 'Ультразвуковая чистка' },
    { n: 'Удаление зубов', cat: 'Удаление', ref: 'Удаление зуба простое' },
    { n: 'Имплантация', cat: 'Имплантация', ref: 'Имплантат Osstem Корея' },
    { n: 'Протезирование', cat: 'Протезирование', ref: 'Коронка металлокерамика' },
    { n: 'Брекеты', cat: 'Брекеты', ref: 'Лигатурные за челюсть', unit: ' / челюсть' }
  ];
  var dirEl = $('#dir');
  dirs.forEach(function (d, i) {
    var ref = prices.filter(function (p) { return p.name === d.ref; })[0];
    var li = document.createElement('li'), id = 'dir-' + i;
    li.innerHTML = '<button class="dir__btn" type="button" aria-expanded="false" aria-controls="' + id + '"><span class="dir__n">0' + (i + 1) + '</span><span class="dir__name"></span><span class="dir__price"></span>' +
      '<svg class="dir__arr" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 20 4M8 4h12v12"/></svg></button>' +
      '<div class="dir__more" id="' + id + '"><div><ul class="dir__rows"></ul><button class="dir__go" type="button">Выбрать в расчёте</button></div></div>';
    $('.dir__name', li).textContent = d.n;
    $('.dir__price', li).textContent = 'от ' + rub(ref.price) + (d.unit || '');
    var rows = $('.dir__rows', li);
    itemsOf(d.cat).forEach(function (p) { var r = document.createElement('li'); r.innerHTML = '<span></span><b></b>'; r.firstChild.textContent = p.name; r.lastChild.textContent = rub(p.price); rows.appendChild(r); });
    var b = $('.dir__btn', li);
    b.addEventListener('click', function () { var open = li.classList.toggle('is-open'); b.setAttribute('aria-expanded', String(open)); });
    $('.dir__go', li).addEventListener('click', function () {
      current = d.cat; renderTabs(); renderList();
      $('#plan').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
    dirEl.appendChild(li);
  });

  /* ---------- вопросы ---------- */
  var faqEl = $('#faq');
  clinic.faq.forEach(function (f, i) {
    var item = document.createElement('div'); item.className = 'faq__item' + (i === 0 ? ' is-open' : '');
    item.innerHTML = '<h3 class="h3" style="margin:0;font:inherit"><button class="faq__q" type="button" aria-expanded="' + (i === 0) + '" aria-controls="faq-a' + i + '" id="faq-q' + i + '"><span></span><i class="faq__ic" aria-hidden="true"></i></button></h3>' +
      '<div class="faq__a" id="faq-a' + i + '" role="region" aria-labelledby="faq-q' + i + '"><div><p></p></div></div>';
    $('.faq__q span', item).textContent = f.question; $('.faq__a p', item).textContent = f.answer;
    var q = $('.faq__q', item);
    q.addEventListener('click', function () { var o = item.classList.toggle('is-open'); q.setAttribute('aria-expanded', String(o)); });
    faqEl.appendChild(item);
  });

  /* ---------- меню ---------- */
  var burger = $('.burger'), menu = $('#menu');
  function closeMenu(focus) { if (menu.hidden) return; menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню'); if (focus) burger.focus(); }
  burger.addEventListener('click', function () {
    var open = menu.hidden; menu.hidden = !open; burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(); }); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1023) closeMenu(); });

  /* ---------- бегущая строка ---------- */
  var track = $('#strip'), strip = track.parentNode, pause = $('#stripPause');
  if (!reduce) {
    var list = $('.strip__list', track), clone = list.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true'); track.appendChild(clone);
    var setDur = function () { track.style.setProperty('--dur', Math.max(10, list.offsetWidth / 24) + 's'); };
    setDur(); window.addEventListener('resize', setDur);
    pause.addEventListener('click', function () { var p = strip.classList.toggle('is-paused'); pause.setAttribute('aria-pressed', String(p)); pause.textContent = p ? 'Пуск' : 'Пауза'; });
  }

  /* ---------- появление и параллакс ---------- */
  var targets = $$('[data-reveal], .open .h2');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }); }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  } else { targets.forEach(function (t) { t.classList.add('is-in'); }); }
  var fig = $('[data-parallax]'), img = fig && $('img', fig), ticking = false;
  function par() {
    ticking = false; var max = phone.matches ? 8 : 20, r = fig.getBoundingClientRect();
    var k = Math.max(-1, Math.min(1, ((r.top + r.height / 2) / window.innerHeight - .5) * 2));
    img.style.setProperty('--py', (-k * max).toFixed(1) + 'px');
  }
  if (img && !reduce) { window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par(); }

  /* ---------- старт ---------- */
  renderTabs(); renderList(); renderReceipt(false);
  window.__dentis = { plan: plan, total: total, message: message, config: CONFIG };
})();
