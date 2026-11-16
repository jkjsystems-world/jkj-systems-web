/* Arranque general: menú móvil, datos de contacto, año y pequeños detalles. */
(function () {
  "use strict";

  var cfg = window.JKJ_CONFIG || {};
  var header = document.getElementById("header");
  var toggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("nav");

  /* Menú móvil */
  function setNav(open) {
    if (!header || !toggle) return;
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    var sr = toggle.querySelector(".sr-only");
    if (sr) sr.textContent = open ? "Cerrar menú" : "Abrir menú";
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setNav(!header.classList.contains("nav-open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("nav-open")) { setNav(false); toggle.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (header.classList.contains("nav-open") && !header.contains(e.target)) setNav(false);
    });
  }

  /* Año del pie */
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* Datos de contacto desde js/config.js. Se validan antes de usarlos en un enlace. */
  var EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[A-Za-z]{2,24}$/;
  var HANDLE = /^[A-Za-z0-9._-]{1,60}$/;
  function wire(kind, ok, href, label, external) {
    var row = document.querySelector('[data-contact="' + kind + '"]');
    if (!row || !ok) return;
    var value = row.querySelector("[data-contact-value]");
    row.setAttribute("href", href);
    if (value) value.textContent = label;
    if (external) { row.setAttribute("target", "_blank"); row.setAttribute("rel", "noopener noreferrer"); }
  }
  wire("email", cfg.email && EMAIL.test(cfg.email), "mailto:" + cfg.email, cfg.email, false);
  wire("instagram", cfg.instagram && HANDLE.test(cfg.instagram), "https://www.instagram.com/" + encodeURIComponent(cfg.instagram || "") + "/", "@" + cfg.instagram, true);
  wire("facebook", cfg.facebook && HANDLE.test(cfg.facebook), "https://www.facebook.com/" + encodeURIComponent(cfg.facebook || ""), cfg.facebook, true);

  /* En pantallas chicas, el botón del asistente se aparta mientras se llena el formulario. */
  var quote = document.getElementById("cotizacion");
  var chat = document.getElementById("chat");
  if (quote && chat) {
    quote.addEventListener("focusin", function () {
      if (window.matchMedia && window.matchMedia("(max-width: 760px)").matches) chat.classList.add("is-away");
    });
    quote.addEventListener("focusout", function () { chat.classList.remove("is-away"); });
  }

  /* La conversación de ejemplo aparece cuando entra en pantalla. */
  var convo = document.querySelector("[data-convo]");
  if (convo) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { convo.classList.add("is-play"); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(convo);
    }
  }
})();
