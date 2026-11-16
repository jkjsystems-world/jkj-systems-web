/* Fondo: red de partículas en 3D que cubre toda la página.
   Canvas 2D con proyección en perspectiva propia; sin librerías externas. */
(function () {
  "use strict";

  var canvas = document.getElementById("net");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;

  var RGB = "159,227,177";
  var BUCKETS = 6;
  var W = 0, H = 0, dpr = 1;
  var nodes = [], pairs = [], pulses = [];
  var px = 0, py = 0, sx = 0, sy = 0, scrollY = 0;
  var raf = 0, running = false, last = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function build() {
    var area = W * H;
    var count = Math.round(clamp(area / 11500, 40, coarse ? 70 : 150));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({ x: rand(-1.45, 1.45), y: rand(-1.25, 1.25), z: rand(-1, 1), s: rand(0.00025, 0.0007), p: rand(0, 6.283) });
    }
    pairs = [];
    var maxD = count > 90 ? 0.58 : 0.72;
    for (var a = 0; a < count; a++) {
      for (var b = a + 1; b < count; b++) {
        var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y, dz = nodes[a].z - nodes[b].z;
        var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < maxD) pairs.push([a, b, d / maxD]);
      }
    }
    pulses = [];
    var np = reduce ? 0 : Math.min(coarse ? 4 : 9, Math.floor(pairs.length / 12));
    for (var k = 0; k < np; k++) pulses.push(newPulse());
  }

  function newPulse() {
    return { pair: Math.floor(Math.random() * pairs.length), t: Math.random(), v: rand(0.00025, 0.0006) };
  }

  function resize() {
    var w = document.documentElement.clientWidth || window.innerWidth;
    var h = Math.max(window.innerHeight, canvas.clientHeight || 0);
    var d = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    if (w === W && Math.abs(h - H) < 90 && d === dpr) return; // ignora la barra de direcciones en móvil
    var rebuild = Math.abs(w * h - W * H) > 60000 || !nodes.length;
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (rebuild) build();
    if (!running) draw(last || 0);
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var ay = t * 0.00006 + sx * 0.35 + scrollY * 0.00045;
    var ax = sy * 0.2 + Math.sin(t * 0.00018) * 0.07 + scrollY * 0.00012;
    var cy = Math.cos(ay), syr = Math.sin(ay), cx = Math.cos(ax), sxr = Math.sin(ax);
    var span = Math.max(W, H) * 0.6;
    var ox = W * 0.5, oy = H * 0.5;
    var n = nodes.length, P = new Array(n);

    for (var i = 0; i < n; i++) {
      var nd = nodes[i];
      var x = nd.x + Math.sin(t * nd.s + nd.p) * 0.035;
      var y = nd.y + Math.cos(t * nd.s + nd.p) * 0.035;
      var x1 = x * cy + nd.z * syr;
      var z1 = -x * syr + nd.z * cy;
      var y2 = y * cx - z1 * sxr;
      var z2 = y * sxr + z1 * cx;
      var k = 2.6 / (2.6 + z2);
      P[i] = { x: ox + x1 * span * k, y: oy + y2 * span * k, k: k };
    }

    // Líneas agrupadas por opacidad para dibujar pocas veces.
    var paths = [];
    for (var b = 0; b < BUCKETS; b++) paths.push([]);
    for (var j = 0; j < pairs.length; j++) {
      var pr = pairs[j], A = P[pr[0]], B = P[pr[1]];
      var depth = clamp((A.k + B.k) / 2 - 0.62, 0, 1);
      var al = (1 - pr[2]) * (0.3 + depth * 1.1);
      var bi = Math.min(BUCKETS - 1, Math.floor(al * BUCKETS));
      if (al > 0.04) paths[bi].push(A, B);
    }
    ctx.lineWidth = 1;
    for (var q = 0; q < BUCKETS; q++) {
      var list = paths[q];
      if (!list.length) continue;
      ctx.strokeStyle = "rgba(" + RGB + "," + (0.07 + (q / BUCKETS) * 0.42).toFixed(3) + ")";
      ctx.beginPath();
      for (var m = 0; m < list.length; m += 2) { ctx.moveTo(list[m].x, list[m].y); ctx.lineTo(list[m + 1].x, list[m + 1].y); }
      ctx.stroke();
    }

    for (var c = 0; c < n; c++) {
      var p = P[c];
      var a2 = clamp(0.3 + (p.k - 0.62) * 1.6, 0.14, 0.95);
      ctx.fillStyle = "rgba(" + RGB + "," + a2.toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.9 + 2 * p.k * p.k, 0, 6.283);
      ctx.fill();
    }

    // Pulsos de datos que recorren las conexiones.
    for (var u = 0; u < pulses.length; u++) {
      var pu = pulses[u], pp = pairs[pu.pair];
      if (!pp) continue;
      var S = P[pp[0]], E = P[pp[1]];
      var ex = S.x + (E.x - S.x) * pu.t, ey = S.y + (E.y - S.y) * pu.t;
      var fade = Math.sin(pu.t * Math.PI);
      ctx.fillStyle = "rgba(214,250,224," + (0.85 * fade).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, 6.283); ctx.fill();
      ctx.fillStyle = "rgba(" + RGB + "," + (0.16 * fade).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 6.283); ctx.fill();
    }
  }

  function frame(t) {
    if (!running) return;
    var dt = last ? Math.min(60, t - last) : 16;
    last = t;
    sx += (px - sx) * 0.05;
    sy += (py - sy) * 0.05;
    for (var u = 0; u < pulses.length; u++) {
      pulses[u].t += pulses[u].v * dt;
      if (pulses[u].t >= 1) pulses[u] = newPulse(), pulses[u].t = 0;
    }
    draw(t);
    raf = window.requestAnimationFrame(frame);
  }

  function start() { if (running || reduce) return; running = true; last = 0; raf = window.requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    px = (e.clientX / (W || 1)) * 2 - 1;
    py = (e.clientY / (H || 1)) * 2 - 1;
  }, { passive: true });
  window.addEventListener("scroll", function () {
    scrollY = window.pageYOffset || 0;
    if (reduce) draw(0);
  }, { passive: true });

  var rt = 0;
  window.addEventListener("resize", function () { window.clearTimeout(rt); rt = window.setTimeout(resize, 120); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  resize();
  if (reduce) draw(0); else start();
})();
