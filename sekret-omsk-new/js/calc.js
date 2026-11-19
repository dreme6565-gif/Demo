/* Калькулятор «Секрет». Одно состояние: список, карта зон, итог и комплексы читают одни данные. */
(function () {
  'use strict';
  var D = window.SEKRET_DATA, C = window.SEKRET || {};
  var doc = document;
  if (!D || !doc.getElementById('calcRows')) return;
  var NB = ' ';
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
  function priceText(it) { return it.from ? 'от' + NB + money(it.min) + NB + '₽' : it.max ? money(it.min) + '–' + money(it.max) + NB + '₽' : money(it.min) + NB + '₽'; }
  function plural(n) { var m = n % 10, h = n % 100; return (m === 1 && h !== 11) ? 'посещение' : (m >= 2 && m <= 4 && (h < 12 || h > 14)) ? 'посещения' : 'посещений'; }
  function plain(s) { return s.replace(/ /g, ' '); }

  var ALL = {};
  D.zones.forEach(function (i) { ALL[i.id] = i; });
  D.complexes.forEach(function (i) { i.complex = true; ALL[i.id] = i; });
  D.face.concat(D.body).forEach(function (i) { ALL[i.id] = i; });

  var sel = {}, visits = 1, tab = 'zones', showAll = false, query = '', MORE_N = 10;
  var panelRows = [], asideRows = [];
  var els = {
    rows: $('#calcRows'), more: $('#calcMore'), search: $('#calcSearch'), aside: $('#cplxRows'),
    empty: $('#stEmpty'), stSel: $('#stSel'), selRows: $('#selRows'), tot: $('#totOne'), course: $('#course'), hints: $('#hints'),
    wa: $('#waBtn'), state: $('#calcState'), bar: $('#calcBar'), barSum: $('#barSum'), barLbl: $('#barLbl'),
    cap: $('#mapCap'), visitIn: $('#visitIn')
  };

  function subset(a, b) { return a.every(function (x) { return b.indexOf(x) > -1; }); }
  function inter(a, b) { return a.some(function (x) { return b.indexOf(x) > -1; }); }

  /* что именно входит в расчёт: вложенные зоны не суммируются дважды */
  function analyze() {
    var ids = Object.keys(sel), laser = ids.filter(function (id) { return ALL[id].atoms; }), kept = [], absorbed = {};
    laser.forEach(function (id) {
      var a = ALL[id], sup = null;
      laser.forEach(function (o) {
        if (o === id) return; var b = ALL[o];
        if (b.atoms.length > a.atoms.length && subset(a.atoms, b.atoms) && (!sup || b.atoms.length < ALL[sup].atoms.length)) sup = o;
      });
      if (sup) absorbed[id] = sup; else kept.push(id);
    });
    return { ids: ids, kept: kept, absorbed: absorbed, others: ids.filter(function (id) { return !ALL[id].atoms; }) };
  }
  function conflictOf(id, a) {
    var X = ALL[id]; if (!X.atoms || sel[id]) return null;
    for (var i = 0; i < a.kept.length; i++) { var K = ALL[a.kept[i]]; if (inter(X.atoms, K.atoms) && !subset(X.atoms, K.atoms) && !subset(K.atoms, X.atoms)) return K; }
    return null;
  }
  function includedIn(id, a) {
    var X = ALL[id]; if (!X.atoms || sel[id]) return null;
    for (var i = 0; i < a.kept.length; i++) { var K = ALL[a.kept[i]]; if (K.atoms.length > X.atoms.length && subset(X.atoms, K.atoms)) return K; }
    return null;
  }
  function totals(a) {
    var t = { min: 0, max: 0, open: false, ranged: false };
    a.kept.concat(a.others).forEach(function (id) { var it = ALL[id]; t.min += it.min; t.max += (it.max || it.min); if (it.from) t.open = true; if (it.max) t.ranged = true; });
    return t;
  }
  function fmt(t, m) {
    m = m || 1; var mn = t.min * m, mx = t.max * m;
    if (t.open) return 'от' + NB + money(mn) + NB + '₽';
    if (t.ranged && mx !== mn) return money(mn) + '–' + money(mx) + NB + '₽';
    return money(mn) + NB + '₽';
  }
  /* «Выгоднее комплексом» — только при реальной экономии и только как подсказка */
  function hints(a) {
    var res = [], cands = D.complexes.concat(D.zones.filter(function (z) { return z.atoms.length > 1; }));
    cands.forEach(function (c) {
      if (sel[c.id]) return;
      var Z = a.kept.filter(function (id) { return subset(ALL[id].atoms, c.atoms); });
      if (!Z.length) return;
      var u = []; Z.forEach(function (id) { ALL[id].atoms.forEach(function (x) { if (u.indexOf(x) < 0) u.push(x); }); });
      if (u.length !== c.atoms.length) return;
      if (a.kept.some(function (id) { return Z.indexOf(id) < 0 && inter(ALL[id].atoms, c.atoms); })) return;
      var sum = Z.reduce(function (s, id) { return s + ALL[id].min; }, 0), save = sum - c.min;
      if (save > 0) res.push({ c: c, save: save });
    });
    res.sort(function (x, y) { return y.save - x.save; });
    return res.slice(0, 2);
  }

  /* строки списка */
  function mkRow(it, bag) {
    var li = doc.createElement('li'), lab = doc.createElement('label'); lab.className = 'row';
    var inp = doc.createElement('input'); inp.type = 'checkbox'; inp.value = it.id;
    var box = doc.createElement('span'); box.className = 'box'; box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.500"/></svg>';
    var nm = doc.createElement('span'); nm.className = 'nm'; nm.textContent = it.name; var sm = doc.createElement('small'); nm.appendChild(sm);
    var pr = doc.createElement('span'); pr.className = 'pr'; pr.textContent = priceText(it);
    lab.appendChild(inp); lab.appendChild(box); lab.appendChild(nm); lab.appendChild(pr); li.appendChild(lab);
    inp.addEventListener('change', function () { toggle(it.id, inp.checked); });
    bag.push({ id: it.id, lab: lab, inp: inp, sm: sm });
    return li;
  }
  function norm(s) { return s.toLowerCase().replace(/ё/g, 'е'); }
  function renderPanel() {
    panelRows = []; els.rows.innerHTML = '';
    var items = tab === 'zones' ? D.zones : tab === 'complex' ? D.complexes : D.face, extra = tab === 'face' ? D.body : [];
    var q = norm(query.trim());
    var f = function (arr) { return q ? arr.filter(function (i) { return norm(i.name).indexOf(q) > -1; }) : arr; };
    var list = f(items), ex = f(extra), limited = tab === 'zones' && !q && !showAll && list.length > MORE_N;
    (limited ? list.slice(0, MORE_N) : list).forEach(function (i) { els.rows.appendChild(mkRow(i, panelRows)); });
    if (ex.length) {
      var h = doc.createElement('li'); h.className = 'cap'; h.style.margin = '16px 0 4px'; h.textContent = 'Тело'; els.rows.appendChild(h);
      ex.forEach(function (i) { els.rows.appendChild(mkRow(i, panelRows)); });
    }
    if (!list.length && !ex.length) { var n = doc.createElement('li'); n.className = 'note'; n.style.padding = '14px 4px'; n.textContent = 'Ничего не найдено. Попробуйте другое слово или напишите нам.'; els.rows.appendChild(n); }
    var canMore = tab === 'zones' && !q && D.zones.length > MORE_N;
    els.more.hidden = !canMore;
    els.more.firstChild.textContent = showAll ? 'Свернуть список ' : 'Показать все зоны (' + D.zones.length + ') ';
    els.more.setAttribute('aria-expanded', showAll);
    $('#calcPanel').setAttribute('aria-labelledby', 'tab-' + tab);
    refresh();
  }
  function renderAside() { asideRows = []; D.complexes.forEach(function (i) { els.aside.appendChild(mkRow(i, asideRows)); }); }

  function paintRow(r, a) {
    var id = r.id, s = !!sel[id], abs = a.absorbed[id], conf = conflictOf(id, a), inc = includedIn(id, a), msg = '';
    if (abs) msg = 'входит в «' + ALL[abs].name + '», не суммируется';
    else if (conf) msg = 'нельзя вместе с «' + conf.name + '»';
    else if (inc) msg = 'уже входит в «' + inc.name + '»';
    r.inp.checked = s; r.inp.disabled = !!conf; r.sm.textContent = msg; r.sm.hidden = !msg;
    r.lab.classList.toggle('is-abs', !!abs); r.lab.classList.toggle('is-dis', !!conf);
  }

  function refresh() {
    var a = analyze(), t = totals(a), count = a.kept.length + a.others.length;
    panelRows.concat(asideRows).forEach(function (r) { paintRow(r, a); });

    /* карта зон: подсвечиваем атомы всех выбранных зон */
    var on = {}; a.ids.forEach(function (id) { if (ALL[id].atoms) ALL[id].atoms.forEach(function (x) { on[x] = 1; }); });
    $$('.zone').forEach(function (z) {
      z.classList.toggle('is-on', !!on[z.getAttribute('data-atom')]);
      z.classList.toggle('is-dis', !!conflictOf(z.getAttribute('data-item'), a));
    });

    /* выбранное */
    els.empty.hidden = count > 0; els.stSel.hidden = a.ids.length === 0;
    els.selRows.innerHTML = '';
    a.kept.concat(a.others).forEach(function (id) { els.selRows.appendChild(selLi(id, priceText(ALL[id]))); });
    Object.keys(a.absorbed).forEach(function (id) { els.selRows.appendChild(selLi(id, '', 'входит в «' + ALL[a.absorbed[id]].name + '»')); });

    /* результат */
    var one = count ? fmt(t, 1) : '0' + NB + '₽';
    els.tot.textContent = one;
    if (count && visits > 1) {
      els.course.hidden = false;
      els.course.innerHTML = 'На ' + visits + ' ' + plural(visits) + ': <b>' + fmt(t, visits) + '</b> (без дополнительных скидок)';
    } else els.course.hidden = true;
    var approx = count && (t.open || t.ranged);
    $('#calcNote').textContent = (approx ? 'В расчёте есть цены «от» или диапазоны: итог уточняется. ' : '') + 'Итоговый курс определяет мастер после диагностики. Расчёт предварительный и не является публичной офертой.';

    /* подсказки о выгоде */
    els.hints.innerHTML = '';
    hints(a).forEach(function (h) {
      var d = doc.createElement('div'); d.className = 'hint';
      d.innerHTML = '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-pct"/></svg><div><span></span><br><button type="button"></button></div>';
      $('span', d).textContent = (h.c.complex ? 'Выгоднее комплексом «' : 'Выгоднее одной зоной «') + h.c.name + '»: на ' + money(h.save) + NB + '₽ меньше.';
      var b = $('button', d); b.textContent = 'Выбрать'; b.addEventListener('click', function () { toggle(h.c.id, true); });
      els.hints.appendChild(d);
    });

    /* кнопка WhatsApp */
    var names = a.kept.concat(a.others).map(function (id) { return ALL[id].name; });
    var ok = count > 0;
    els.wa.setAttribute('aria-disabled', ok ? 'false' : 'true'); els.wa.tabIndex = ok ? 0 : -1;
    if (ok) {
      var cost = visits > 1 ? fmt(t, visits) + ' (' + fmt(t, 1) + ' за посещение)' : fmt(t, 1);
      var msg = 'Здравствуйте! Хочу уточнить запись в студию Секрет. Выбрано: ' + names.join(', ') + '. Количество посещений для расчёта: ' + visits +
        '. Ориентировочная стоимость: ' + cost + '. Подскажите свободное время';
      els.wa.href = 'https://wa.me/' + (C.wa || '79136337133') + '?text=' + encodeURIComponent(plain(msg));
    } else els.wa.href = 'https://wa.me/' + (C.wa || '79136337133');

    /* липкая строка на телефоне */
    els.barSum.textContent = count ? fmt(t, 1) : '0' + NB + '₽';
    els.barLbl.textContent = count ? 'Выбрано: ' + count + ' · за 1 посещение' : 'Выберите зоны и процедуры';
  }
  function selLi(id, price, note) {
    var li = doc.createElement('li'), s1 = doc.createElement('span'), nm = doc.createElement('span');
    nm.textContent = ALL[id].name; s1.appendChild(nm);
    if (note) { var em = doc.createElement('em'); em.textContent = note; s1.appendChild(em); }
    var p = doc.createElement('span'); p.textContent = price; p.style.fontWeight = '600'; p.style.whiteSpace = 'nowrap';
    var b = doc.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Убрать: ' + ALL[id].name);
    b.innerHTML = '<svg class="ico" aria-hidden="true" focusable="false"><use href="#i-close"/></svg>';
    b.addEventListener('click', function () { toggle(id, false); });
    li.appendChild(s1); li.appendChild(p); li.appendChild(b); return li;
  }

  function toggle(id, on) {
    if (on) { var c = conflictOf(id, analyze()); if (c) { say('«' + ALL[id].name + '» нельзя выбрать вместе с «' + c.name + '». Выберите что-то одно.'); refresh(); return; } sel[id] = true; }
    else delete sel[id];
    refresh();
  }
  function say(t) { els.cap.textContent = t; }

  /* карта зон */
  $$('.zone').forEach(function (z) {
    var info = function () {
      var id = z.getAttribute('data-item'), it = ALL[id], a = analyze(), abs = a.absorbed[id], conf = conflictOf(id, a);
      els.cap.innerHTML = '<b></b>';
      $('b', els.cap).textContent = it.name + ' — ' + priceText(it);
      if (abs) els.cap.appendChild(doc.createTextNode(' · входит в «' + ALL[abs].name + '»'));
      else if (conf) els.cap.appendChild(doc.createTextNode(' · нельзя вместе с «' + conf.name + '»'));
    };
    z.addEventListener('click', function () { var id = z.getAttribute('data-item'); toggle(id, !sel[id]); info(); });
    z.addEventListener('mouseenter', function () { if (matchMedia('(hover: hover)').matches) { z.classList.add('is-hov'); info(); } });
    z.addEventListener('mouseleave', function () { z.classList.remove('is-hov'); });
  });
  $$('.map .seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-view');
      $$('.map .seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      $$('.map svg.view').forEach(function (s) { s.classList.toggle('is-cur', s.getAttribute('data-view') === v); });
    });
  });
  var mt = $('#mapToggle'), mb = $('#mapBody');
  if (mt) mt.addEventListener('click', function () { var o = !mb.classList.contains('is-open'); mb.classList.toggle('is-open', o); mt.setAttribute('aria-expanded', o); });

  /* вкладки, поиск, «показать все» */
  var tabs = $$('.tabs [role="tab"]');
  function setTab(t) {
    tab = t; query = ''; els.search.value = ''; showAll = false;
    tabs.forEach(function (b) { var on = b.getAttribute('data-tab') === t; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    renderPanel();
  }
  tabs.forEach(function (b) {
    b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
    b.addEventListener('keydown', function (e) {
      var vis = tabs.filter(function (x) { return x.offsetParent !== null; }), i = vis.indexOf(b);
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : -1; if (j < 0) return;
      e.preventDefault(); var n = vis[(j + vis.length) % vis.length]; n.focus(); setTab(n.getAttribute('data-tab'));
    });
  });
  els.search.addEventListener('input', function () { query = els.search.value; renderPanel(); });
  els.more.addEventListener('click', function () { showAll = !showAll; renderPanel(); });
  matchMedia('(min-width: 1120px)').addEventListener('change', function (e) { if (e.matches && tab === 'complex') setTab('zones'); });

  /* число посещений: 1 / 4 / 6 или своё */
  function setVisits(n, fromInput) {
    visits = n;
    $$('#visitRow .chip').forEach(function (c) { c.setAttribute('aria-pressed', String(+c.getAttribute('data-v') === n && !fromInput)); });
    if (!fromInput) els.visitIn.value = '';
    refresh();
  }
  $$('#visitRow .chip').forEach(function (c) { c.addEventListener('click', function () { setVisits(+c.getAttribute('data-v')); }); });
  els.visitIn.addEventListener('input', function () {
    var n = parseInt(els.visitIn.value, 10); if (isNaN(n)) return;
    n = Math.max(1, Math.min(30, n)); setVisits(n, [1, 4, 6].indexOf(n) < 0);
  });
  els.wa.addEventListener('click', function (e) { if (els.wa.getAttribute('aria-disabled') === 'true') e.preventDefault(); });

  /* нижний лист с расчётом на телефоне */
  var bg = $('#sheetBg'), mq = matchMedia('(max-width: 1119px)'), releaseSheet = null, openBtn = $('#barOpen');
  function openSheet() {
    if (!mq.matches) return;
    els.state.classList.add('is-open'); bg.classList.add('is-open'); els.state.setAttribute('role', 'dialog'); els.state.setAttribute('aria-modal', 'true');
    document.body.style.overflow = 'hidden'; releaseSheet = window.SekretUI && window.SekretUI.trap(els.state); $('#sheetClose').focus();
  }
  function closeSheet() {
    if (!els.state.classList.contains('is-open')) return;
    els.state.classList.remove('is-open'); bg.classList.remove('is-open'); els.state.removeAttribute('role'); els.state.removeAttribute('aria-modal');
    document.body.style.overflow = ''; if (releaseSheet) releaseSheet(); openBtn.focus();
  }
  openBtn.addEventListener('click', openSheet); $('#sheetClose').addEventListener('click', closeSheet); bg.addEventListener('click', closeSheet);
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
  mq.addEventListener('change', function () { if (!mq.matches) { els.state.classList.remove('is-open'); bg.classList.remove('is-open'); document.body.style.overflow = ''; } });

  renderAside(); renderPanel();
}());
