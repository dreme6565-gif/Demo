// «Свои» — интерфейс страницы и привязка 3D-сцен к прокрутке.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const mqMobile = matchMedia('(max-width: 767px)');
const isRM = () => root.classList.contains('rm');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const PHONE = '79094358555';
const TG = `https://t.me/+${PHONE}`;
const WA = `https://wa.me/${PHONE}`;
const GENITIVE = { hair: 'волос', nails: 'ногтей', brows: 'бровей', laser: 'лазера и ухода' };
const FAQ = [
  ['Как записаться?', 'Напишите в Telegram или WhatsApp либо позвоните. Администратор поможет выбрать услугу и согласует время.'],
  ['Можно записаться на несколько процедур?', 'Да, добавьте услуги в расчёт и отправьте список. Администратор подскажет, можно ли совместить их в один визит.'],
  ['Где узнать точную стоимость?', 'В расчёте указаны доступные стартовые цены. Итог по выбранным услугам уточнит администратор.'],
  ['Есть ли обучение маникюру?', 'Да. Программу, ближайшие даты и стоимость можно узнать у администратора.'],
  ['До скольки работает студия?', 'Уточните доступные часы и время записи у администратора.'],
];

// ——— Склонения ———
const plural = (n, one, few, many) => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
};
const uslugAcc = (n) => `${n} ${plural(n, 'услугу', 'услуги', 'услуг')}`;
const uslugNom = (n) => `${n} ${plural(n, 'услуга', 'услуги', 'услуг')}`;
const uslugGen = (n) => `${n} ${plural(n, 'услуги', 'услуг', 'услуг')}`;
const fmt = (n) => n.toLocaleString('ru-RU').replace(/ /g, ' ');
const RUB = '<span class="rub">₽</span>';
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function priceHTML(p) {
  if (p.kind === 'fixed' && p.rub != null) return `${fmt(p.rub)} ${RUB}`;
  if (p.kind === 'from' && p.rub != null) return `от ${fmt(p.rub)} ${RUB}`;
  return 'Уточнить';
}
function priceText(p) {
  if (p.kind === 'fixed' && p.rub != null) return `${fmt(p.rub)} ₽`;
  if (p.kind === 'from' && p.rub != null) return `от ${fmt(p.rub)} ₽`;
  return 'уточнить стоимость';
}

// ——— Состояние ———
let catalog = null;
const byId = new Map();
let selected = [];
let activeTab = 'hair';
const expanded = new Set();
try { selected = JSON.parse(sessionStorage.getItem('svoi:sel') || '[]'); } catch { selected = []; }
const save = () => { try { sessionStorage.setItem('svoi:sel', JSON.stringify(selected)); } catch {} };

function toggle(id) {
  const i = selected.indexOf(id);
  if (i >= 0) selected.splice(i, 1); else selected.push(id);
  save();
  syncSelection();
}

// Итог: известная часть, «от», неизвестные позиции.
function summary() {
  const items = selected.map((id) => byId.get(id)).filter(Boolean);
  let sum = 0, hasFrom = false, known = 0, quote = 0;
  for (const s of items) {
    const p = s.price;
    if ((p.kind === 'fixed' || p.kind === 'from') && p.rub != null) { sum += p.rub; known++; if (p.kind === 'from') hasFrom = true; }
    else quote++;
  }
  const n = items.length;
  if (!n) return { n, total: '', totalHTML: '', note: '', short: '' };
  const money = `${hasFrom ? 'от ' : ''}${fmt(sum)} ₽`;
  const moneyHTML = `${hasFrom ? 'от ' : ''}${fmt(sum)} ${RUB}`;
  if (!quote) return { n, totalHTML: moneyHTML, total: money, note: `Ориентир за ${uslugAcc(n)}.`, short: `${uslugNom(n)} · ${money}` };
  if (!known) return { n, totalHTML: 'Стоимость уточняется', total: 'Стоимость уточняется', note: `Цену ${n > 1 ? 'этих ' + uslugGen(n) : '1 услуги'} уточнит администратор.`, short: `${uslugNom(n)} · цена уточняется` };
  return { n, totalHTML: `Известная часть · ${moneyHTML}`, total: `Известная часть · ${money}`, note: `Цену ещё ${uslugGen(quote)} уточнит администратор.`, short: `${uslugNom(n)} · ${money} + уточнить` };
}

