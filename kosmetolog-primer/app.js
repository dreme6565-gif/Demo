(() => {
'use strict';
const D = window.SITE_DATA;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rmq = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const setRM = () => root.classList.toggle('rm', rmq.matches);
setRM(); rmq.addEventListener?.('change', setRM);
const RM = () => rmq.matches;

/* ---------- helpers ---------- */
const NB = ' ';
const grp3 = (n, sp) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sp);
const rub = (n, from, plain) => (from ? 'от ' : '') + grp3(n, plain ? ' ' : NB) + (plain ? ' ' : NB) + '₽';
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const plSvc = n => (n % 10 === 1 && n % 100 !== 11) ? 'услуга' : ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) ? 'услуги' : 'услуг';
const plPos = n => (n % 10 === 1 && n % 100 !== 11) ? 'позиции' : 'позиций';
const ICON_PLUS = '<svg class="pl" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 1.5v11M1.5 7h11" stroke="currentColor" stroke-width="1.7" fill="none"/></svg><svg class="ck" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7.4l3.2 3.2L12 3.6" stroke="currentColor" stroke-width="2" fill="none"/></svg>';
const ICON_X = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
const ICON_CK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5l3.6 3.6L13.5 4.5" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';

/* ---------- data ---------- */
const ORDER = ['face-massage', 'care', 'cleaning', 'peeling', 'apparat', 'bio', 'body-massage', 'men'];
const META = {
  'face-massage': { name: 'Массаж лица', sum: 'от 2 000 ₽', sub: '9 техник' },
  'care': { name: 'Уход за лицом', sum: 'от 2 000 ₽', sub: 'программы ухода' },
  'cleaning': { name: 'Чистка лица', sum: 'от 2 000 ₽', sub: '3 метода + уход после' },
  'peeling': { name: 'Пилинги', sum: 'от 800 ₽', sub: 'классические и Levissime' },
  'apparat': { name: 'Аппаратные процедуры', sum: 'от 800 ₽', sub: 'лицо и тело' },
  'bio': { name: 'Биоревитализация', sum: 'от 8 000 ₽', sub: 'инъекционные процедуры' },
  'body-massage': { name: 'Массаж тела', sum: 'от 800 ₽', sub: '9 техник' },
  'men': { name: 'Для мужчин', sum: 'от 800 ₽', sub: 'уход и массаж' }
};
const FILTERS = {
  all: ORDER,
  face: ['face-massage', 'care', 'cleaning', 'peeling', 'apparat', 'bio'],
  body: ['apparat', 'body-massage']
};
const cats = ORDER.map(id => D.categories.find(c => c.id === id));
const BUCCAL = { id: 'face-massage-buccal', name: 'Буккальный массаж' };
const MILIA = { id: 'cleaning-milia', name: 'Удаление милиумов' };
const phoneOk = /^\d{10,15}$/.test(D.contact.wa || '');

const byId = {};
const nameCount = {};
cats.forEach(c => c.groups.forEach(g => g.items.forEach(it => { nameCount[it.name] = (nameCount[it.name] || 0) + 1; })));
const VAGUE = new Set(['Тело', 'Лицо', 'Лицо + шея', 'Пилинг', 'Массаж лица', 'Аппаратные процедуры', 'Общий']);
cats.forEach(c => c.groups.forEach(g => g.items.forEach(it => {
  const pre = [META[c.id].name, g.heading && g.heading !== META[c.id].name ? g.heading : null].filter(Boolean).join(' · ');
  const needs = nameCount[it.name] > 1 || VAGUE.has(it.name);
  byId[it.id] = { it, cat: c, grp: g, label: needs ? pre + ': ' + it.name : it.name, catName: META[c.id].name };
})));

/* ---------- state ---------- */
const LS = 'kosm-sel-v1';
let sel = [];          // [{id, variant:'plain'|'mask', qty}]
let variantPref = {};  // выбор «с маской» до добавления
let miliaQty = 1;
let lastAdded = null;
let lastRemovedIdx = -1;

const clampQty = n => Math.max(1, Math.min(99, Math.round(Number(n)) || 1));
const idxOf = id => sel.findIndex(e => e.id === id);

function save() { try { localStorage.setItem(LS, JSON.stringify(sel)); } catch (e) {} }
function load() {
  let dropped = 0;
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '[]');
    if (Array.isArray(raw)) raw.forEach(e => {
      const ok = e && (byId[e.id] || e.id === BUCCAL.id || e.id === MILIA.id) && idxOf(e.id) < 0;
      if (!ok) { dropped++; return; }
      const v = e.variant === 'mask' && byId[e.id] && byId[e.id].it.withMaskPriceRub ? 'mask' : 'plain';
      sel.push({ id: e.id, variant: v, qty: e.id === MILIA.id ? clampQty(e.qty) : 1 });
    });
  } catch (e) {}
  const m = sel.find(e => e.id === MILIA.id); if (m) miliaQty = m.qty;
  return dropped;
}

