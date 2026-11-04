/* «Секрет»: меню, появление блоков, прайс, cookie, карта, форма. Без библиотек. */
(function () {
  'use strict';
  var C = window.SEKRET || {};
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  /* общий помощник: ловушка фокуса для меню, модалок и нижнего листа */
  var SekretUI = window.SekretUI = {
    trap: function (el) {
      function onKey(e) {
        if (e.key !== 'Tab') return;
        var f = $$('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])', el)
          .filter(function (n) { return n.offsetParent !== null || n === doc.activeElement; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      el.addEventListener('keydown', onKey);
      return function () { el.removeEventListener('keydown', onKey); };
    }
  };

  /* ссылки на Max и онлайн-запись */
  $$('[data-max]').forEach(function (a) { a.href = C.maxUrl || C.card2gis || a.href; });
  $$('[data-booking]').forEach(function (a) { a.href = C.bookingUrl || C.card2gis || a.href; });

  /* шапка становится тоньше */
  var hdr = $('.hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('is-compact', window.scrollY > 24); };
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* меню на телефоне */
  var menu = $('#menu'), burger = $('.burger'), releaseMenu = null;
  function openMenu() {
    if (!menu) return;
    menu.classList.add('is-open'); burger.setAttribute('aria-expanded', 'true');
    doc.body.style.overflow = 'hidden'; releaseMenu = SekretUI.trap(menu);
    var c = $('[data-menu-close]', menu); if (c) c.focus();
  }
  function closeMenu(back) {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false');
    doc.body.style.overflow = ''; if (releaseMenu) releaseMenu();
    if (back !== false) burger.focus();
  }
  if (burger) burger.addEventListener('click', openMenu);
  if (menu) {
    $$('[data-menu-close]', menu).forEach(function (b) { b.addEventListener('click', function () { closeMenu(); }); });
    $$('nav a', menu).forEach(function (a) { a.addEventListener('click', function () { closeMenu(false); }); });
    menu.setAttribute('aria-hidden', 'true');
    new MutationObserver(function () { menu.setAttribute('aria-hidden', menu.classList.contains('is-open') ? 'false' : 'true'); })
      .observe(menu, { attributes: true, attributeFilter: ['class'] });
  }
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* появление блоков и «рисующаяся» линия */
  var revs = $$('.reveal, .wave');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revs.forEach(function (n) { io.observe(n); });
  } else { revs.forEach(function (n) { n.classList.add('in'); }); }

  /* подсветка текущего пункта меню */
  var navLinks = $$('.nav a');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var secIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) navLinks.forEach(function (a) { a.classList.toggle('is-cur', a.getAttribute('href').slice(-en.target.id.length - 1) === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['prices', 'calculator', 'about', 'reviews', 'contacts'].forEach(function (id) { var s = doc.getElementById(id); if (s) secIO.observe(s); });
  }

  /* услуги и цены: вкладки (компьютер), аккордеоны (телефон), раскрытие превью */
  var cats = $$('.cat');
  if (cats.length) {
    var tabs = $$('.cats [role="tab"]'), prevs = $$('.pcard');
    var setActive = function (key) {
      cats.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-cat') === key); });
      tabs.forEach(function (t) { var on = t.getAttribute('data-cat') === key; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
      prevs.forEach(function (p) { p.hidden = p.getAttribute('data-cat') === key; });
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setActive(t.getAttribute('data-cat')); });
      t.addEventListener('keydown', function (e) {
        var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (j < 0) return; e.preventDefault(); j = (j + tabs.length) % tabs.length; tabs[j].focus(); setActive(tabs[j].getAttribute('data-cat'));
      });
    });
    setActive('face');
    $$('.cat__head button').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.closest('.cat'), open = !c.classList.contains('is-open');
        c.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
      });
    });
    $$('.pcard .more').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.closest('.pcard'), full = !p.classList.contains('is-full');
        p.classList.toggle('is-full', full); b.setAttribute('aria-expanded', full);
        b.firstChild.textContent = full ? 'Свернуть ' : 'Показать все ';
      });
    });
  }

  /* мягкий параллакс первого экрана: мышь на компьютере, скролл на телефоне */
  var pimg = $('[data-parallax]');
  if (pimg && !reduce) {
    var fine = matchMedia('(hover: hover) and (pointer: fine)'), hero = $('.hero'), tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var tick = function () {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      pimg.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0) scale(1.03)';
      raf = (Math.abs(tx - cx) > .05 || Math.abs(ty - cy) > .05) ? requestAnimationFrame(tick) : 0;
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };
    hero.addEventListener('mousemove', function (e) {
      if (!fine.matches) return;
      var r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - .5) * -22; ty = ((e.clientY - r.top) / r.height - .5) * -16; kick();
    });
    window.addEventListener('scroll', function () {
      if (fine.matches) return;
      tx = 0; ty = Math.min(window.scrollY, 600) * 0.08; kick();
    }, { passive: true });
  }

  /* нижняя панель «Записаться» на телефоне: уступает место итогу расчёта, форме и клавиатуре */
  var dock = $('#dock');
  var st = { calc: false, book: false, kb: false };
  function bars() {
    root.classList.toggle('in-calc', st.calc);
    root.classList.toggle('kb', st.kb);
    if (dock) dock.classList.toggle('is-off', st.calc || st.book || st.kb);
  }
  if ('IntersectionObserver' in window) {
    [['calculator', 'calc'], ['booking', 'book']].forEach(function (p) {
      var el = doc.getElementById(p[0]); if (!el) return;
      new IntersectionObserver(function (es) { st[p[1]] = es[0].isIntersecting; bars(); }, { threshold: 0.05 }).observe(el);
    });
  }
  doc.addEventListener('focusin', function (e) { if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'checkbox') { st.kb = true; bars(); } });
  doc.addEventListener('focusout', function () { setTimeout(function () { var a = doc.activeElement; st.kb = !!(a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && a.type !== 'checkbox'); bars(); }, 60); });

  /* cookie: «Принять», «Отклонить», «Настроить» равнозначны; необязательное выключено до согласия */
  var KEY = 'sekret_cookie_v1', ck = null, banner = $('#ck'), modal = $('#ckModal'), releaseModal = null, modalFrom = null;
  try { ck = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { ck = null; }
  function saveCk(v) { ck = v; try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* без хранилища выбор живёт до закрытия страницы */ } applyCk(); }
  function showBanner(on) { if (!banner) return; banner.classList.toggle('is-open', on); banner.setAttribute('aria-hidden', on ? 'false' : 'true'); }
  function openModal(from) {
    if (!modal) return; modalFrom = from || null; var m = $('#ckMaps'); if (m) m.checked = !!(ck && ck.maps);
    modal.classList.add('is-open'); releaseModal = SekretUI.trap(modal); var b = $('button', modal); if (b) b.focus();
  }
  function closeModal() { if (!modal) return; modal.classList.remove('is-open'); if (releaseModal) releaseModal(); if (modalFrom && modalFrom.focus) modalFrom.focus(); }
  if (banner) {
    showBanner(false);
    if (!ck) setTimeout(function () { showBanner(true); }, 700);
    $$('[data-ck]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-ck');
        if (a === 'accept') { saveCk({ maps: true, t: Date.now() }); showBanner(false); }
        else if (a === 'reject') { saveCk({ maps: false, t: Date.now() }); showBanner(false); }
        else if (a === 'settings') { openModal(b); }
        else if (a === 'save') { saveCk({ maps: $('#ckMaps').checked, t: Date.now() }); closeModal(); showBanner(false); }
        else if (a === 'close') { closeModal(); }
      });
    });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal(); });
    $$('[data-cookie-settings]').forEach(function (b) { b.addEventListener('click', function () { openModal(b); }); });
  }

  /* карта: подключается только по согласию или по нажатию кнопки */
  var mapbox = $('#mapbox'), mapHTML = mapbox ? mapbox.innerHTML : '';
  function loadMap() {
    if (!mapbox || $('iframe', mapbox) || !C.mapEmbed) return;
    mapbox.innerHTML = '<iframe title="Карта: студия «Секрет», Омск, проспект Карла Маркса, 41/1" src="' + C.mapEmbed + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>';
  }
  function unloadMap() { if (mapbox && $('iframe', mapbox)) { mapbox.innerHTML = mapHTML; bindMap(); } }
  function bindMap() { var b = $('#mapLoad'); if (b) b.addEventListener('click', loadMap); }
  function applyCk() { if (!mapbox) return; if (ck && ck.maps) loadMap(); else if (ck && !ck.maps) unloadMap(); }
  bindMap(); applyCk();

  /* форма записи: настоящая отправка — через WhatsApp (или на адрес из config.js) */
  var form = $('#leadForm');
  if (form) {
    var fn = $('#fName'), fp = $('#fPhone'), fa = $('#fAgree'), note = $('#formNote');
    var setErr = function (inp, id, msg) { var e = $(id); e.textContent = msg || ''; if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (inp) inp.setAttribute('aria-describedby', msg ? id.slice(1) : ''); return !msg; };
    var digits = function (s) { return String(s).replace(/\D/g, ''); };
    var okPhone = function (s) { var d = digits(s); return (d.length === 11 && (d[0] === '7' || d[0] === '8')) || (d.length === 10 && d[0] === '9'); };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = setErr(fn, '#eName', fn.value.trim().length < 2 ? 'Введите имя' : '');
      var b = setErr(fp, '#ePhone', okPhone(fp.value) ? '' : 'Введите телефон в формате +7 900 000-00-00');
      var c = setErr(null, '#eAgree', fa.checked ? '' : 'Для отправки нужно согласие на обработку персональных данных');
      if (!(a && b && c)) { var bad = !a ? fn : !b ? fp : fa; bad.focus(); return; }
      var now = new Date(), stamp = now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      var msg = 'Здравствуйте! Меня зовут ' + fn.value.trim() + '. Прошу связаться со мной для записи в студию «Секрет». Телефон: ' + fp.value.trim() +
        '. Согласие на обработку персональных данных дано ' + stamp + '.';
      if (C.formEndpoint) {
        fetch(C.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fn.value.trim(), phone: fp.value.trim(), consent: stamp }) })
          .then(function (r) { note.textContent = r.ok ? 'Заявка отправлена. Мы свяжемся с вами для подтверждения времени.' : 'Не удалось отправить заявку. Напишите нам в WhatsApp или позвоните.'; })
          .catch(function () { note.textContent = 'Не удалось отправить заявку. Напишите нам в WhatsApp или позвоните.'; });
        return;
      }
      window.open('https://wa.me/' + (C.wa || '79136337133') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
      note.textContent = 'Мы открыли WhatsApp с готовым сообщением. Заявка уйдёт, когда вы нажмёте «Отправить» в мессенджере.';
    });
  }
}());