// ——— Черновики сообщений ———
function draft(mode) {
  if (mode === 'training') return { lines: ['Здравствуйте! Подскажите, пожалуйста, программу, стоимость и ближайшие даты обучения маникюру.'], list: [] };
  const items = selected.map((id) => byId.get(id)).filter(Boolean);
  if (!items.length) return { lines: ['Здравствуйте! Хочу записаться в студию “Свои”. Подскажите, пожалуйста, ближайшее время.'], list: [] };
  return {
    head: 'Здравствуйте! Хочу записаться на услуги:',
    list: items.map((s) => `${s.title} — ${priceText(s.price)}`),
    tail: 'Подскажите, пожалуйста, итоговую стоимость и свободное время.',
  };
}
const draftText = (d) => d.head ? [d.head, ...d.list.map((l) => `— ${l}`), d.tail].join('\n') : d.lines.join('\n');
function draftHTML(d) {
  if (!d.head) return `<b>${esc(d.lines[0])}</b>`;
  return `<b>${esc(d.head)}</b>${d.list.map((l) => `<span>${esc(l)}</span>`).join('')}<br>${esc(d.tail)}`;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch { return false; }
}
function selectNode(el) {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}

// ——— Рендер каталога ———
function svcRow(s) {
  const on = selected.includes(s.id);
  const q = s.price.kind === 'quote' || s.price.rub == null;
  return `<li><span class="svc__name">${esc(s.title)}</span><span class="svc__price${q ? ' svc__price--q' : ''}">${priceHTML(s.price)}</span>`
    + `<button class="tog" type="button" data-toggle="${s.id}" aria-pressed="${on}" aria-label="${esc(s.title)}: добавить в расчёт"></button></li>`;
}
function catList(cat, scope) {
  const first = cat.services.slice(0, 4), rest = cat.services.slice(4);
  const key = `${scope}:${cat.id}`, open = expanded.has(key);
  let html = `<ul class="svc">${first.map(svcRow).join('')}</ul>`;
  if (rest.length) {
    html += `<ul class="svc svc--rest" id="rest-${key.replace(':', '-')}" ${open ? '' : 'hidden'}>${rest.map(svcRow).join('')}</ul>`;
    html += `<button class="more" type="button" data-more="${key}" aria-expanded="${open}" aria-controls="rest-${key.replace(':', '-')}">${open ? 'Свернуть' : `Все услуги для ${GENITIVE[cat.id] || cat.title.toLowerCase()}`} <span class="more__ic" aria-hidden="true">↓</span></button>`;
  }
  return html;
}

function renderCards() {
  $('[data-cards]').innerHTML = catalog.categories.map((c) => {
    const base = c.photo.split('/').pop().replace('.webp', '');
    return `<button class="card" type="button" data-cat-open="${c.id}" aria-haspopup="dialog">
      <span class="card__img"><picture><source media="(max-width: 767px)" srcset="assets/photos/${base}-mobile.webp"><img src="assets/photos/${base}.webp" alt="" loading="lazy" decoding="async" width="1536" height="1024"></picture></span>
      <span class="card__row"><span><span class="card__title">${esc(c.title)}</span><span class="card__desc">${esc(c.description)}</span></span><span class="circ" aria-hidden="true"><i class="arr"></i></span></span>
    </button>`;
  }).join('');
}

function renderTabs() {
  $('[data-tabs]').innerHTML = catalog.categories.map((c) =>
    `<button class="tab" role="tab" type="button" id="tab-${c.id}" data-tab="${c.id}" aria-selected="${c.id === activeTab}" aria-controls="calc-panel" tabindex="${c.id === activeTab ? 0 : -1}">${esc(c.title)}</button>`).join('');
  const panel = $('[data-panel]');
  panel.id = 'calc-panel';
  panel.setAttribute('aria-labelledby', `tab-${activeTab}`);
  panel.innerHTML = catList(catalog.categories.find((c) => c.id === activeTab), 'calc');
}

function renderVisit() {
  const list = $('[data-visit-list]');
  const items = selected.map((id) => byId.get(id)).filter(Boolean);
  list.innerHTML = items.map((s) => {
    const q = s.price.kind === 'quote' || s.price.rub == null;
    return `<li><span>${esc(s.title)}${q ? '<span class="q">цену уточнит администратор</span>' : ''}</span><button class="xs" type="button" data-remove="${s.id}" aria-label="Убрать: ${esc(s.title)}"></button></li>`;
  }).join('');
  const sm = summary();
  $('[data-visit-empty]').hidden = !!items.length;
  $('[data-visit-total]').innerHTML = sm.totalHTML;
  $('[data-visit-note]').textContent = items.length ? sm.note : '';
  $('[data-send]').disabled = !items.length;
  $('[data-copy-list]').disabled = !items.length;
  $('[data-selbar-sum]').innerHTML = sm.short ? esc(sm.short).replace('₽', RUB) : '';
  updateSelbar();
}