/* ---------- calculation ---------- */
function miliaRate(q) {
  if (q === 1) return 70;
  if (q >= 2 && q <= 5) return 60;
  if (q >= 6 && q <= 9) return 40;
  if (q >= 11 && q <= 20) return 30;
  return null; // 10 — пересечение диапазонов; >20 — уточнить
}
function nameOf(id) {
  if (id === BUCCAL.id) return BUCCAL.name;
  if (id === MILIA.id) return MILIA.name;
  return byId[id].label;
}
function subOf(id) {
  if (id === BUCCAL.id) return 'Массаж лица · дополнительно по показаниям';
  if (id === MILIA.id) return 'Чистка лица';
  return byId[id].catName;
}
function calc(e) {
  if (e.id === BUCCAL.id) return { amount: null, from: false, text: 'Стоимость уточнить', short: 'стоимость уточнить' };
  if (e.id === MILIA.id) {
    const r = miliaRate(e.qty);
    if (r) { const a = r * e.qty; return { amount: a, from: false, text: rub(a), small: `${e.qty} шт. × ${r}${NB}₽`, msg: `${e.qty} шт. — ${rub(a, false, true)} (${r} ₽ / шт.)` }; }
    if (e.qty === 10) return { amount: null, from: false, text: 'Уточнить', small: '10 шт. — два тарифа в прайсе', msg: '10 шт. — стоимость уточнить (в прайсе 10 шт. входит в два диапазона)' };
    return { amount: null, from: false, text: 'Уточнить', small: `${e.qty} шт. — более 20`, msg: `${e.qty} шт. — стоимость уточнить` };
  }
  const { it } = byId[e.id];
  if (e.variant === 'mask' && it.withMaskPriceRub) return { amount: it.withMaskPriceRub, from: false, text: rub(it.withMaskPriceRub), small: 'с маской', msg: rub(it.withMaskPriceRub, false, true), tag: ' (с маской)' };
  return { amount: it.priceRub, from: !!it.from, text: rub(it.priceRub, it.from), msg: rub(it.priceRub, it.from, true), small: it.withMaskPriceRub ? 'без маски' : '' };
}
function totals() {
  let known = 0, from = false, unknown = 0, nKnown = 0;
  sel.forEach(e => { const c = calc(e); if (c.amount == null) unknown++; else { known += c.amount; nKnown++; if (c.from) from = true; } });
  return { known, from, unknown, nKnown };
}

/* ---------- WhatsApp ---------- */
const GREETING = 'Добрый день! Хочу уточнить запись и подобрать процедуру. Подскажите, пожалуйста, какое время свободно?';
function buildMessage() {
  if (!sel.length) return GREETING;
  const lines = sel.map(e => {
    const c = calc(e);
    let n = nameOf(e.id) + (c.tag || '');
    if (e.id === MILIA.id) return `• ${n}, ${c.msg}`;
    return `• ${n} — ${c.msg || c.short}`;
  });
  const t = totals();
  let sum;
  if (!t.unknown) sum = `Предварительная сумма: ${rub(t.known, t.from, true)}.`;
  else if (t.nKnown) sum = `Известные позиции: ${rub(t.known, t.from, true)}. Стоимость ещё ${t.unknown} ${plPos(t.unknown)} уточняется.`;
  else sum = 'Стоимость выбранных позиций уточняется.';
  const q = sel.length > 1 ? 'Подскажите, пожалуйста, можно ли совместить эти процедуры и какое время свободно?' : 'Подскажите, пожалуйста, какое время свободно?';
  return `Добрый день! Хочу уточнить запись на услуги:\n${lines.join('\n')}\n${sum}\n${q}`;
}
function waUrl() { return phoneOk ? `https://wa.me/${D.contact.wa}?text=${encodeURIComponent(buildMessage())}` : null; }

/* ---------- price DOM ---------- */
const priceList = $('#priceList');
const catEls = {};
let openId = null, filter = 'all';

