/* Formulario de cotización.
   Qué hace en el navegador:
   - Valida y limpia cada campo, con límites de longitud.
   - Trampa para bots (campo oculto) y tiempo mínimo antes de enviar.
   - Pausa entre envíos.
   - Nunca escribe en la página HTML tecleado por el usuario (solo texto).
   - Solo dice "enviado" cuando el servidor respondió bien.
   El servidor (functions/api/contact.js) vuelve a validar todo: lo de aquí
   es comodidad para el visitante, no la protección. Ver docs/SEGURIDAD.md. */
(function () {
  "use strict";

  var form = document.getElementById("cotizacion");
  if (!form) return;
  var cfg = window.JKJ_CONFIG || {};
  var status = document.getElementById("q-status");
  var result = document.getElementById("q-result");
  var resultTitle = document.getElementById("q-result-title");
  var resultBody = document.getElementById("q-result-body");
  var copyBtn = document.getElementById("q-copy");
  var submit = form.querySelector('button[type="submit"]');
  var counter = document.getElementById("q-mensaje-count");
  var loadedAt = Date.now();
  var COOLDOWN = 30000, MIN_FILL = 3000, lastSent = 0;

  var EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[A-Za-z]{2,24}$/;

  // Quita caracteres de control y espacios repetidos; recorta a un máximo.
  function clean(v, max, multiline) {
    v = String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    if (!multiline) v = v.replace(/[\r\n\t]+/g, " ");
    v = v.replace(/[  ]{2,}/g, " ").trim();
    return v.slice(0, max);
  }

  var rules = {
    nombre: function (v) { return v.length < 2 ? "Escribe tu nombre." : ""; },
    correo: function (v) { return !v ? "Escribe tu correo." : EMAIL.test(v) ? "" : "Revisa el correo: parece incompleto."; },
    telefono: function (v) { return !v || /^\+?[0-9 ()\-.]{7,20}$/.test(v) ? "" : "Usa solo números, espacios y +. Ejemplo: 55 1234 5678."; },
    giro: function (v) { return v.length < 2 ? "Dinos a qué se dedica tu negocio." : ""; },
    servicio: function (v) { return v ? "" : "Elige qué te interesa."; },
    mensaje: function (v) { return v.length < 10 ? "Cuéntanos un poco más (mínimo 10 caracteres)." : ""; }
  };
  var limits = { nombre: 80, correo: 120, telefono: 20, giro: 100, servicio: 20, mensaje: 1000 };
  // Las mismas claves que valida el servidor (functions/api/contact.js).
  var SERVICES = { pagina: "Página web", chatbot: "Chatbot para WhatsApp", ambos: "Página web y chatbot", nose: "Aún no lo sé" };

  function field(name) { return form.elements[name]; }
  function errEl(input) { return document.getElementById(input.id + "-err"); }

  function setError(input, msg) {
    var e = errEl(input);
    if (msg) {
      input.setAttribute("aria-invalid", "true");
      if (e) { e.textContent = msg; e.hidden = false; }
    } else {
      input.removeAttribute("aria-invalid");
      if (e) { e.textContent = ""; e.hidden = true; }
    }
  }

  function read() {
    var data = {};
    Object.keys(limits).forEach(function (k) {
      data[k] = clean(field(k).value, limits[k], k === "mensaje");
    });
    if (!Object.prototype.hasOwnProperty.call(SERVICES, data.servicio)) data.servicio = "";
    return data;
  }

  function validate(data) {
    var first = null;
    Object.keys(rules).forEach(function (k) {
      var msg = rules[k](data[k]);
      setError(field(k), msg);
      if (msg && !first) first = field(k);
    });
    var ok = field("acepto");
    var okMsg = ok.checked ? "" : "Necesitamos tu aceptación para poder responderte.";
    setError(ok, okMsg);
    if (okMsg && !first) first = ok;
    return first;
  }

  function say(msg, kind) {
    status.textContent = msg;
    status.classList.toggle("is-ok", kind === "ok");
    status.classList.toggle("is-err", kind === "err");
  }

  function compose(d) {
    return [
      "Solicitud de cotización — JKJ SYSTEMS",
      "",
      "Nombre: " + d.nombre,
      "Correo: " + d.correo,
      "WhatsApp o teléfono: " + (d.telefono || "(no indicado)"),
      "Giro: " + d.giro,
      "Interés: " + SERVICES[d.servicio],
      "",
      d.mensaje
    ].join("\n");
  }

  function showResult(title, body) {
    resultTitle.textContent = title;
    resultBody.textContent = body;
    result.hidden = false;
  }

  // Envía al servidor con el formato que espera functions/api/contact.js.
  // Resuelve con { ok } o rechaza con { kind, fields }.
  function send(d, honeypot) {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    return window.fetch(cfg.formEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        nombre: d.nombre, negocio: d.giro, correo: d.correo, telefono: d.telefono,
        servicio: d.servicio, mensaje: d.mensaje, acepto: true,
        sitio_web: honeypot, elapsed: Date.now() - loadedAt,
        turnstile: captchaToken()
      }),
      credentials: "same-origin",
      referrerPolicy: "strict-origin-when-cross-origin",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      window.clearTimeout(timer);
      if (res.ok) return { ok: true };
      if (res.status === 422) {
        return res.json().then(function (j) { throw { kind: "invalid", fields: (j && j.fields) || {} }; },
                               function () { throw { kind: "invalid", fields: {} }; });
      }
      if (res.status === 429) throw { kind: "rate" };
      if (res.status === 404 || res.status === 405 || res.status === 501 || res.status === 503) throw { kind: "offline" };
      throw { kind: "error" };
    }, function () { window.clearTimeout(timer); throw { kind: "network" }; });
  }

  // El servidor nombra el giro como "negocio".
  var serverField = { nombre: "nombre", negocio: "giro", correo: "correo", telefono: "telefono", servicio: "servicio", mensaje: "mensaje", acepto: "acepto" };

  function demo(text) {
    if (cfg.email && EMAIL.test(cfg.email)) {
      showResult("El envío automático aún no está conectado. Copia este mensaje y mándalo a " + cfg.email + ":", text);
    } else {
      showResult("El envío automático todavía no está conectado, así que no se envió nada. Este es el mensaje que se mandaría:", text);
    }
    say("Tus datos están completos, pero aún no se enviaron.", "err");
  }

  // Cloudflare Turnstile: el widget agrega un campo oculto con un token de un solo uso.
  // El servidor (n8n) debe verificar ese token; aquí solo se envía.
  function hasCaptcha() { return !!form.querySelector(".cf-turnstile"); }
  function captchaToken() {
    var el = form.querySelector('input[name="cf-turnstile-response"]');
    return el && el.value ? String(el.value).slice(0, 2048) : "";
  }
  function resetCaptcha() {
    try { if (window.turnstile && hasCaptcha()) window.turnstile.reset(form.querySelector(".cf-turnstile")); } catch (err) { /* sin widget */ }
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    result.hidden = true;

    // Trampa para bots: un humano no ve ni llena este campo.
    if (field("referencia_interna").value) { say("No pudimos procesar el envío. Escríbenos por los otros medios de contacto.", "err"); return; }

    tried = true;
    var data = read();
    var firstBad = validate(data);
    if (firstBad) { say("Revisa los campos marcados.", "err"); firstBad.focus(); return; }

    // Verificación anti-bots (Cloudflare Turnstile), si el widget está en la página.
    if (hasCaptcha() && !captchaToken()) { say("Completa la verificación de seguridad antes de enviar.", "err"); return; }

    var now = Date.now();
    if (now - loadedAt < MIN_FILL) { say("Un momento… intenta de nuevo en unos segundos.", "err"); return; }
    if (now - lastSent < COOLDOWN) { say("Ya recibimos un envío hace un momento. Espera medio minuto para mandar otro.", "err"); return; }

    var text = compose(data);

    if (!cfg.formEndpoint) { demo(text); return; }

    submit.disabled = true;
    say("Enviando…");
    send(data, "").then(function () {
      lastSent = Date.now();
      resetCaptcha();
      form.reset();
      tried = false;
      updateCount();
      say("Listo. Recibimos tu solicitud y te escribiremos pronto.", "ok");
    }, function (err) {
      resetCaptcha();
      var kind = err && err.kind;
      if (kind === "offline") { demo(text); return; }
      if (kind === "invalid") {
        var first = null;
        Object.keys(err.fields).forEach(function (k) {
          var input = serverField[k] ? field(serverField[k]) : null;
          if (!input) return;
          setError(input, String(err.fields[k]).slice(0, 200));
          if (!first) first = input;
        });
        say("Revisa los campos marcados.", "err");
        if (first) first.focus();
        return;
      }
      if (kind === "rate") { say("Recibimos varios envíos seguidos. Espera unos minutos e inténtalo de nuevo.", "err"); return; }
      say("No se pudo enviar. Revisa tu conexión e inténtalo de nuevo, o escríbenos por otro medio.", "err");
      showResult("Si prefieres, copia tu mensaje y mándalo por correo o redes:", text);
    }).then(function () { submit.disabled = false; });
  });

  // Los errores se muestran al intentar enviar. Después, cada campo se vuelve a
  // revisar mientras se escribe. No se valida al salir del campo: mostrar u
  // ocultar un error en ese momento mueve el botón justo cuando se le da clic.
  var tried = false;
  Object.keys(rules).forEach(function (k) {
    var input = field(k);
    function recheck() {
      if (!tried) return;
      setError(input, rules[k](clean(input.value, limits[k], k === "mensaje")));
    }
    input.addEventListener("input", recheck);
    input.addEventListener("change", recheck);
  });
  field("acepto").addEventListener("change", function () { if (this.checked) setError(this, ""); });

  function updateCount() {
    if (counter) counter.textContent = field("mensaje").value.length + " / " + limits.mensaje;
  }
  field("mensaje").addEventListener("input", updateCount);
  updateCount();

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var txt = resultBody.textContent || "";
      function done(ok) { copyBtn.textContent = ok ? "Copiado" : "Selecciona el texto y cópialo"; window.setTimeout(function () { copyBtn.textContent = "Copiar mensaje"; }, 2400); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
  }

  // El asistente puede prellenar el formulario con lo que el visitante le contó.
  window.JKJ_FORM = {
    prefill: function (d) {
      d = d || {};
      if (d.nombre) field("nombre").value = clean(d.nombre, limits.nombre);
      if (d.correo) field("correo").value = clean(d.correo, limits.correo);
      if (d.giro) field("giro").value = clean(d.giro, limits.giro);
      if (d.servicio && Object.prototype.hasOwnProperty.call(SERVICES, d.servicio)) field("servicio").value = d.servicio;
      if (d.mensaje) { field("mensaje").value = clean(d.mensaje, limits.mensaje, true); updateCount(); }
      say("");
      result.hidden = true;
    },
    focus: function () {
      form.scrollIntoView({ block: "start" });
      var target = field("mensaje").value ? field("acepto") : field("mensaje");
      window.setTimeout(function () { try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); } }, 350);
    }
  };
})();