let catOpenId = null;
function renderCatalogDialog() {
  if (!catOpenId) return;
  const cat = catalog.categories.find((c) => c.id === catOpenId);
  $('#cat-title').textContent = cat.title;
  $('[data-cat-desc]').textContent = cat.description;
  $('[data-cat-list]').innerHTML = catList(cat, 'dlg');
  updateCatGo();
}
function updateCatGo() {
  const n = selected.length;
  $('[data-cat-go]').innerHTML = `К расчёту${n ? ' · ' + uslugNom(n) : ''} <i class="arr" aria-hidden="true"></i>`;
}

// Обновление выбора без пересборки (сохраняем фокус).
function syncSelection() {
  $$('[data-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(selected.includes(b.dataset.toggle))));
  updateCatGo();
  const focusedRemove = document.activeElement?.dataset?.remove;
  renderVisit();
  if (focusedRemove) {
    const next = $('[data-remove]') || $('#estimate-h');
    next.focus({ preventScroll: true });
  }
}

function renderFAQ() {
  $('[data-faq]').innerHTML = FAQ.map(([q, a], i) => `<div class="qa${i === 0 ? ' is-open' : ''}">
    <h3><button class="qa__btn" type="button" id="qa-b${i}" aria-expanded="${i === 0}" aria-controls="qa-a${i}">${esc(q)}<span class="qa__ic" aria-hidden="true"></span></button></h3>
    <div class="qa__a" id="qa-a${i}" role="region" aria-labelledby="qa-b${i}"><div><p>${esc(a)}</p></div></div></div>`).join('');
}

// ——— Диалоги ———
const openers = new WeakMap();
function openDialog(dlg, opener) {
  if (dlg.open) return;
  openers.set(dlg, opener || document.activeElement);
  dlg.showModal();
  root.classList.add('has-dialog');
  updateSelbar();
}
function closeDialog(dlg) { if (dlg.open) dlg.close(); }
$$('dialog').forEach((dlg) => {
  dlg.addEventListener('close', () => {
    root.classList.toggle('has-dialog', !!$('dialog[open]'));
    const o = openers.get(dlg);
    if (o && o.isConnected && !dlg.dataset.noRestore) setTimeout(() => o.focus({ preventScroll: true }), 0);
    delete dlg.dataset.noRestore;
    updateSelbar();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeDialog(dlg); return; }
    if (e.target === dlg) { // клик по подложке
      const r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(dlg);
    }
  });
});

function openCatalog(id, opener) {
  catOpenId = id;
  renderCatalogDialog();
  openDialog($('#catalog'), opener);
  $('#catalog .dlg__body').scrollTop = 0;
}

let bookMode = 'book';
function openBooking(mode, opener) {
  bookMode = mode;
  const dlg = $('#booking');
  dlg.classList.remove('is-fallback');
  const d = draft(mode);
  const text = draftText(d);
  $('[data-draft]').innerHTML = draftHTML(d);
  $('[data-chat-tg]').href = `${TG}?text=${encodeURIComponent(text)}`;
  $('[data-chat-wa]').href = `${WA}?text=${encodeURIComponent(text)}`;
  $('#book-title').textContent = mode === 'training' ? 'Обучение маникюру' : 'Запись в студию';
  $('[data-book-lead]').innerHTML = 'Выберите, где вам удобно общаться.<br>Время визита подтвердит администратор.';
  $('[data-copy]').textContent = d.head ? 'Скопировать список' : 'Скопировать текст';
  $('[data-book-status]').textContent = '';
  openDialog(dlg, opener);
}

async function copyFromBooking() {
  const text = draftText(draft(bookMode));
  const ok = await copyText(text);
  const st = $('[data-book-status]');
  if (ok) { st.textContent = '✓ Список скопирован'; return; }
  const dlg = $('#booking');
  dlg.classList.add('is-fallback');
  $('[data-book-lead]').innerHTML = '<strong style="color:var(--ink)">Сообщение готово.</strong><br>Скопируйте текст и откройте чат вручную или позвоните в студию.';
  st.textContent = 'Не удалось скопировать автоматически — текст выделен, скопируйте его вручную.';
  selectNode($('[data-draft]'));
}