function itemRow(it, id, extraCls) {
  const li = document.createElement('li');
  li.className = 'row' + (extraCls ? ' ' + extraCls : '');
  li.dataset.id = id;
  const hasMask = !!it.withMaskPriceRub;
  const note = it.note ? `<div class="row-note">${esc(it.note)}</div>` : '';
  const vars = hasMask ? `<div class="vars" role="group" aria-label="Вариант: ${esc(it.name)}"><button type="button" class="var" data-var="plain" data-id="${id}" aria-pressed="true">Без маски · ${rub(it.priceRub)}</button><button type="button" class="var" data-var="mask" data-id="${id}" aria-pressed="false">С маской · ${rub(it.withMaskPriceRub)}</button></div>` : '';
  li.innerHTML = `<div class="row-main"><div class="row-name">${esc(it.name)}</div>${note}${vars}</div><div class="row-price" data-price>${rub(it.priceRub, it.from)}</div><button type="button" class="add" data-add="${id}" aria-pressed="false" aria-label="В чек: ${esc(byId[id] ? byId[id].label : it.name)}">${ICON_PLUS}</button>`;
  return li;
}
function infoRow(it) {
  const li = document.createElement('li');
  li.className = 'row row-info';
  li.innerHTML = `<div class="row-main"><div class="row-name">${esc(it.name)}</div></div><div class="row-price">${it.priceRub}${NB}₽${NB}/${NB}шт.</div>`;
  return li;
}
function buildPrice() {
  priceList.innerHTML = '';
  cats.forEach((c, i) => {
    const m = META[c.id];
    const art = document.createElement('div');
    art.className = 'cat';
    art.dataset.cat = c.id;
    const pid = 'p-' + c.id;
    art.innerHTML = `<h3><button type="button" class="cat-head" aria-expanded="false" aria-controls="${pid}"><span class="cat-n">${pad2(i + 1)}</span><span><span class="cat-t">${esc(m.name)}</span><span class="cat-s">${esc(m.sub)}</span></span><span class="cat-p">${esc(m.sum.replace(/ /g, NB))}</span><span class="cat-i" aria-hidden="true"></span></button></h3><div class="cat-panel" id="${pid}" role="region" aria-label="${esc(m.name)}" inert><div class="cat-in"><div class="cat-card"></div></div></div>`;
    const card = $('.cat-card', art);
    const rowsRec = [];
    const catText = norm(m.name + ' ' + c.category);
    c.groups.forEach((g, gi) => {
      const gEl = document.createElement('div');
      gEl.className = 'grp';
      if (g.heading) {
        const h = document.createElement('div'); h.className = 'grp-h';
        h.textContent = g.heading + (g.pricesPerUnit ? ' · ₽ / шт.' : '');
        gEl.appendChild(h);
      }
      const ul = document.createElement('ul'); ul.className = 'rows';
      const grec = { el: gEl, rows: [] };
      g.items.forEach(it => {
        const li = g.pricesPerUnit ? infoRow(it) : itemRow(it, it.id);
        ul.appendChild(li);
        const rec = { el: li, text: norm([it.name, it.note, g.heading, m.name].join(' ')) };
        grec.rows.push(rec); rowsRec.push(rec);
      });
      if (g.pricesPerUnit) {
        const li = document.createElement('li');
        li.className = 'row row-calc'; li.dataset.id = MILIA.id;
        li.innerHTML = `<div class="row-main"><div class="row-name">Рассчитать удаление милиумов</div><div class="row-note" id="miliaHint"></div><div class="stepper" role="group" aria-label="Количество милиумов"><button type="button" data-mq="-1" aria-label="Меньше">−</button><input id="miliaQty" type="number" inputmode="numeric" min="1" max="99" value="1" aria-label="Количество штук"><button type="button" data-mq="1" aria-label="Больше">+</button></div></div><div class="row-price" id="miliaPrice"></div><button type="button" class="add" data-add="${MILIA.id}" aria-pressed="false" aria-label="В чек: удаление милиумов">${ICON_PLUS}</button>`;
        ul.appendChild(li);
        const rec = { el: li, text: norm('удаление милиумов рассчитать милиум ' + m.name) };
        grec.rows.push(rec); rowsRec.push(rec);
      }
      if (c.id === 'face-massage' && gi === c.groups.length - 1) {
        const li = document.createElement('li');
        li.className = 'row'; li.dataset.id = BUCCAL.id;
        li.innerHTML = `<div class="row-main"><div class="row-name">${BUCCAL.name}</div><div class="row-note">дополнительно по показаниям</div></div><div class="row-price" data-price>Стоимость уточнить</div><button type="button" class="add" data-add="${BUCCAL.id}" aria-pressed="false" aria-label="В чек: буккальный массаж">${ICON_PLUS}</button>`;
        ul.appendChild(li);
        const rec = { el: li, text: norm('буккальный массаж дополнительно по показаниям ' + m.name) };
        grec.rows.push(rec); rowsRec.push(rec);
      }
      gEl.appendChild(ul);
      card.appendChild(gEl);
      rowsRec.groups = (rowsRec.groups || []); rowsRec.groups.push(grec);
    });
    priceList.appendChild(art);
    catEls[c.id] = { root: art, head: $('.cat-head', art), panel: $('.cat-panel', art), rows: rowsRec, groups: rowsRec.groups, catText };
    catEls[c.id].head.addEventListener('click', () => { if (searching) return; setOpen(openId === c.id ? null : c.id); });
  });
  $('#miliaQty').addEventListener('input', e => { const v = e.target.value; if (v === '') return; setMilia(v, false); });
  $('#miliaQty').addEventListener('change', e => setMilia(e.target.value, true));
}
function setOpen(id) {
  openId = id;
  cats.forEach(c => {
    const el = catEls[c.id]; const o = c.id === id;
    el.root.classList.toggle('open', o);
    el.head.setAttribute('aria-expanded', String(o));
    if (o) el.panel.removeAttribute('inert'); else if (!searching) el.panel.setAttribute('inert', '');
  });
}

