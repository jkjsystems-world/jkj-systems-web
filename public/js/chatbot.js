/* Asistente del sitio (chatbot propio).
   - Por defecto responde con las respuestas guardadas abajo (sin servidor).
   - Si config.js trae chatEndpoint, pregunta primero a ese servidor (IA,
     functions/api/chat.js) y, si no está disponible, usa las respuestas guardadas.
   - Todo lo que escribe el visitante se muestra como texto, nunca como HTML.
   - No guarda la conversación ni datos personales en el navegador. */
(function () {
  "use strict";

  var root = document.getElementById("chat");
  var fab = document.getElementById("chat-fab");
  if (!root || !fab) return;
  var cfg = window.JKJ_CONFIG || {};
  var EMAIL = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[A-Za-z]{2,24}$/;
  var MAX_LEN = 500;

  /* ---------- Respuestas guardadas. Edítalas aquí. ---------- */
  var ANSWERS = {
    saludo: "¡Hola! Soy el asistente de JKJ SYSTEMS. Puedo contarte qué hacemos, cómo trabajamos o ayudarte a pedir tu cotización sin costo.",
    servicios: "Hacemos dos cosas: páginas web para negocios y chatbots con IA para el WhatsApp de tu negocio. Se pueden contratar juntos o por separado.",
    web: "Tu página se arma según tu giro y lo que quieras incluir: menú, catálogo, citas, ubicación. Lo que tu cliente busca antes de escribirte.",
    chatbot: "Es un asistente que contesta en el WhatsApp de tu negocio las preguntas de siempre: horarios, precios, disponibilidad. Así tus clientes tienen respuesta aunque estés ocupado.",
    precio: "No manejamos paquetes ni precios fijos, porque un restaurante no necesita lo mismo que un consultorio o un taller. Te mandamos una cotización a la medida: no tiene costo y pedirla no te compromete a nada.",
    proceso: "Trabajamos en tres pasos:\n1. Nos cuentas de tu negocio.\n2. Te mandamos tu cotización, sin costo.\n3. Lo construimos, lo revisas y publicamos cuando lo apruebes.",
    tiempo: "El tiempo depende de lo que necesite tu proyecto. Te lo indicamos en tu cotización.",
    proyectos: "En la sección Proyectos hay tres diseños de muestra: un restaurante, un consultorio y una tienda local. Son demos para que veas cómo podría quedar el tuyo.",
    humano: "Claro. Deja tus datos en el formulario de cotización y te escribe una persona del equipo.",
    gracias: "¡Con gusto! Si quieres, te ayudo a pedir tu cotización.",
    nose: "Esa respuesta no la tengo. Puedo contarte de nuestros servicios o ayudarte a pedir una cotización para que te responda una persona del equipo."
  };

  var INTENTS = [
    { id: "cotizar", words: ["cotiza", "cotizacion", "presupuesto", "contratar", "quiero una pagina", "quiero un chatbot", "me interesa", "empezar"] },
    { id: "precio", words: ["precio", "cuesta", "costo", "cobran", "cuanto", "paquete", "plan", "tarifa", "barato", "caro"] },
    { id: "chatbot", words: ["chatbot", "bot", "whatsapp", "wsp", "asistente", "automatiz", "inteligencia artificial", " ia "] },
    { id: "web", words: ["pagina", "sitio", "web", "landing", "tienda en linea", "dominio", "hosting"] },
    { id: "proceso", words: ["como trabajan", "proceso", "pasos", "como funciona", "como es", "metodo"] },
    { id: "tiempo", words: ["tiempo", "tardan", "tarda", "cuando", "entrega", "dias", "semanas", "rapido"] },
    { id: "proyectos", words: ["proyecto", "portafolio", "ejemplo", "demo", "muestra", "trabajos"] },
    { id: "contacto", words: ["contacto", "correo", "email", "instagram", "facebook", "telefono", "llamar", "escribir", "redes"] },
    { id: "humano", words: ["persona", "humano", "asesor", "alguien", "agente"] },
    { id: "servicios", words: ["servicio", "que hacen", "que ofrecen", "ofrecen", "hacen", "ayuda", "informacion", "info"] },
    { id: "gracias", words: ["gracias", "perfecto", "excelente", "genial", "adios", "hasta luego"] },
    { id: "saludo", words: ["hola", "buenas", "buenos dias", "buen dia", "que tal", "hey"] }
  ];

  var CHIPS_HOME = ["¿Qué hacen?", "¿Cuánto cuesta?", "¿Cómo trabajan?", "Pedir cotización"];
  var CHIPS_SERVICE = ["Página web", "Chatbot para WhatsApp", "Los dos servicios", "Aún no lo sé"];
  var SERVICE_LABEL = { pagina: "Página web", chatbot: "Chatbot para WhatsApp", ambos: "Página web y chatbot", nose: "Aún no lo sé" };

  /* ---------- Utilidades ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clean(v) {
    return String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s{3,}/g, "  ").trim().slice(0, MAX_LEN);
  }
  function norm(v) {
    var s = v.toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    return " " + s.replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
  }
  function detect(text) {
    var s = norm(text), best = null, score = 0;
    INTENTS.forEach(function (it) {
      var n = 0;
      it.words.forEach(function (w) { if (s.indexOf(w) !== -1) n += w.length > 6 ? 2 : 1; });
      if (n > score) { score = n; best = it.id; }
    });
    return best;
  }
  function contactText() {
    var parts = [];
    if (cfg.email && EMAIL.test(cfg.email)) parts.push("Correo: " + cfg.email);
    if (cfg.instagram) parts.push("Instagram: @" + cfg.instagram);
    if (cfg.facebook) parts.push("Facebook: " + cfg.facebook);
    return parts.length
      ? "Puedes escribirnos por aquí:\n" + parts.join("\n") + "\nO deja tus datos en el formulario de cotización."
      : "Puedes escribirnos desde la sección Contacto, o dejar tus datos en el formulario de cotización y te respondemos.";
  }

  /* ---------- Interfaz ---------- */
  var panel, log, chips, form, input, sub, built = false, busy = false, serverUp = true;
  var history = [], lead = null, lastSend = 0;

  function build() {
    panel = el("div", "chat__panel");
    panel.id = "chat-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Asistente de JKJ SYSTEMS");
    panel.hidden = true;

    var head = el("div", "chat__head");
    var titles = el("div");
    titles.appendChild(el("span", "chat__title", "Asistente JKJ"));
    sub = el("span", "chat__sub", "Te ayudamos con tu cotización al instante.");
    titles.appendChild(sub);
    var close = el("button", "chat__close");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar el asistente");
    close.appendChild(icon("M5 5l10 10M15 5L5 15", 20));
    close.addEventListener("click", function () { toggle(false); });
    head.appendChild(titles); head.appendChild(close);

    log = el("div", "chat__log");
    log.setAttribute("role", "log");
    log.setAttribute("aria-live", "polite");
    log.setAttribute("aria-label", "Conversación");

    chips = el("div", "chat__chips");

    form = el("form", "chat__form");
    form.setAttribute("autocomplete", "off");
    var label = el("label", "sr-only", "Escribe tu mensaje");
    label.htmlFor = "chat-input";
    input = el("input", "chat__input");
    input.id = "chat-input"; input.type = "text"; input.maxLength = MAX_LEN;
    input.placeholder = "Escribe tu mensaje";
    input.setAttribute("enterkeyhint", "send");
    var send = el("button", "chat__send");
    send.type = "submit";
    send.setAttribute("aria-label", "Enviar mensaje");
    send.appendChild(icon("M4 10h11M11 5l5 5-5 5", 20));
    form.appendChild(label); form.appendChild(input); form.appendChild(send);
    form.addEventListener("submit", function (e) { e.preventDefault(); submit(input.value); });

    panel.appendChild(head); panel.appendChild(log); panel.appendChild(chips); panel.appendChild(form);
    root.insertBefore(panel, fab);

    panel.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { toggle(false); return; }
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll("button, input, a[href]");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    built = true;
    bot(ANSWERS.saludo);
    setChips(CHIPS_HOME);
  }

  function icon(d, size) {
    var ns = "http://www.w3.org/2000/svg";
    var s = document.createElementNS(ns, "svg");
    s.setAttribute("width", size); s.setAttribute("height", size);
    s.setAttribute("viewBox", "0 0 20 20"); s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    s.appendChild(p);
    return s;
  }

  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function add(text, who) {
    log.appendChild(el("div", "chat__msg chat__msg--" + who, text));
    if (log.children.length > 80) log.removeChild(log.firstChild);
    scrollDown();
  }
  function bot(text) { add(text, "bot"); history.push({ role: "assistant", content: text }); trim(); }
  function user(text) { add(text, "user"); history.push({ role: "user", content: text }); trim(); }
  function trim() { if (history.length > 12) history = history.slice(-12); }

  function setChips(list) {
    chips.textContent = "";
    (list || []).forEach(function (t) {
      var b = el("button", "chat__chip", t);
      b.type = "button";
      b.addEventListener("click", function () { submit(t); });
      chips.appendChild(b);
    });
  }

  function typing(on) {
    var t = log.querySelector(".chat__typing");
    if (on && !t) {
      t = el("div", "chat__typing");
      t.setAttribute("aria-hidden", "true");
      t.appendChild(el("span")); t.appendChild(el("span")); t.appendChild(el("span"));
      log.appendChild(t); scrollDown();
    } else if (!on && t) { log.removeChild(t); }
  }

  /* ---------- Lógica ---------- */
  function submit(raw) {
    var text = clean(raw);
    if (!text || busy) return;
    var now = Date.now();
    if (now - lastSend < 500) return; // evita envíos en ráfaga
    lastSend = now;
    input.value = "";
    user(text);
    setChips([]);
    busy = true;
    typing(true);
    reply(text).then(function (r) {
      typing(false);
      bot(r.text);
      setChips(r.chips);
      if (r.after) r.after();
    }).then(function () { busy = false; });
  }

  function later(value, ms) {
    return new Promise(function (res) { window.setTimeout(function () { res(value); }, ms); });
  }

  function reply(text) {
    if (lead) return later(leadStep(text), 420);
    var intent = detect(text);
    if (intent === "cotizar") { return later(startLead(), 420); }
    if (cfg.chatEndpoint && serverUp) {
      return askServer().then(function (t) {
        if (sub) sub.textContent = "Asistente con IA · puede equivocarse";
        return { text: t, chips: ["Pedir cotización"] };
      }, function (err) {
        // Si el servidor no existe o no tiene llave, no se vuelve a intentar en esta visita.
        if (err && err.offline) serverUp = false;
        return localReply(intent);
      });
    }
    return later(localReply(intent), 420);
  }

  function localReply(intent) {
    if (intent === "contacto") return { text: contactText(), chips: ["Pedir cotización", "¿Qué hacen?"] };
    if (intent && ANSWERS[intent]) {
      var c = intent === "precio" || intent === "web" || intent === "chatbot" || intent === "servicios"
        ? ["Pedir cotización", "¿Cómo trabajan?"]
        : ["¿Qué hacen?", "¿Cuánto cuesta?", "Pedir cotización"];
      return { text: ANSWERS[intent], chips: c };
    }
    return { text: ANSWERS.nose, chips: CHIPS_HOME };
  }

  // Toma de datos para la cotización: llena el formulario, no envía nada.
  function startLead() {
    lead = { step: "nombre", data: {} };
    return { text: "Con gusto te ayudo a pedir tu cotización. Te hago cuatro preguntas y lleno el formulario por ti; tú lo revisas y lo envías.\n\n¿Cómo te llamas?", chips: ["Cancelar"] };
  }

  function leadStep(text) {
    if (/^\s*cancelar\s*$/i.test(text)) { lead = null; return { text: "Listo, lo dejamos aquí. Si quieres retomarlo, escribe «cotización».", chips: CHIPS_HOME }; }
    var d = lead.data;
    if (lead.step === "nombre") {
      if (text.length < 2) return { text: "¿Me dices tu nombre?", chips: ["Cancelar"] };
      d.nombre = text.slice(0, 80); lead.step = "giro";
      return { text: "Gracias, " + d.nombre + ". ¿A qué se dedica tu negocio? (por ejemplo: restaurante, consultorio, taller)", chips: ["Cancelar"] };
    }
    if (lead.step === "giro") {
      if (text.length < 2) return { text: "¿A qué se dedica tu negocio?", chips: ["Cancelar"] };
      d.giro = text.slice(0, 100); lead.step = "servicio";
      return { text: "¿Qué te interesa?", chips: CHIPS_SERVICE };
    }
    if (lead.step === "servicio") {
      var s = norm(text), pick = "nose";
      var w = s.indexOf("pagina") !== -1 || s.indexOf("web") !== -1 || s.indexOf("sitio") !== -1;
      var c = s.indexOf("chatbot") !== -1 || s.indexOf("whatsapp") !== -1 || s.indexOf("bot") !== -1;
      if (w && c || s.indexOf("ambos") !== -1 || s.indexOf("los dos") !== -1) pick = "ambos";
      else if (w) pick = "pagina";
      else if (c) pick = "chatbot";
      d.servicio = pick; lead.step = "correo";
      return { text: "Anotado: " + SERVICE_LABEL[pick] + ". ¿A qué correo te mandamos la cotización?", chips: ["Cancelar"] };
    }
    if (lead.step === "correo") {
      var mail = text.replace(/\s+/g, "");
      if (!EMAIL.test(mail)) return { text: "Ese correo parece incompleto. ¿Me lo escribes de nuevo? (ejemplo: nombre@correo.com)", chips: ["Cancelar"] };
      d.correo = mail.slice(0, 120);
      var data = { nombre: d.nombre, correo: d.correo, giro: d.giro, servicio: d.servicio };
      lead = null;
      return {
        text: "Listo. Llené el formulario con tus datos. Solo falta que nos cuentes qué necesitas, aceptes el aviso de privacidad y presiones «Enviar solicitud».",
        chips: [],
        after: function () {
          if (window.JKJ_FORM) { window.JKJ_FORM.prefill(data); }
          window.setTimeout(function () { toggle(false); if (window.JKJ_FORM) window.JKJ_FORM.focus(); }, 1400);
        }
      };
    }
    lead = null;
    return localReply(null);
  }

  // Asistente con IA: el servidor guarda la llave y llama al modelo.
  // Se manda la conversación reciente; el último mensaje siempre es del visitante.
  function askServer() {
    var ctrl = "AbortController" in window ? new AbortController() : null;
    var timer = window.setTimeout(function () { if (ctrl) ctrl.abort(); }, 16000);
    var messages = history.slice(-9).map(function (m) { return { role: m.role, content: m.content.slice(0, m.role === "user" ? 500 : 2000) }; });
    return window.fetch(cfg.chatEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ messages: messages }),
      credentials: "same-origin",
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      window.clearTimeout(timer);
      if (!res.ok) {
        var e = new Error("status " + res.status);
        e.offline = res.status === 404 || res.status === 405 || res.status === 501 || res.status === 503;
        throw e;
      }
      return res.json();
    }, function (err) { window.clearTimeout(timer); throw err; }).then(function (j) {
      var t = j && typeof j.reply === "string" ? clean1200(j.reply) : "";
      if (!t) throw new Error("empty");
      return t;
    });
  }
  function clean1200(v) {
    return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 1200);
  }

  /* ---------- Abrir y cerrar ---------- */
  function fit() {
    if (!panel || panel.hidden) return;
    var vv = window.visualViewport;
    panel.style.setProperty("--chat-h", (vv ? vv.height : window.innerHeight) + "px");
  }

  function toggle(open) {
    if (!built) build();
    if (open == null) open = panel.hidden;
    panel.hidden = !open;
    root.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("chat-lock", open);
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      fit();
      scrollDown();
      // En móvil no se abre el teclado solo; en escritorio sí se enfoca el campo.
      if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) input.focus();
      else panel.querySelector(".chat__close").focus();
    } else {
      fab.focus();
    }
  }

  fab.addEventListener("click", function () { toggle(); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fit);
    window.visualViewport.addEventListener("scroll", fit);
  }
  window.addEventListener("resize", fit);

  window.JKJ_CHAT = { open: function () { toggle(true); }, close: function () { toggle(false); } };
})();