// ——— Нижняя панель выбора (mobile) ———
let estimateInView = false;
function keyboardOpen() { const vv = window.visualViewport; return !!vv && vv.height < window.innerHeight * 0.72; }
function updateSelbar() {
  const bar = $('[data-selbar]');
  const show = mqMobile.matches && selected.length > 0 && !estimateInView && !$('dialog[open]') && !keyboardOpen();
  if (show) { bar.hidden = false; requestAnimationFrame(() => bar.classList.remove('is-off')); }
  else { bar.classList.add('is-off'); }
}

function goToEstimate(catId) {
  if (catId) { activeTab = catId; renderTabs(); }
  const h = $('#estimate-h');
  h.scrollIntoView({ block: 'start', behavior: isRM() ? 'auto' : 'smooth' });
  h.focus({ preventScroll: true });
}

// ——— События ———
document.addEventListener('click', (e) => {
  const t = e.target;
  const tog = t.closest('[data-toggle]');
  if (tog) { toggle(tog.dataset.toggle); return; }
  const rem = t.closest('[data-remove]');
  if (rem) { toggle(rem.dataset.remove); return; }
  const more = t.closest('[data-more]');
  if (more) {
    const k = more.dataset.more;
    expanded.has(k) ? expanded.delete(k) : expanded.add(k);
    const open = expanded.has(k);
    const list = document.getElementById(more.getAttribute('aria-controls'));
    list.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
    const cat = k.split(':')[1];
    more.firstChild.textContent = open ? 'Свернуть ' : `Все услуги для ${GENITIVE[cat]} `;
    if (open) list.querySelector('[data-toggle]')?.focus({ preventScroll: true });
    return;
  }
  const tab = t.closest('[data-tab]');
  if (tab) { activeTab = tab.dataset.tab; renderTabs(); $(`#tab-${activeTab}`).focus(); return; }
  const co = t.closest('[data-cat-open]');
  if (co) { openCatalog(co.dataset.catOpen, co); return; }
  if (t.closest('[data-cat-go]')) {
    const dlg = $('#catalog'); dlg.dataset.noRestore = '1'; closeDialog(dlg);
    goToEstimate(catOpenId); return;
  }
  const bk = t.closest('[data-book]');
  if (bk) {
    const menu = $('#menu');
    if (menu.open) { menu.dataset.noRestore = '1'; closeDialog(menu); }
    openBooking(bk.dataset.book === 'training' ? 'training' : 'book', menu.contains(bk) ? $('[data-menu-open]') : bk);
    return;
  }
  if (t.closest('[data-send]')) { openBooking('book', t.closest('[data-send]')); return; }
  if (t.closest('[data-copy]')) { copyFromBooking(); return; }
  if (t.closest('[data-copy-list]')) {
    const st = $('[data-copy-status]');
    copyText(draftText(draft('book'))).then((ok) => {
      st.textContent = ok ? '✓ Список скопирован' : 'Не удалось скопировать — откройте «Отправить список» и выделите текст вручную.';
    });
    return;
  }
  if (t.closest('[data-menu-open]')) { openDialog($('#menu'), t.closest('[data-menu-open]')); return; }
  const mlink = t.closest('.menu__nav a');
  if (mlink) { const m = $('#menu'); m.dataset.noRestore = '1'; closeDialog(m); return; } // якорь сработает по умолчанию
  if (t.closest('[data-to-estimate]')) { e.preventDefault(); goToEstimate(); return; }
  const qa = t.closest('.qa__btn');
  if (qa) {
    const box = qa.closest('.qa'), open = !box.classList.contains('is-open');
    box.classList.toggle('is-open', open); qa.setAttribute('aria-expanded', String(open));
  }
});

// Стрелки во вкладках
$('[data-tabs]').addEventListener('keydown', (e) => {
  const ids = catalog.categories.map((c) => c.id);
  let i = ids.indexOf(activeTab);
  if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
  else if (e.key === 'ArrowLeft') i = (i - 1 + ids.length) % ids.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = ids.length - 1;
  else return;
  e.preventDefault(); activeTab = ids[i]; renderTabs(); $(`#tab-${activeTab}`).focus();
});


// ═════════ Ревизия 05: «Цветы в движении» — пять стыков A–E ═════════
// Каждый цветок летит между опорными WebP-цветами в разметке ([data-flw]); изгиб и глубина — из scroll-tracks.json.
// Прогресс стыка — функция положения измеряемых краёв секций; всё обратимо, один rAF.
let tracks = null;
let stage = null;
let glBack = null, glFront = null;
let lastKey = '';
const SVGNS = 'http://www.w3.org/2000/svg';
const heroPhoto = $('.hero__photo');
const bPhoto = $('.b-photo');
const ease = (t) => t * t * (3 - 2 * t);
const soft = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep: мягкий разгон и торможение
const ramp = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const motionOn = () => !isRM() && !root.classList.contains('no3d');
let metrics = null;
let kbdComplete = false;