/* search + filters */
let searching = false;
const q = $('#q'), qx = $('#qx'), empty = $('#empty'), status = $('#searchStatus'), hint = $('#priceHint');
let statusT;
function applyFilter() {
  const query = norm(q.value);
  searching = !!query;
  priceList.classList.toggle('searching', searching);
  let shownCats = 0, shownRows = 0;
  cats.forEach(c => {
    const el = catEls[c.id];
    const inF = FILTERS[filter].includes(c.id);
    const catMatch = searching && el.catText.includes(query);
    let n = 0;
    el.rows.forEach(r => {
      const ok = inF && (!searching || catMatch || r.text.includes(query));
      r.el.hidden = !ok; if (ok) n++;
    });
    el.groups.forEach(g => { g.el.hidden = !g.rows.some(r => !r.el.hidden); });
    const show = inF && (!searching || n > 0);
    el.root.hidden = !show;
    if (show) { shownCats++; shownRows += n; }
    if (searching) { if (show) el.panel.removeAttribute('inert'); else el.panel.setAttribute('inert', ''); }
    else { if (c.id !== openId) el.panel.setAttribute('inert', ''); else el.panel.removeAttribute('inert'); }
  });
  if (!searching && openId && catEls[openId].root.hidden) setOpen(null);
  empty.hidden = shownCats > 0;
  priceList.hidden = shownCats === 0;
  hint.hidden = shownCats === 0 || searching;
  qx.hidden = !q.value;
  clearTimeout(statusT);
  statusT = setTimeout(() => {
    status.textContent = searching ? (shownCats ? `Найдено: ${shownRows} ${shownRows % 10 === 1 && shownRows % 100 !== 11 ? 'позиция' : 'позиций'}` : 'Ничего не найдено') : '';
  }, 400);
}
let qT;
q.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(applyFilter, 80); qx.hidden = !q.value; });
q.addEventListener('keydown', e => { if (e.key === 'Escape' && q.value) { q.value = ''; applyFilter(); } });
qx.addEventListener('click', () => { q.value = ''; applyFilter(); q.focus(); });
$('#emptyReset').addEventListener('click', () => { q.value = ''; applyFilter(); q.focus(); });
$('#emptyAll').addEventListener('click', () => { q.value = ''; setFilter('all'); });
function setFilter(f) {
  filter = f;
  $$('.chip-f').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
  applyFilter();
}
$$('.chip-f').forEach(b => b.addEventListener('click', () => setFilter(b.dataset.filter)));
q.addEventListener('focus', () => document.body.classList.add('kb'));
q.addEventListener('blur', () => document.body.classList.remove('kb'));

function openCategory(id) {
  if (q.value) q.value = '';
  filter = 'all'; $$('.chip-f').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
  applyFilter();
  setOpen(id);
  const el = catEls[id];
  el.root.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'start' });
  setTimeout(() => el.head.focus({ preventScroll: true }), RM() ? 0 : 350);
}

/* ---------- selection actions ---------- */
function setMilia(v, commit) {
  miliaQty = clampQty(v);
  const i = idxOf(MILIA.id);
  if (i >= 0) { sel[i].qty = miliaQty; save(); renderAll(); }
  else syncMiliaUI();
  if (commit) $('#miliaQty').value = miliaQty;
}
function syncMiliaUI() {
  const inp = $('#miliaQty'); if (!inp) return;
  const i = idxOf(MILIA.id);
  const qty = i >= 0 ? sel[i].qty : miliaQty;
  if (document.activeElement !== inp) inp.value = qty;
  const c = calc({ id: MILIA.id, qty });
  $('#miliaPrice').innerHTML = c.amount != null ? c.text : '<span>Уточнить</span>';
  $('#miliaHint').textContent = c.amount != null ? c.small : (qty === 10 ? '10 штук входит в два диапазона прайса (6–10 и 10–20) — цену уточним.' : 'Более 20 штук — стоимость уточним.');
}
function add(id) {
  const e = { id, variant: 'plain', qty: 1 };
  if (id === MILIA.id) e.qty = miliaQty;
  else if (byId[id] && byId[id].it.withMaskPriceRub && variantPref[id] === 'mask') e.variant = 'mask';
  sel.push(e); lastAdded = id;
}
function toggle(id) {
  const i = idxOf(id);
  if (i >= 0) { sel.splice(i, 1); lastRemovedIdx = i; lastAdded = null; announce(); }
  else { add(id); pulse(); }
  save(); renderAll(); announce();
}
function removeFromReceipt(id) {
  const i = idxOf(id); if (i < 0) return;
  sel.splice(i, 1); lastAdded = null; save(); renderAll(); announce();
  const xs = $$('.rc-x');
  const target = xs[Math.min(i, xs.length - 1)];
  if (target) target.focus(); else { const b = $('#rcBack'); b.focus(); }
}
function setVariant(id, v) {
  variantPref[id] = v;
  const i = idxOf(id);
  if (i >= 0) { sel[i].variant = v; save(); renderAll(); announce(); }
  else syncList();
}
let annT;
function announce() {
  clearTimeout(annT);
  annT = setTimeout(() => {
    const t = totals();
    $('#live').textContent = sel.length ? `Выбрано: ${sel.length} ${plSvc(sel.length)}. ${sumPhrase(t)}` : 'Чек пуст';
  }, 250);
}
function sumPhrase(t) {
  if (!t.nKnown) return 'Стоимость уточняется.';
  const base = rub(t.known, t.from).replace(/ /g, ' ');
  return t.unknown ? `Известные позиции: ${base}, ещё ${t.unknown} ${plPos(t.unknown)} уточняется.` : `Предварительно ${base}.`;
}

