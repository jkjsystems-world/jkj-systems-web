/* Logotipo 3D del inicio.
   Toma las dos imágenes del logo (ojo y nombre), les da grosor apilando
   capas sombreadas y las gira en 3D según el puntero, el arrastre con el
   dedo y un vaivén suave. Canvas 2D, sin librerías externas. */
(function () {
  "use strict";

  var stage = document.querySelector("[data-logo]");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var imgEye = stage.querySelector(".logo-fallback--emblem");
  var imgWord = stage.querySelector(".logo-fallback--word");
  if (!canvas || !canvas.getContext || !imgEye || !imgWord) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  var shadow = stage.parentElement ? stage.parentElement.querySelector(".logo-shadow") : null;

  var SHADES = ["#081A13", "#0F2A1F", "#173B2C", "#205039", "#2C6A4B", "#3B8760"];
  var LAYERS = coarse ? 14 : 28;
  var W = 0, H = 0, dpr = 1;
  var groups = [];
  var rx = 0, ry = 0, tx = 0, ty = 0, hasPtr = false, drag = null, dragRy = 0, dragRx = 0;
  var raf = 0, running = false, visible = true, t0 = 0;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }

  function tinted(src, color, w, ratio) {
    var c = document.createElement("canvas");
    c.width = w; c.height = Math.max(1, Math.round(w * ratio));
    var g = c.getContext("2d");
    g.drawImage(src, 0, 0, c.width, c.height);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // El lema se dibuja como texto (nítido a cualquier tamaño) en un lienzo aparte.
  function taglineCanvas() {
    var text = "INNOVATION TECHNOLOGIES";
    var c = document.createElement("canvas");
    c.width = 1400; c.height = 96;
    var g = c.getContext("2d");
    var size = 70;
    g.font = '600 ' + size + 'px "Montserrat", system-ui, sans-serif';
    g.textBaseline = "alphabetic";
    var widths = [], total = 0, i;
    for (i = 0; i < text.length; i++) { widths.push(g.measureText(text[i]).width); total += widths[i]; }
    var track = (c.width - 8 - total) / (text.length - 1);
    if (track < 0) { track = 0; }
    var grad = g.createLinearGradient(0, 0, c.width, 0);
    grad.addColorStop(0, "#9BDDB0");
    grad.addColorStop(0.55, "#93C9AE");
    grad.addColorStop(1, "#95B6BF");
    g.fillStyle = grad;
    var x = 4;
    for (i = 0; i < text.length; i++) { g.fillText(text[i], x, 74); x += widths[i] + track; }
    return c;
  }

  function prepare() {
    var side = coarse ? 520 : 760;
    var tag = taglineCanvas();
    groups = [
      // lema y nombre: atrás; el ojo flota un poco al frente
      { src: tag, nw: tag.width, nh: tag.height, w: 0.80, cy: 0.510, z: 0, depth: 0.2 },
      { src: imgWord, nw: imgWord.naturalWidth, nh: imgWord.naturalHeight, w: 0.80, cy: 0.2527, z: 0, depth: 0.8 },
      { src: imgEye, nw: imgEye.naturalWidth, nh: imgEye.naturalHeight, w: 0.92, cy: -0.258, z: 0.085, depth: 1 }
    ];
    groups.forEach(function (g) {
      g.ratio = g.nh / g.nw;
      g.sides = SHADES.map(function (c) { return tinted(g.src, c, Math.min(side, g.nw), g.ratio); });
    });
  }

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    var d = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 2);
    if (w === W && h === H && d === dpr) return;
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (!running) draw(performance.now());
  }

  function draw(now) {
    var t = now - t0;
    var intro = reduce ? 1 : easeOut(clamp(t / 1500, 0, 1));
    var bob = reduce ? 0 : Math.sin(now * 0.0009) * W * 0.014;
    var a = Math.cos(ry), sinY = Math.sin(ry), dd = Math.cos(rx), sinX = Math.sin(rx);
    var b = sinY * sinX;
    var thick = W * 0.078 * intro;
    var cx = W / 2, cy = H / 2 + bob + (1 - intro) * W * 0.05;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = clamp(intro * 2.2, 0, 1);

    for (var gi = 0; gi < groups.length; gi++) {
      var g = groups[gi];
      var w = W * g.w, h = w * g.ratio;
      var x = -w / 2, y = g.cy * W - h / 2;
      var zf = g.z * W * intro;
      var n = Math.max(3, Math.round(LAYERS * g.depth));
      for (var i = n; i >= 1; i--) {
        var z = zf - thick * g.depth * (i / n);
        var shade = g.sides[Math.min(SHADES.length - 1, Math.floor((1 - i / n) * SHADES.length))];
        ctx.setTransform(dpr * a, dpr * b, 0, dpr * dd, dpr * (cx + z * sinY), dpr * (cy - z * a * sinX));
        ctx.drawImage(shade, x, y, w, h);
      }
      ctx.setTransform(dpr * a, dpr * b, 0, dpr * dd, dpr * (cx + zf * sinY), dpr * (cy - zf * a * sinX));
      ctx.drawImage(g.src, x, y, w, h);
    }

    // Luz: una franja de brillo que cruza el logo al girar.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-atop";
    var pos = 0.5 + ry * 1.25 + (reduce ? 0 : Math.sin(now * 0.0005) * 0.12);
    var gx = pos * W;
    var grad = ctx.createLinearGradient(gx - W * 0.42, 0, gx + W * 0.42, H * 0.55);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(236,255,242," + (0.26 + Math.abs(rx) * 0.2).toFixed(3) + ")");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Sombra suave en el lado que se aleja de la luz.
    var dark = ctx.createLinearGradient(0, 0, W, 0);
    var da = clamp(Math.abs(ry) * 0.42, 0, 0.3).toFixed(3);
    dark.addColorStop(ry > 0 ? 0 : 1, "rgba(4,12,9," + da + ")");
    dark.addColorStop(ry > 0 ? 0.6 : 0.4, "rgba(4,12,9,0)");
    dark.addColorStop(ry > 0 ? 1 : 0, "rgba(4,12,9,0)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";

    if (shadow) {
      shadow.style.setProperty("--shx", (-ry * 46).toFixed(1) + "px");
      shadow.style.setProperty("--shs", (1 - Math.abs(ry) * 0.3).toFixed(3));
    }
  }

  function frame(now) {
    if (!running) return;
    var t = now - t0;
    var introSpin = (1 - easeOut(clamp(t / 1500, 0, 1))) * -0.85;
    var idleY = Math.sin(now * 0.0006) * 0.13, idleX = Math.sin(now * 0.0008 + 1) * 0.06;
    var gy, gxr;
    if (drag) { gy = dragRy; gxr = dragRx; }
    else if (hasPtr) { gy = tx * 0.5 + idleY; gxr = -ty * 0.32 + idleX; }
    else { gy = idleY * 1.7; gxr = idleX * 1.4 + 0.04; }
    ry += (gy + introSpin - ry) * 0.09;
    rx += (gxr - rx) * 0.09;
    draw(now);
    raf = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce || !visible || document.hidden) return;
    running = true;
    raf = window.requestAnimationFrame(frame);
  }
  function stop() { running = false; if (raf) window.cancelAnimationFrame(raf); }

  function init() {
    try {
      prepare();
    } catch (err) {
      return; // se queda la imagen fija
    }
    stage.classList.add("is-live");
    t0 = performance.now();
    resize();
    if (reduce) { rx = 0.07; ry = -0.21; draw(t0); return; }
    ry = -0.85;

    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = stage.getBoundingClientRect();
      hasPtr = true;
      tx = clamp((e.clientX - (r.left + r.width / 2)) / Math.max(r.width * 0.9, 340), -1, 1);
      ty = clamp((e.clientY - (r.top + r.height / 2)) / Math.max(r.height * 0.9, 340), -1, 1);
    }, { passive: true });
    document.addEventListener("mouseleave", function () { hasPtr = false; });

    // Arrastrar con el dedo (o el ratón) para girarlo.
    stage.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY, ry: ry, rx: rx };
      dragRy = ry; dragRx = rx;
      stage.classList.add("is-drag");
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
    });
    stage.addEventListener("pointermove", function (e) {
      if (!drag) return;
      dragRy = clamp(drag.ry + (e.clientX - drag.x) / (W || 300) * 1.6, -0.75, 0.75);
      dragRx = clamp(drag.rx - (e.clientY - drag.y) / (H || 300) * 1.0, -0.45, 0.45);
    });
    function end() { drag = null; stage.classList.remove("is-drag"); }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting;
        if (visible) start(); else stop();
      }, { rootMargin: "120px" }).observe(stage);
    }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    start();
  }

  function ready(img) { return img.complete && img.naturalWidth > 0; }
  function whenLoaded() {
    var started = false;
    function go() { if (!started && ready(imgEye) && ready(imgWord)) { started = true; init(); } }
    function fonts() {
      if (document.fonts && document.fonts.load) {
        var t = window.setTimeout(go, 1500); // si la fuente tarda, sigue con la del sistema
        document.fonts.load('600 70px "Montserrat"').then(function () { window.clearTimeout(t); go(); }, function () { window.clearTimeout(t); go(); });
      } else { go(); }
    }
    var left = 0;
    [imgEye, imgWord].forEach(function (im) {
      if (!ready(im)) { left++; im.addEventListener("load", function () { if (--left <= 0) fonts(); }, { once: true }); }
    });
    if (!left) fonts();
  }
  whenLoaded();
})();