// ——— Сцены ———
// from/to/via — опорные цветы; z: +1 передний проход (ближе к камере), −1 задний (за буквами); mirror — зеркалит изгиб дуги.
const SEAMS = {
  A: { objs: [
    { id: 'A1', mesh: 'sakura', from: 'hero-sakura', to: 'a-sakura', z: 1, mirror: 3, mMirror: -3.6, mZ: -1, lag: 0 },
    { id: 'A2', mesh: 'orchid', from: 'hero-orchid', to: 'a-orchid', z: -1, mirror: -1, lag: 0.06 },
    { id: 'A3', mesh: 'petal', from: 'hero-petal', to: 'a-petal', z: 1, mirror: -0.6, lag: 0.1 },
  ] },
  B: { objs: [
    { id: 'B1', mesh: 'sakura', from: 'b0-sakura', via: 'b-sakura', exit: 'right', z: 1, mirror: 1, lag: 0, oIn: [0, 0.16], oOut: [0.72, 0.97] },
    { id: 'B2', mesh: 'orchid', from: 'b0-orchid', via: 'b-orchid', exit: 'left', z: -1, mirror: -1, lag: 0.05, oIn: [0.04, 0.2], oOut: [0.72, 0.95] },
    { id: 'B3', mesh: 'petal', from: 'b0-orchid', via: 'b-petal', exit: 'drift', z: 1, mirror: -0.7, lag: 0.1, oIn: [0.1, 0.3], oOut: [0.84, 1] },
  ] },
  C: { objs: [
    { id: 'C1', mesh: 'sakura', from: 'c0', to: 'c-sakura', z: 1, mirror: 1, lag: 0, oIn: [0, 0.2] },
    { id: 'C2', mesh: 'orchid', from: 'c0', to: 'c-orchid', z: -1, mirror: -1, lag: 0.06, oIn: [0.04, 0.24] },
    { id: 'C3', mesh: 'petal', from: 'c0', to: 'c-petal', z: 1, mirror: -0.6, lag: 0.1, oIn: [0.08, 0.3] },
  ] },
  D: { objs: [
    { id: 'D1', mesh: 'petal', from: 'd0', to: 'd-petal', z: 1, mirror: 1, lag: 0, oIn: [0, 0.22] },
    { id: 'D2', mesh: 'sakura-side', from: 'd0', to: 'd-side', z: -1, mirror: -1, lag: 0.12, oIn: [0.1, 0.32] },
  ] },
  E: { objs: [
    { id: 'E1', mesh: 'sakura', from: 'e0', to: 'e-sakura', z: 1, mirror: 1, lag: 0, oIn: [0, 0.2] },
    { id: 'E2', mesh: 'orchid', from: 'e0', to: 'e-orchid', z: -1, mirror: -1, lag: 0.05, oIn: [0.04, 0.22] },
    { id: 'E3', mesh: 'sakura-side', from: 'e0', to: 'e-side', z: 1, mirror: -0.7, lag: 0.1, oIn: [0.08, 0.26] },
    { id: 'E4', mesh: 'petal', from: 'e0', to: 'e-petal', z: 1, mirror: 0.6, lag: 0.14, oIn: [0.1, 0.3] },
  ] },
};

function anchor(id) {
  const el = document.querySelector(`[data-flw="${id}"]`);
  if (!el || !el.offsetParent) return null; // скрыт на этой ширине
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: el.offsetWidth, rz: +el.dataset.rz || 0 };
}
const bez = (P, t) => { const u = 1 - t; return [0, 1, 2].map((k) => u * u * u * P[0][k] + 3 * u * u * t * P[1][k] + 3 * u * t * t * P[2][k] + t * t * t * P[3][k]); };