priceList.addEventListener('click', e => {
  const a = e.target.closest('[data-add]'); if (a) { toggle(a.dataset.add); return; }
  const v = e.target.closest('[data-var]'); if (v) { setVariant(v.dataset.id, v.dataset.var); return; }
  const m = e.target.closest('[data-mq]'); if (m) { const i = idxOf(MILIA.id); setMilia((i >= 0 ? sel[i].qty : miliaQty) + Number(m.dataset.mq), true); }
});

/* ---------- sync UI ---------- */
function syncList() {
  $$('.row[data-id]', priceList).forEach(r => {
    const id = r.dataset.id; if (r.classList.contains('row-info')) return;
    const i = idxOf(id), on = i >= 0;
    r.classList.toggle('is-sel', on);
    const btn = $('.add', r); if (btn) btn.setAttribute('aria-pressed', String(on));
    const b = byId[id];
    if (b && b.it.withMaskPriceRub) {
      const v = on ? sel[i].variant : (variantPref[id] || 'plain');
      $$('.var', r).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.var === v)));
      $('[data-price]', r).innerHTML = v === 'mask' ? `${rub(b.it.withMaskPriceRub)}<small>с маской</small>` : rub(b.it.priceRub, b.it.from);
    }
  });
  syncMiliaUI();
}

