/* NB Kosmetolog — демо. Без внешних скриптов и cookie. */
(function () {
  "use strict";
  // Настройки: впишите, когда будут реальные данные
  var CONFIG = {
    ENDPOINT: "",   // адрес обработчика заявок (POST JSON). Пусто = демо-режим, заявка не отправляется
    WHATSAPP: ""    // номер в формате 79001234567; пусто = кнопка WhatsApp не показывается
  };

  var doc = document, root = doc.documentElement;
  root.classList.add("js");
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var touch = window.matchMedia("(hover: none)").matches;
  var rub = function (n) { return n.toLocaleString("ru-RU") + " ₽"; };

  /* Красная нить: прогресс прокрутки */
  var ticking = false;
  function progress() {
    var h = root.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    root.style.setProperty("--p", p.toFixed(4));
    ticking = false;
  }
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(progress); }
  }, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  /* Узелки на нити и появление блоков */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    $$(".rv").forEach(function (el) { io.observe(el); });

    var ko = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var k = $(".knot", e.target);
        if (k) k.classList.toggle("on", e.isIntersecting);
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    $$("section").forEach(function (s) { ko.observe(s); });

    // На телефоне вместо наведения красная рамка у фото появляется, когда фото в зоне экрана
    if (touch) {
      var fo = new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.target.classList.toggle("in-view", e.isIntersecting); });
      }, { threshold: 0.5 });
      $$(".frame").forEach(function (f) { fo.observe(f); });
    }
  } else {
    $$(".rv").forEach(function (el) { el.classList.add("in"); });
  }

  /* Меню на телефоне */
  var burger = $(".burger"), menu = $("#menu");
  function setMenu(open) {
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    menu.classList.toggle("open", open);
  }
  if (burger && menu) {
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); }
    });
  }

  /* Прайс-аккордеон и превью (компьютер) */
  var items = $$(".acc-item");
  var previewImgs = $$(".preview img");
  function setPreview(key) {
    previewImgs.forEach(function (im) { im.classList.toggle("on", im.getAttribute("data-key") === key); });
  }
  function toggle(item, force) {
    var btn = $(".acc-btn", item);
    var open = typeof force === "boolean" ? force : !item.classList.contains("open");
    item.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) setPreview(item.getAttribute("data-img"));
  }
  items.forEach(function (item, i) {
    var btn = $(".acc-btn", item);
    btn.addEventListener("click", function () { toggle(item); });
    // Наведение и фокус меняют фото на компьютере
    btn.addEventListener("mouseenter", function () { if (!touch) setPreview(item.getAttribute("data-img")); });
    btn.addEventListener("focus", function () { setPreview(item.getAttribute("data-img")); });
    if (i === 0) toggle(item, true);
  });

  /* Конструктор: «Ваш уход» */
  var tray = [];
  var trayList = $("#tray-list"), trayTotal = $("#tray-total"), trayGo = $("#tray-go"),
      dockSum = $("#dock-sum"), trayNote = $("#tray-note");
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sync() {
    $$(".add").forEach(function (b) {
      var on = tray.some(function (t) { return t.id === b.getAttribute("data-id"); });
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var it = b.closest(".item"); if (it) it.classList.toggle("sel", on);
    });
  }
  function render() {
    var sum = tray.reduce(function (a, t) { return a + t.price; }, 0);
    var hasFrom = tray.some(function (t) { return t.from; });
    if (!tray.length) {
      trayList.innerHTML = '<li class="tray-empty">Пока пусто. Нажмите «+» у процедуры в прайсе выше.</li>';
    } else {
      trayList.innerHTML = tray.map(function (t) {
        return '<li><span class="nm">' + esc(t.name) + (t.label ? "<small>" + esc(t.label) + "</small>" : "") +
          '</span><span>' + (t.from ? "от " : "") + rub(t.price) + '</span>' +
          '<button type="button" class="rm" data-id="' + esc(t.id) + '" aria-label="Убрать: ' + esc(t.name) + '">×</button></li>';
      }).join("");
    }
    trayTotal.textContent = (hasFrom ? "от " : "") + rub(sum);
    trayNote.textContent = hasFrom ? "У части процедур цена «от»: итог может быть выше, точную называем до записи." : "Это ориентир. Итоговую стоимость называем до записи.";
    trayGo.disabled = !tray.length;
    dockSum.innerHTML = tray.length
      ? "Ваш уход: " + tray.length + "<small>" + (hasFrom ? "от " : "") + rub(sum) + "</small>"
      : "Запись на процедуру<small>Калининград</small>";
    sync();
  }
  doc.addEventListener("click", function (e) {
    var add = e.target.closest(".add");
    if (add) {
      var id = add.getAttribute("data-id");
      var idx = tray.findIndex(function (t) { return t.id === id; });
      if (idx > -1) tray.splice(idx, 1);
      else tray.push({ id: id, name: add.getAttribute("data-name"), label: add.getAttribute("data-label") || "",
                       price: +add.getAttribute("data-price"), from: add.getAttribute("data-from") === "1" });
      render(); return;
    }
    var rm = e.target.closest(".rm");
    if (rm) {
      tray = tray.filter(function (t) { return t.id !== rm.getAttribute("data-id"); });
      render();
    }
  });
  trayGo.addEventListener("click", function () {
    var lines = tray.map(function (t) {
      return "• " + t.name + (t.label ? " (" + t.label + ")" : "") + " — " + (t.from ? "от " : "") + rub(t.price);
    });
    var total = tray.reduce(function (a, t) { return a + t.price; }, 0);
    $("#f-comment").value = "Хочу записаться на:\n" + lines.join("\n") + "\nИтого ориентировочно: " + rub(total);
    $("#contact").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    setTimeout(function () { $("#f-name").focus({ preventScroll: true }); }, reduce ? 0 : 600);
  });
  render();

  /* WhatsApp только если задан номер */
  if (CONFIG.WHATSAPP) {
    var wa = $("#wa-row");
    if (wa) { wa.hidden = false; $("a", wa).href = "https://wa.me/" + CONFIG.WHATSAPP; }
  }

  /* Форма */
  var form = $("#lead-form"), msg = $("#f-msg");
  function say(t, cls) { msg.textContent = t; msg.className = "msg " + (cls || ""); }
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#f-name").value.trim(), phone = $("#f-phone").value.trim();
    if (name.length < 2) { say("Укажите имя.", "err"); $("#f-name").focus(); return; }
    if (phone.replace(/\D/g, "").length < 10) { say("Укажите телефон: не меньше 10 цифр.", "err"); $("#f-phone").focus(); return; }
    if (!$("#f-consent").checked) { say("Нужно согласие на обработку персональных данных.", "err"); $("#f-consent").focus(); return; }
    if (!$("#f-age").checked) { say("Подтвердите, что вам есть 18 лет.", "err"); $("#f-age").focus(); return; }
    var payload = { name: name, phone: phone, comment: $("#f-comment").value.trim(),
                    consent: true, consentAt: new Date().toISOString(), consentDoc: "consent.html" };
    if (!CONFIG.ENDPOINT) {
      say("Демо-режим: форма работает, но заявка никуда не отправляется. Подключите обработчик в js/main.js.", "ok");
      return;
    }
    say("Отправляем…", "");
    fetch(CONFIG.ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error(); say("Спасибо! Мы свяжемся с вами, чтобы согласовать время.", "ok"); form.reset(); })
      .catch(function () { say("Не получилось отправить. Попробуйте ещё раз позже.", "err"); });
  });
})();