// Дуга между двумя опорами: прямая S→E плюс отклонение кривой Безье стыка от своей хорды (в долях вьюпорта).
function arc(S, E, t, P, o, W, H, m) {
  const te = soft(t);
  const B = bez(P, te), L = [lerp(P[0][0], P[3][0], te), lerp(P[0][1], P[3][1], te)];
  const z = B[2] * (m && o.mZ ? o.mZ : o.z);         // −0.26…+0.27; на телефоне можно увести за кнопки
  const scale = 1 + z * 0.46;                         // far 0.88 … near 1.12
  const tilt = (m ? 10 : 18) * Math.sin(Math.PI * te);
  const mir = m ? (o.mMirror ?? o.mirror) * 0.6 : o.mirror;
  return {
    x: lerp(S.x, E.x, te) + (B[0] - L[0]) * W * mir,
    y: lerp(S.y, E.y, te) + (B[1] - L[1]) * H * (m ? 0.6 : 1),
    w: lerp(S.w, E.w, te) * scale * (m ? 1 - 0.3 * Math.sin(Math.PI * te) : 1), // на телефоне в пролёте меньше
    z: z || ((m && o.mZ ? o.mZ : o.z) * 0.01),
    rz: lerp(S.rz, E.rz, te) + 14 * Math.sin(Math.PI * te) * o.mirror,
    rx: tilt * Math.sign(z || 1), ry: tilt * 0.6 * Math.sign(mir || 1),
  };
}

function objState(o, p, P, W, H, m) {
  const S = anchor(o.from);
  if (!S) return null;
  let st;
  if (o.via) {
    const V = anchor(o.via);
    if (!V) return null;
    const t1 = ramp(p, o.lag + 0.02, 0.5), t2 = soft(ramp(p, 0.69, 1));
    st = arc(S, V, t1, P, o, W, H, m);
    if (t2 > 0) {
      const X = o.exit === 'right' ? { x: W + V.w * 0.25, y: V.y - 70, w: V.w * 0.9, rz: V.rz + 26 }
        : o.exit === 'left' ? { x: W * 0.05, y: V.y + 36, w: V.w * 0.8, rz: V.rz - 30 }
          : { x: V.x + 70, y: V.y + 26, w: V.w * 0.9, rz: V.rz + 40 };
      st = { x: lerp(st.x, X.x, t2), y: lerp(st.y, X.y, t2) - 24 * Math.sin(Math.PI * t2), w: lerp(st.w, X.w, t2), z: st.z, rz: lerp(st.rz, X.rz, t2), rx: st.rx * (1 - t2), ry: st.ry * (1 - t2) };
    }
  } else {
    const E = anchor(o.to);
    if (!E) return null;
    st = arc(S, E, ramp(p, o.lag, 1), P, o, W, H, m);
  }
  let op = 1;
  if (o.oIn) op *= ease(ramp(p, o.oIn[0], o.oIn[1]));
  if (o.oOut) op *= 1 - ease(ramp(p, o.oOut[0], o.oOut[1]));
  return { id: o.id, mesh: o.mesh, ...st, o: op };
}

// ——— Прорисовка заголовков: заливка — маска по настоящим глифам, контур — декоративный SVG без подмены текста ———
const draws = $$('[data-draw]').map((h) => ({ h, svg: null, lines: [], d: -1 }));
function buildDraw(o) {
  const h = o.h;
  o.svg?.remove();
  const was = h.classList.contains('is-drawing');
  h.classList.remove('is-drawing');
  const hr = h.getBoundingClientRect();
  if (!hr.width) return;
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('draw__svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', hr.width); svg.setAttribute('height', hr.height);
  o.lines = [];
  $$('.ln', h).forEach((ln) => {
    const cs = getComputedStyle(ln);
    const mk = document.createElement('span'); mk.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    ln.appendChild(mk); const base = mk.getBoundingClientRect().top - hr.top; mk.remove();
    const range = document.createRange(); range.selectNodeContents(ln);
    const rr = range.getBoundingClientRect(), fs = parseFloat(cs.fontSize);
    const t = document.createElementNS(SVGNS, 'text'); t.textContent = ln.textContent;
    t.setAttribute('x', rr.left - hr.left); t.setAttribute('y', base);
    t.style.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; t.style.letterSpacing = cs.letterSpacing;
    const L = fs * 9;
    t.setAttribute('fill', 'none'); t.setAttribute('stroke', cs.color); t.setAttribute('stroke-width', fs > 50 ? '1' : '0.8');
    t.style.strokeDasharray = `${L} ${L}`; t.style.strokeDashoffset = L;
    svg.appendChild(t);
    o.lines.push({ ln, t, L });
  });
  h.appendChild(svg); o.svg = svg; o.d = -1;
  if (was) h.classList.add('is-drawing');
}
function setDraw(o, d) {
  if (!o?.svg) return;
  if (d >= 1 || !motionOn() || kbdComplete) {
    if (o.d !== 1) { o.h.classList.remove('is-drawing'); o.svg.style.display = 'none'; o.lines.forEach((l) => l.ln.style.removeProperty('--f')); o.d = 1; }
    return;
  }
  if (Math.abs(o.d - d) < 1e-4) return;
  o.d = d; o.h.classList.add('is-drawing'); o.svg.style.display = '';
  o.lines.forEach((l, i) => {
    l.ln.style.setProperty('--f', ease(ramp(d, 0.22 + i * 0.12, 1)).toFixed(4));
    l.t.style.strokeDashoffset = (l.L * (1 - ramp(d, i * 0.12, 0.62 + i * 0.1))).toFixed(1);
    l.t.style.opacity = (1 - ramp(d, 0.72, 1)).toFixed(3);
  });
}