const rc = { list: $('#rcList'), empty: $('#rcEmpty'), count: $('#rcCount'), label: $('#rcLabel'), value: $('#rcValue'), unk: $('#rcUnknown'), note: $('#rcNote'), back: $('#rcBack'), wa: $('#rcWa'), foot: $('#rcFoot'), tools: $('#rcTools') };
function renderReceipt() {
  const fk = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.fk : null;
  const n = sel.length, t = totals();
  rc.count.textContent = pad2(n);
  rc.empty.hidden = n > 0; rc.list.hidden = n === 0; rc.tools.hidden = n === 0;
  rc.note.hidden = n === 0; rc.foot.hidden = n === 0; rc.wa.hidden = n === 0; rc.back.hidden = n > 0;
  rc.list.innerHTML = sel.map((e, i) => {
    const c = calc(e);
    const b = byId[e.id];
    let ctl = '';
    if (b && b.it.withMaskPriceRub) ctl = `<div class="vars" role="group" aria-label="Вариант: ${esc(b.it.name)}"><button type="button" class="var" data-fk="v:${e.id}:plain" data-rv="${e.id}|plain" aria-pressed="${e.variant === 'plain'}">Без маски</button><button type="button" class="var" data-fk="v:${e.id}:mask" data-rv="${e.id}|mask" aria-pressed="${e.variant === 'mask'}">С маской</button></div>`;
    if (e.id === MILIA.id) ctl = `<div class="stepper" role="group" aria-label="Количество милиумов"><button type="button" data-fk="m-" data-rq="-1" aria-label="Меньше">−</button><output aria-live="off">${e.qty} шт.</output><button type="button" data-fk="m+" data-rq="1" aria-label="Больше">+</button></div>`;
    const sub = e.id === MILIA.id && c.small ? `${subOf(e.id)} · ${c.small}` : subOf(e.id);
    const price = e.id === MILIA.id ? c.text : `${c.text}`;
    return `<li class="rc-row${e.id === lastAdded ? ' in' : ''}" data-id="${e.id}"><span class="rc-n">${pad2(i + 1)}</span><div class="rc-main"><div class="rc-name">${esc(nameOf(e.id))}</div><div class="rc-sub">${esc(sub)}</div>${ctl}</div><div class="rc-price">${price}</div><button type="button" class="rc-x" data-fk="x:${e.id}" data-rm="${e.id}" aria-label="Убрать из чека: ${esc(nameOf(e.id))}">${ICON_X}</button></li>`;
  }).join('');
  rc.unk.hidden = !(n && t.unknown && t.nKnown);
  if (!n) { rc.label.textContent = 'Предварительно'; rc.value.textContent = '—'; }
  else if (!t.nKnown) { rc.label.textContent = 'Предварительно'; rc.value.textContent = 'уточняется'; }
  else if (t.unknown) { rc.label.textContent = 'Известные позиции'; rc.value.innerHTML = rub(t.known, t.from); rc.unk.textContent = `+ стоимость ${t.unknown} ${plPos(t.unknown)} уточняется`; }
  else { rc.label.textContent = 'Предварительная сумма'; rc.value.innerHTML = rub(t.known, t.from); }
  if (!n) rc.value.setAttribute('aria-label', 'ничего не выбрано'); else rc.value.removeAttribute('aria-label');
  if (fk) { const el = rc.list.querySelector(`[data-fk="${CSS.escape(fk)}"]`); if (el) el.focus(); }
}
rc.list.addEventListener('click', e => {
  const x = e.target.closest('[data-rm]'); if (x) { removeFromReceipt(x.dataset.rm); return; }
  const v = e.target.closest('[data-rv]'); if (v) { const [id, val] = v.dataset.rv.split('|'); setVariant(id, val); return; }
  const m = e.target.closest('[data-rq]'); if (m) { const i = idxOf(MILIA.id); if (i >= 0) setMilia(sel[i].qty + Number(m.dataset.rq), true); }
});
$('#rcClear').addEventListener('click', () => { sel = []; lastAdded = null; save(); renderAll(); announce(); $('#rcBack').focus(); });
$('#rcBack').addEventListener('click', e => { e.preventDefault(); const t = $('#price'); t.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth' }); q.focus({ preventScroll: true }); });

function renderPicked() {
  const box = $('#picked'), steps = $('#stepsMini');
  box.hidden = sel.length === 0; steps.hidden = sel.length > 0;
  $('#pickedList').innerHTML = sel.map(e => `<li>${ICON_CK}<span>${esc(nameOf(e.id))}</span></li>`).join('');
  const h2 = $('#calcT'), sub = $('#calcSub'), k = $('#calcKicker');
  if (sel.length) {
    h2.innerHTML = 'Ваш ритуал<br> в одном чеке.';
    sub.textContent = 'Проверьте список. Любую услугу можно удалить до перехода в WhatsApp. Стартовые цены честно помечены «от».';
    k.textContent = `03 / Ваш выбор · ${pad2(sel.length)} ${plSvc(sel.length)}`;
  } else {
    h2.innerHTML = 'Соберите свой<br> ритуал ухода.';
    sub.textContent = 'Добавляйте процедуры знаком + в прайсе. Здесь появится ваш чек с предварительной суммой — его можно отправить в WhatsApp.';
    k.textContent = '03 / Ваш выбор';
  }
}

function renderLinks() {
  const n = sel.length, t = totals(), url = waUrl();
  const sumShort = !t.nKnown ? 'уточняется' : rub(t.known, t.from) + (t.unknown ? ' +' : '');
  $$('[data-wa]').forEach(a => {
    const mode = a.dataset.mode;
    const isBar = a.id === 'minibar', isHead = a.id === 'headCta';
    if ((isHead || isBar) && n > 0) {
      a.href = '#receipt'; a.removeAttribute('target'); a.removeAttribute('rel'); a.dataset.go = 'receipt';
      if (isHead) { $('.lbl', a).textContent = `Мой выбор · ${pad2(n)}`; }
      if (isBar) {
        $('#mbL').textContent = `Мой выбор · ${pad2(n)}`;
        $('#mbR').innerHTML = `<span>${sumShort}</span><svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
        a.classList.add('has');
        a.setAttribute('aria-label', `Мой выбор: ${n} ${plSvc(n)}. ${sumPhrase(t)} Перейти к чеку`);
      }
      return;
    }
    delete a.dataset.go; a.classList.remove('has'); a.removeAttribute('aria-label');
    if (isHead) $('.lbl', a).textContent = 'Записаться';
    if (isBar) { $('#mbL').textContent = 'Записаться'; $('#mbR').innerHTML = '<svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'; }
    if (url) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('aria-disabled'); }
    else { a.href = '#contacts'; a.removeAttribute('target'); a.setAttribute('aria-disabled', 'true'); }
  });
  const fs = $('#finalSel');
  if (n) { fs.hidden = false; fs.textContent = `В сообщение добавлен ваш список: ${n} ${plSvc(n)}.`; } else fs.hidden = true;
  if (!url) { const f = $('#rcFoot'); f.textContent = D.demo ? 'Нажмите — покажем, какое сообщение уйдёт в WhatsApp.' : 'Канал записи пока недоступен.'; }
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-go="receipt"]'); if (a) { e.preventDefault(); goReceipt(); return; }
  const w = e.target.closest('a[data-wa][aria-disabled="true"]'); if (w) { e.preventDefault(); showDemo(); }
});
function showDemo() {
  const dlg = $('#demoDlg'); if (!dlg || !dlg.showModal) return;
  $('#demoMsg').textContent = buildMessage(); dlg.showModal();
}
$('#demoClose').addEventListener('click', () => $('#demoDlg').close());
function goReceipt() {
  const card = $('#receipt');
  card.scrollIntoView({ behavior: RM() ? 'auto' : 'smooth', block: 'center' });
  card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 600);
  $('#rcTitle').focus({ preventScroll: true });
}
function renderAll() {
  syncList(); renderReceipt(); renderPicked(); renderLinks(); updateThreads(); lastAdded = null;
  updateBar();
}

/* ---------- thread of light ---------- */
const threads = $$('.th').map(svg => ({ svg, line: $('.th-line', svg), dots: $('.th-dots', svg), end: $('.th-end', svg), len: 0, n: -1 }));
let threadDone = false, threadProg = 0;
function visibleTh() { return threads.find(t => t.svg.getBoundingClientRect().width > 0); }
function updateThreads() {
  threads.forEach(t => {
    if (t.svg.getBoundingClientRect().width === 0) return;
    try { t.len = t.line.getTotalLength(); } catch (e) { return; }
    t.line.style.strokeDasharray = t.len;
    t.dots.innerHTML = '';
    const n = sel.length;
    for (let i = 0; i < Math.min(n, 12); i++) {
      const p = t.line.getPointAtLength(t.len * (0.12 + 0.76 * (i + 1) / (Math.min(n, 12) + 1)));
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1)); c.setAttribute('r', 5);
      t.dots.appendChild(c);
    }
    setThreadProg(threadDone ? 1 : threadProg);
  });
}
function setThreadProg(p) { threads.forEach(t => { if (t.len) t.line.style.strokeDashoffset = t.len * (1 - p); }); }
function pulse() {
  if (RM()) return;
  const t = visibleTh(); if (!t || !t.len) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('r', 5); c.setAttribute('class', 'th-pulse'); t.svg.appendChild(c);
  const t0 = performance.now(), D_ = 420;
  (function step(now) {
    const k = Math.min(1, (now - t0) / D_), e = 1 - Math.pow(1 - k, 3);
    const p = t.line.getPointAtLength(t.len * e); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y);
    if (k < 1) requestAnimationFrame(step); else { c.remove(); t.end.classList.add('pulse'); setTimeout(() => t.end.classList.remove('pulse'), 220); }
  })(t0);
}

/* ---------- goals ---------- */
const GOALS = {
  fresh: { ids: ['cleaning', 'peeling', 'care'], d: { cleaning: 'Если хочется обсудить очищение кожи', peeling: 'Варианты ферментного и кислотного ухода', care: 'Готовые программы и состав процедур' } },
  light: { ids: ['face-massage', 'body-massage'], d: { 'face-massage': 'Техники массажа лица', 'body-massage': 'Массаж шеи, спины и тела' } }
};
let goalSel = null;
$$('.goal-btn').forEach(b => b.addEventListener('click', () => {
  const g = b.dataset.goal;
  if (g === 'exact') {
    goalSel = null; $$('.goal-btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#goalResult').innerHTML = '';
    if (q.value) { q.value = ''; } filter = 'all'; setFilter('all');
    $('#price').scrollIntoView({ behavior: RM() ? 'auto' : 'smooth' });
    return;
  }
  goalSel = g;
  $$('.goal-btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const def = GOALS[g];
  $('#goalResult').innerHTML = `<div class="sugg">${def.ids.map((id, i) => `<a class="sugg-card" style="--i:${i}" href="#price" data-open="${id}"><i>${pad2(i + 1)}</i><span><strong>${esc(META[id].name)}</strong><small>${esc(def.d[id])}</small><b>${esc(META[id].sum.replace(/ /g, NB))}</b></span><svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>`).join('')}</div><div class="sugg-foot"><a class="btn btn-dark" data-wa data-mode="book" href="#"><span class="lbl">Написать о своём запросе</span><svg class="arr" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a><p>Это подсказка для навигации, а не медицинский подбор. Переход ведёт к мессенджеру после подтверждения контакта.</p></div>`;
  renderLinks();
}));
$('#goalResult').addEventListener('click', e => { const a = e.target.closest('[data-open]'); if (a) { e.preventDefault(); openCategory(a.dataset.open); } });

/* ---------- menu ---------- */
const menu = $('#menu'), menuBtn = $('#menuBtn'), menuClose = $('#menuClose');
function openMenu() {
  menu.hidden = false; void menu.offsetWidth; menu.classList.add('open');
  menuBtn.setAttribute('aria-expanded', 'true'); document.body.classList.add('noscroll');
  menuClose.focus(); document.body.classList.add('menu-open'); updateBar();
}
function closeMenu(focusBack = true) {
  menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('noscroll', 'menu-open');
  setTimeout(() => { if (!menu.classList.contains('open')) menu.hidden = true; }, RM() ? 0 : 260);
  if (focusBack) menuBtn.focus(); updateBar();
}
menuBtn.addEventListener('click', openMenu);
menuClose.addEventListener('click', () => closeMenu());
menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(false); });
document.addEventListener('keydown', e => {
  if (menu.hidden || !menu.classList.contains('open')) return;
  if (e.key === 'Escape') { closeMenu(); return; }
  if (e.key === 'Tab') {
    const f = $$('a,button', menu).filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
matchMedia('(min-width:900px)').addEventListener?.('change', ev => { if (ev.matches && !menu.hidden) closeMenu(false); });

/* ---------- scroll effects ---------- */
const hero = $('#hero'), header = $('.site-header'), minibar = $('#minibar'), finalEl = $('#contacts'), calcSec = $('#calc');
let ticking = false;
function updateBar() {
  const vh = innerHeight;
  const hr = hero.getBoundingClientRect();
  const fr = finalEl.getBoundingClientRect();
  const show = hr.bottom < 60 && fr.top > vh - 120 && !document.body.classList.contains('kb') && !document.body.classList.contains('menu-open');
  minibar.hidden = false;
  minibar.classList.toggle('show', show);
  minibar.toggleAttribute('inert', !show);
}
function onScroll() {
  ticking = false;
  const vh = innerHeight, y = scrollY;
  header.classList.toggle('stuck', y > 8);
  if (!RM()) {
    const p = Math.max(0, Math.min(1, y / (vh * 0.75)));
    hero.style.setProperty('--p', p.toFixed(3));
  } else hero.style.setProperty('--p', 0);
  $$('.portrait img').forEach(im => { const r = im.parentElement.getBoundingClientRect(); if (r.bottom > 0 && r.top < vh) im.style.setProperty('--pp', (((r.top + r.height / 2) / vh - .5) * -28).toFixed(1) + 'px'); });
  if (!threadDone) {
    const r = calcSec.getBoundingClientRect();
    const vis = Math.max(0, Math.min(r.height, vh - r.top)) / Math.min(r.height, vh);
    threadProg = RM() ? 1 : Math.max(0, Math.min(1, vis / 0.6));
    setThreadProg(threadProg);
    if (threadProg >= 1) threadDone = true;
  }
  updateBar();
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', () => { updateThreads(); onScroll(); });
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const shift = $('.hero-media .shift');
  hero.addEventListener('pointermove', e => {
    if (RM()) return;
    const r = hero.getBoundingClientRect();
    shift.style.setProperty('--px', (((e.clientX - r.left) / r.width - .5) * -16).toFixed(1) + 'px');
    shift.style.setProperty('--py', (((e.clientY - r.top) / r.height - .5) * -10).toFixed(1) + 'px');
  });
  hero.addEventListener('pointerleave', () => { shift.style.setProperty('--px', '0px'); shift.style.setProperty('--py', '0px'); });
}
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));
} else $$('[data-reveal]').forEach(el => el.classList.add('in'));

/* ---------- фишки v2 ---------- */
(function fx() {
  const beads = $('#beads');
  if (beads) for (let i = 0; i < 9; i++) {
    const b = document.createElement('i'); b.className = 'bead';
    b.style.cssText = `left:${50 + Math.random() * 46}%;--s:${8 + Math.random() * 14}px;--t:${11 + Math.random() * 9}s;--dl:${-Math.random() * 16}s;--dx:${(Math.random() - .5) * 90}px`;
    beads.appendChild(b);
  }
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  const g = $('.hero-glow');
  hero.addEventListener('pointermove', e => {
    const r = hero.getBoundingClientRect();
    g.style.setProperty('--gx', (e.clientX - r.left) + 'px'); g.style.setProperty('--gy', (e.clientY - r.top) + 'px');
  });
  $$('.btn').forEach(b => {
    b.addEventListener('pointermove', e => {
      if (RM()) return; const r = b.getBoundingClientRect();
      b.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 8}px,${((e.clientY - r.top) / r.height - .5) * 6}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });
})();
function burst(btn) {
  if (RM() || !btn.animate) return;
  const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 9; i++) {
    const d = document.createElement('i'); d.className = 'burst';
    d.style.background = i % 2 ? '#C98B7B' : '#8E352D'; d.style.width = d.style.height = (4 + Math.random() * 5) + 'px';
    document.body.appendChild(d);
    const a = (Math.PI * 2 * i) / 9 + Math.random() * .5, dist = 26 + Math.random() * 26;
    d.animate([{ transform: `translate(${cx}px,${cy}px) scale(1)`, opacity: .95 }, { transform: `translate(${cx + Math.cos(a) * dist}px,${cy + Math.sin(a) * dist - 10}px) scale(.2)`, opacity: 0 }], { duration: 620, easing: 'cubic-bezier(.23,1,.32,1)' }).onfinish = () => d.remove();
  }
}
priceList.addEventListener('click', e => { const a = e.target.closest('[data-add]'); if (a && a.getAttribute('aria-pressed') === 'true') burst(a); });

/* ---------- init ---------- */
buildPrice();
const dropped = load();
setFilter('all');
renderAll();
if (dropped) {
  const n = document.createElement('p'); n.className = 'price-hint'; n.setAttribute('role', 'status');
  n.textContent = 'Прайс обновился: часть ранее выбранных позиций больше недоступна и убрана из чека.';
  priceList.after(n); setTimeout(() => n.remove(), 8000);
}
onScroll();
window.__kosm = { sel: () => sel, buildMessage, waUrl, calc, totals, toggle, setMilia, miliaRate };
})();
