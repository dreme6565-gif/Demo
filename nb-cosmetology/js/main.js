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
  var tray = [], prevIds = {};
  var trayList = $("#tray-list"), trayTotal = $("#tray-total"), trayGo = $("#tray-go"), traySave = $("#tray-save"),
      dockSum = $("#dock-sum"), trayNote = $("#tray-note"), navCnt = $("#nav-cnt"), badgeSum = $("#badge-sum"),
      rcDate = $("#rc-date"), rcNo = $("#rc-no");
  (function () {
    var d = new Date();
    rcDate.textContent = d.toLocaleDateString("ru-RU") + "  " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
    rcNo.textContent = String(Math.floor(Math.random() * 9000) + 1000);
  })();
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
      trayList.innerHTML = '<li class="tray-empty">Чек пока пуст. Нажмите «+» у процедуры или выберите готовый набор.</li>';
    } else {
      var fresh = 0;
      trayList.innerHTML = tray.map(function (t) {
        var cls = prevIds[t.id] ? "" : ' class="print" style="--pd:' + (fresh++ * 0.13).toFixed(2) + 's"';
        return '<li' + cls + '><span class="nm">' + esc(t.name) + (t.label ? "<small>" + esc(t.label) + "</small>" : "") +
          '</span><span class="dots"></span><span>' + (t.from ? "от " : "") + rub(t.price) + '</span>' +
          '<button type="button" class="rm" data-id="' + esc(t.id) + '" aria-label="Убрать: ' + esc(t.name) + '">×</button></li>';
      }).join("");
    }
    prevIds = {}; tray.forEach(function (t) { prevIds[t.id] = 1; });
    trayTotal.textContent = (hasFrom ? "от " : "") + rub(sum);
    trayNote.textContent = hasFrom ? "У части процедур цена «от»: итог может быть выше, точную называем до записи." : "Это ориентир: точную стоимость называем до записи.";
    trayGo.disabled = !tray.length; traySave.disabled = !tray.length;
    dockSum.innerHTML = tray.length
      ? "Ваш уход: " + tray.length + "<small>" + (hasFrom ? "от " : "") + rub(sum) + "</small>"
      : "Запись на процедуру<small>Калининград</small>";
    navCnt.textContent = tray.length ? String(tray.length) : "";
    badgeSum.textContent = (hasFrom && tray.length ? "от " : "") + rub(sum);
    sync();
  }
  function bump(el) { if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  function pulseThread() {
    var tb = $(".thread b"); if (!tb || reduce) return;
    tb.classList.remove("pulse"); void tb.offsetWidth; tb.classList.add("pulse");
  }
  /* Красная капля летит в корзину: на телефоне в нижнюю панель, на компьютере в пункт меню */
  function fly(from) {
    if (reduce || !from.animate) return;
    var dock = $(".dock"), dockOn = dock && getComputedStyle(dock).display !== "none";
    var target = dockOn ? dock : $('.nav a[href$="#tray"]');
    if (!target) return;
    var a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    var x1 = b.left + (dockOn ? 60 : b.width / 2), y1 = b.top + b.height / 2;
    var d = doc.createElement("div"); d.className = "fly"; doc.body.appendChild(d);
    var an = d.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(1)" },
      { transform: "translate(" + (x0 + (x1 - x0) * .5) + "px," + (y0 + (y1 - y0) * .5 - 70) + "px) scale(1.25)", offset: .5 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(.35)", opacity: .5 }
    ], { duration: 650, easing: "cubic-bezier(.45,0,.75,.55)" });
    an.onfinish = function () { d.remove(); bump(target); pulseThread(); };
  }
  /* Подсказка у первого «+» */
  var hintBtn = $("#p-inject .add");
  if (hintBtn) {
    hintBtn.classList.add("hint");
    var hl = $(".l", hintBtn.closest(".var")); if (hl) { hl.textContent = "Попробуйте: нажмите +"; hl.classList.add("tip"); }
  }
  function clearHint() {
    if (!hintBtn) return;
    hintBtn.classList.remove("hint");
    var hl = $(".l", hintBtn.closest(".var")); if (hl) { hl.textContent = ""; hl.classList.remove("tip"); }
    hintBtn = null;
  }
  doc.addEventListener("click", function (e) {
    var add = e.target.closest(".add");
    if (add) {
      var id = add.getAttribute("data-id");
      var idx = tray.findIndex(function (t) { return t.id === id; });
      clearHint();
      if (idx > -1) tray.splice(idx, 1);
      else {
        tray.push({ id: id, name: add.getAttribute("data-name"), label: add.getAttribute("data-label") || "",
                    price: +add.getAttribute("data-price"), from: add.getAttribute("data-from") === "1" });
        fly(add);
        if (touch && navigator.vibrate) navigator.vibrate(12);
      }
      render(); return;
    }
    var rm = e.target.closest(".rm");
    if (rm) {
      tray = tray.filter(function (t) { return t.id !== rm.getAttribute("data-id"); });
      render();
    }
  });
  /* Готовые наборы */
  var SETS = {
    reset: ["clean-0-0-0", "peel-0-1-0", "care-0-1-0"],
    holiday: ["clean-0-2-0", "care-0-7-0", "massage-0-1-0"],
    lift: ["hw-0-0-0", "massage-0-3-0", "care-0-4-0"]
  };
  $$(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      var ids = SETS[c.getAttribute("data-set")] || [];
      tray = ids.map(function (id) {
        var b = $('.add[data-id="' + id + '"]');
        return b ? { id: id, name: b.getAttribute("data-name"), label: b.getAttribute("data-label") || "",
                     price: +b.getAttribute("data-price"), from: b.getAttribute("data-from") === "1" } : null;
      }).filter(Boolean);
      prevIds = {}; clearHint(); render(); pulseThread();
      if (touch && navigator.vibrate) navigator.vibrate(12);
    });
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
  /* Сохранить чек картинкой */
  traySave.addEventListener("click", function () {
    if (!tray.length) return;
    var W = 640, pad = 40, lh = 32, k = 2, mono = "ui-monospace,Menlo,Consolas,monospace";
    var H = 250 + tray.length * lh + 120;
    var c = doc.createElement("canvas"); c.width = W * k; c.height = H * k;
    var g = c.getContext("2d"); g.scale(k, k);
    g.fillStyle = "#EFE7E1"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#FCFAF7"; g.fillRect(18, 18, W - 36, H - 36);
    g.fillStyle = "#1d1d1d"; g.textAlign = "center";
    g.font = "600 24px " + mono; g.fillText("NB KOSMETOLOG", W / 2, 80);
    g.font = "15px " + mono; g.fillStyle = "#6b6a67"; g.fillText(rcDate.textContent + "   ЧЕК № " + rcNo.textContent, W / 2, 110);
    function dash(y) { g.strokeStyle = "#9b958f"; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke(); g.setLineDash([]); }
    dash(132);
    g.textAlign = "left"; g.fillStyle = "#1d1d1d"; g.font = "16px " + mono;
    var y = 168;
    tray.forEach(function (t) {
      var nm = t.name + (t.label ? " (" + t.label + ")" : ""), pr = (t.from ? "от " : "") + rub(t.price);
      var maxW = W - pad * 2 - g.measureText(pr).width - 16;
      while (g.measureText(nm).width > maxW && nm.length > 4) nm = nm.slice(0, -2);
      if (nm !== t.name + (t.label ? " (" + t.label + ")" : "")) nm += "…";
      g.textAlign = "left"; g.fillText(nm, pad, y);
      g.textAlign = "right"; g.fillText(pr, W - pad, y);
      y += lh;
    });
    dash(y - 12);
    var sum = tray.reduce(function (a, t) { return a + t.price; }, 0);
    var hasFrom = tray.some(function (t) { return t.from; });
    g.font = "600 22px " + mono; g.textAlign = "left"; g.fillText("ИТОГО", pad, y + 24);
    g.textAlign = "right"; g.fillText((hasFrom ? "от " : "") + rub(sum), W - pad, y + 24);
    g.textAlign = "center"; g.font = "14px " + mono; g.fillStyle = "#6b6a67";
    g.fillText("СПАСИБО ЗА ВИЗИТ!", W / 2, y + 74);
    c.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob), a = doc.createElement("a");
      a.href = url; a.download = "chek-nb-kosmetolog.png"; doc.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, "image/png");
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
      var txt = "Новая заявка с сайта\nИмя: " + name + "\nТелефон: " + phone + (payload.comment ? "\n" + payload.comment : "");
      $("#wa-prev").textContent = txt;
      say("", "");
      form.classList.add("done"); $("#sent").classList.add("on");
      return;
    }
    say("Отправляем…", "");
    fetch(CONFIG.ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error(); say("Спасибо! Мы свяжемся с вами, чтобы согласовать время.", "ok"); form.reset(); })
      .catch(function () { say("Не получилось отправить. Попробуйте ещё раз позже.", "err"); });
  });

  var again = $("#again");
  if (again) again.addEventListener("click", function () { form.classList.remove("done"); $("#sent").classList.remove("on"); form.reset(); $("#f-name").focus(); });

  /* Заголовок по словам и красная линия под «красивой» */
  var h1 = $("#h1");
  if (h1 && !reduce) {
    var wi = 0, frag = doc.createDocumentFragment();
    var wordSpan = function (t) {
      var w = doc.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
      var i = doc.createElement("span"); i.className = "wi"; i.style.setProperty("--i", wi++); i.textContent = t;
      w.appendChild(i); return w;
    };
    h1.setAttribute("aria-label", h1.textContent);
    Array.prototype.slice.call(h1.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/\s+/).filter(Boolean).forEach(function (t) { frag.appendChild(wordSpan(t)); frag.appendChild(doc.createTextNode(" ")); });
      } else if (n.nodeName === "EM") {
        var em = doc.createElement("em"); em.appendChild(wordSpan(n.textContent));
        em.insertAdjacentHTML("beforeend", '<svg class="u" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true"><path d="M2 5 C 25 1, 60 8, 98 3" pathLength="1"/></svg>');
        frag.appendChild(em);
      }
    });
    h1.textContent = ""; h1.appendChild(frag);
    setTimeout(function () { h1.classList.add("go"); }, 150);
  }

  /* Красное пятно: за курсором на компьютере, за пальцем на телефоне. Фон смещается от мыши и от прокрутки */
  var spot = $(".spot"), fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches, spt = 0;
  function onPtr(e) {
    if (reduce || !spot) return;
    spot.style.transform = "translate3d(" + e.clientX + "px," + e.clientY + "px,0)";
    spot.classList.add("on");
    if (fine) {
      root.style.setProperty("--mx", ((e.clientX / innerWidth - .5) * -40).toFixed(1));
      root.style.setProperty("--my", ((e.clientY / innerHeight - .5) * -40).toFixed(1));
    } else { clearTimeout(spt); spt = setTimeout(function () { spot.classList.remove("on"); }, 800); }
  }
  doc.addEventListener("pointermove", onPtr, { passive: true });
  doc.addEventListener("pointerdown", onPtr, { passive: true });
  root.addEventListener("mouseleave", function () { if (spot) spot.classList.remove("on"); });

  /* Параллакс предметов при прокрутке (телефон и компьютер) */
  var objs = $$(".obj"), pt = false;
  function par() {
    pt = false; var vh = window.innerHeight;
    objs.forEach(function (o) {
      var r = o.parentNode.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      var dy = (r.top + r.height / 2 - vh / 2) * (parseFloat(o.getAttribute("data-speed")) || 0);
      o.style.setProperty("--py", dy.toFixed(1) + "px");
    });
  }
  if (!reduce && objs.length) {
    window.addEventListener("scroll", function () { if (!pt) { pt = true; requestAnimationFrame(par); } }, { passive: true });
    window.addEventListener("resize", par); par();
  }
})();