// ——— Геометрия стыков: измеряемые края секций ———
const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
const docBottom = (el) => el.getBoundingClientRect().bottom + window.scrollY;
function measure() {
  const vh = window.innerHeight, m = mqMobile.matches;
  const cards = $$('.card'), qas = $$('.qa');
  const lastCard = cards[cards.length - 1] || $('#services'), lastQa = qas[qas.length - 1] || $('#faq');
  const win = {
    A: [0, docTop($('#services-h')) - (m ? 0.42 : 0.36) * vh],
    B: [docBottom(lastCard) - vh, docTop($(m ? '.tabs' : '.calc')) - (m ? 0.8 : 0.78) * vh],
    C: [docBottom($('.calc')) - 0.92 * vh, docTop($('.team__media')) - (m ? 0.12 : 0.25) * vh],
    D: [docBottom($('#team')) - 0.9 * vh, docTop($('#faq')) - 0.35 * vh],
    E: [docBottom(lastQa) - 0.95 * vh, docTop($('#contact-h')) - 0.42 * vh],
  };
  Object.values(win).forEach((w) => { if (w[1] - w[0] < 60) w[1] = w[0] + 60; });
  metrics = { vh, m, win };
  draws.forEach(buildDraw);
  lastKey = '';
}
function progress() {
  const y = window.scrollY, out = {};
  for (const k in metrics.win) { const [a, b] = metrics.win[k]; out[k] = clamp((y - a) / (b - a)); }
  return out;
}

function applyDOM(pr, sm = pr) {
  const motion = motionOn();
  if (motion) {
    // Светлая кромка портрета растворяется в направлении, в котором сакура обходит заголовок
    heroPhoto.style.setProperty('--par', Math.min(window.scrollY * 0.22, 400).toFixed(1));
    heroPhoto.style.setProperty('--heroOp', (1 - 0.7 * ease(ramp(pr.A, 0.12, 0.7))).toFixed(3));
    // B: маленькая область фото маникюра в контуре лепестка → мягкий общий кадр → растворение
    bPhoto.style.setProperty('--pm', `${(18 + 400 * soft(ramp(sm.B, 0.22, 0.61))).toFixed(1)}%`);
    bPhoto.style.setProperty('--po', (ease(ramp(sm.B, 0.18, 0.3)) * (1 - ease(ramp(sm.B, 0.7, 0.95)))).toFixed(3));
    bPhoto.style.setProperty('--ps', (1.08 - 0.08 * ease(ramp(sm.B, 0.22, 0.7))).toFixed(4));
  } else {
    ['--par', '--heroOp'].forEach((v) => heroPhoto.style.removeProperty(v));
    ['--pm', '--po', '--ps'].forEach((v) => bPhoto.style.removeProperty(v));
  }
  setDraw(draws[0], ramp(pr.A, 0.16, 0.68));
  setDraw(draws[1], ramp(pr.B, 0.16, 0.68));
}

function renderGL(pr) {
  if (!stage || !tracks) return;
  const W = glFront.clientWidth, H = glFront.clientHeight, m = metrics.m;
  const items = [];
  for (const k in SEAMS) {
    const P = tracks.seams[k][m ? 'mobile' : 'desktop'];
    for (const o of SEAMS[k].objs) {
      const st = objState(o, pr[k], P, W, H, m);
      if (!st || st.o < 0.004) continue;
      if (st.y < -st.w || st.y > H + st.w || st.x < -st.w * 1.2 || st.x > W + st.w * 1.2) continue;
      items.push(st);
    }
  }
  const key = `${W}x${H}|` + items.map((s) => `${s.id}${s.x.toFixed(1)},${s.y.toFixed(1)},${s.w.toFixed(1)},${s.rz.toFixed(1)},${s.o.toFixed(3)}`).join(';');
  if (key === lastKey) return;
  lastKey = key;
  stage.setSize(W, H);
  stage.frame(items);
  root.classList.add('gl-on');
}

