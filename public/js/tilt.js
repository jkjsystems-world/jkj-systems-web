/* Inclinación 3D de tarjetas y títulos.
   - Con ratón: la tarjeta sigue al puntero y muestra un reflejo.
   - En cualquier dispositivo: se inclina muy poco según su posición al hacer scroll.
   Solo escribe variables CSS; el aspecto vive en css/styles.css. */
(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Números con grosor (1, 2, 3): capas apiladas hacia atrás.
  Array.prototype.forEach.call(document.querySelectorAll(".num3d[data-num]"), function (el) {
    var n = el.getAttribute("data-num");
    if (!/^[0-9]{1,2}$/.test(n)) return;
    el.textContent = "";
    for (var i = 8; i >= 1; i--) {
      var s = document.createElement("span");
      s.className = "num3d__layer";
      s.textContent = n;
      var k = 1 - i / 9;
      s.style.color = "rgb(" + Math.round(22 + 60 * k) + "," + Math.round(60 + 90 * k) + "," + Math.round(44 + 70 * k) + ")";
      s.style.translate = "0 0 " + (-i * 2.4).toFixed(1) + "px";
      el.appendChild(s);
    }
    var front = document.createElement("span");
    front.className = "num3d__layer";
    front.textContent = n;
    el.appendChild(front);
  });

  if (reduce) return;

  var items = Array.prototype.map.call(document.querySelectorAll(".tilt[data-tilt]"), function (el) {
    return { el: el, max: parseFloat(el.getAttribute("data-tilt")) || 8, rx: 0, ry: 0, g: 0, inside: false, vis: true };
  });
  if (!items.length) return;

  var px = 0, py = 0, hasPtr = false, running = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        for (var i = 0; i < items.length; i++) {
          if (items[i].el === en.target) {
            items[i].vis = en.isIntersecting;
            en.target.classList.toggle("is-live", en.isIntersecting);
          }
        }
      });
      kick();
    }, { rootMargin: "200px" });
    items.forEach(function (it) { io.observe(it.el); });
  }

  function tick() {
    var vh = window.innerHeight || 800, active = false;
    for (var i = 0; i < items.length; i++) {
      var T = items[i];
      if (!T.vis) continue;
      var r = T.el.getBoundingClientRect();
      var m = T.inside ? 10 : 0;
      var inside = fine && hasPtr && px >= r.left - m && px <= r.right + m && py >= r.top - m && py <= r.bottom + m;
      T.inside = inside;
      var sc = clamp((r.top + r.height / 2 - vh / 2) / (vh / 2), -1, 1) * (fine ? 3.2 : 2.2);
      var nx = 0, ny = 0, gy = 0, gx = sc;
      if (inside) {
        nx = clamp((px - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
        ny = clamp((py - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
        gy = nx * T.max;
        gx = -ny * T.max + sc;
      }
      var dy = gy - T.ry, dx = gx - T.rx, dg = (inside ? 1 : 0) - T.g;
      T.ry += dy * 0.14; T.rx += dx * 0.14; T.g += dg * 0.15;
      if (Math.abs(dy) > 0.02 || Math.abs(dx) > 0.02 || Math.abs(dg) > 0.01) active = true;
      var st = T.el.style;
      st.setProperty("--rx", T.rx.toFixed(2) + "deg");
      st.setProperty("--ry", T.ry.toFixed(2) + "deg");
      st.setProperty("--sx", (-T.ry * 1.4).toFixed(1));
      st.setProperty("--sy", (T.rx * 1.4).toFixed(1));
      st.setProperty("--glare", T.g.toFixed(3));
      if (inside) {
        st.setProperty("--gx", (50 + nx * 50).toFixed(1) + "%");
        st.setProperty("--gy", (50 + ny * 50).toFixed(1) + "%");
      }
    }
    if (active) window.requestAnimationFrame(tick); else running = false;
  }

  function kick() {
    if (running) return;
    running = true;
    window.requestAnimationFrame(tick);
  }

  if (fine) {
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      px = e.clientX; py = e.clientY; hasPtr = true; kick();
    }, { passive: true });
    document.addEventListener("mouseleave", function () { hasPtr = false; kick(); });
  }
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  kick();
})();