// Цветы мягко догоняют прокрутку (экспоненциальное сглаживание по времени): при резком рывке они не прыгают,
// а плавно доплывают; при прокрутке назад идут по той же дуге. Прямой якорь и ресайз — сразу в нужный кадр.
let smooth = null, snapNext = true, lastT = 0;
const TAU = () => (metrics?.m ? 0.42 : 0.55); // секунды; больше — мягче
function smoothStep(pr, now) {
  if (!smooth || snapNext || !motionOn()) { smooth = { ...pr }; snapNext = false; lastT = now; return false; }
  const dt = Math.min(0.1, Math.max(0, (now - lastT) / 1000)); lastT = now;
  const k = 1 - Math.exp(-dt / TAU());
  let moving = false;
  for (const key in pr) {
    const d = pr[key] - smooth[key];
    if (Math.abs(d) < 0.0006) smooth[key] = pr[key];
    else { smooth[key] += d * k; moving = true; }
  }
  return moving;
}

let ticking = false;
function frame(now = performance.now()) {
  ticking = false;
  if (!metrics) measure();
  const pr = progress();
  const moving = smoothStep(pr, now);
  applyDOM(pr, smooth);
  renderGL(smooth);
  window.__svoi = { ...pr, smooth: { ...smooth }, win: metrics.win, vh: metrics.vh, m: metrics.m };
  if (moving) schedule();
}
function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
function relayout(snap = false) { measure(); if (snap) snapNext = true; schedule(); }
window.addEventListener('hashchange', () => { snapNext = true; schedule(); });
window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', () => { relayout(true); updateSelbar(); });
mqMobile.addEventListener('change', () => { relayout(true); updateSelbar(); });
let roT = 0;
new ResizeObserver(() => { clearTimeout(roT); roT = setTimeout(relayout, 60); }).observe(document.body); // в т.ч. открытие FAQ
window.visualViewport?.addEventListener('resize', updateSelbar);
document.addEventListener('keydown', (e) => { if (e.key === 'Tab' && !kbdComplete) { kbdComplete = true; draws.forEach((o) => { o.d = -1; }); schedule(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastKey = ''; snapNext = true; schedule(); } });
document.fonts?.ready.then(relayout);

function observeCards() {
  if (!('IntersectionObserver' in window)) { $$('.card').forEach((c) => c.classList.add('is-in')); return; }
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.6 });
  $$('.card').forEach((c) => io.observe(c));
}

function to3dFallback(reason) {
  console.warn('[svoi] 3D отключено:', reason);
  root.classList.add('no3d');
  root.classList.remove('gl-on');
  stage = null;
  relayout();
}
window.addEventListener('svoi:gl-lost', () => to3dFallback('context lost'));
function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
async function startGL() {
  if (isRM() || root.classList.contains('no3d') || !tracks) return;
  if (!webglAvailable()) { to3dFallback('нет WebGL'); return; }
  try {
    const { createBlossoms } = await import('./scene.js?v=36');
    glBack = document.createElement('canvas'); glBack.className = 'gl-back'; glBack.setAttribute('aria-hidden', 'true');
    glFront = document.createElement('canvas'); glFront.className = 'gl-front'; glFront.setAttribute('aria-hidden', 'true');
    document.body.prepend(glBack); document.body.appendChild(glFront);
    const s = createBlossoms({ back: glBack, front: glFront, mobile: mqMobile.matches });
    await s.load('assets/3d/blossoms.glb'); // WebP-цветы остаются до первого успешного кадра
    stage = s; lastKey = ''; schedule();
  } catch (err) { to3dFallback(err); }
}

// ——— Старт ———
async function init() {
  const [catRes, trRes] = await Promise.allSettled([
    fetch('assets/catalog.json').then((r) => r.json()),
    fetch('assets/3d/scroll-tracks.json').then((r) => r.json()),
  ]);
  if (catRes.status === 'fulfilled') {
    catalog = catRes.value;
    catalog.categories.forEach((c) => c.services.forEach((s) => byId.set(s.id, { ...s, cat: c.id })));
    selected = selected.filter((id) => byId.has(id));
    renderCards(); renderTabs(); renderVisit();
    observeCards();
  }
  renderFAQ();
  if (trRes.status === 'fulfilled') tracks = trRes.value; else root.classList.add('no3d');
  new IntersectionObserver(([en]) => { estimateInView = en.isIntersecting; updateSelbar(); }, { threshold: 0.05 }).observe($('#estimate'));
  measure(); frame();
  const go = () => (window.requestIdleCallback ? requestIdleCallback(startGL, { timeout: 1200 }) : setTimeout(startGL, 300));
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
}
init();
