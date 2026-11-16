/*
 * POST /api/contact  — Cloudflare Pages Function.
 * Recibe el formulario de cotización, lo valida otra vez y lo manda por correo con Resend.
 *
 * Variables de entorno:
 *   RESEND_API_KEY  clave de Resend (https://resend.com)
 *   CONTACT_TO      correo donde quieren recibir las solicitudes
 *   CONTACT_FROM    remitente verificado en Resend, ej. "JKJ SYSTEMS <sitio@jkjsystems.com.mx>"
 *   ALLOWED_ORIGIN  (opcional) si la página y la API viven en dominios distintos
 * Si falta alguna de las tres primeras responde 503 y el navegador ofrece el correo directo.
 */

const MAX_BODY = 10_000;
const RATE = { limit: 5, windowMs: 10 * 60_000 }; // 5 solicitudes cada 10 minutos por IP
const MIN_FILL_MS = 3000;                          // menos de 3 s entre cargar la página y enviar: casi seguro un bot
const SERVICES = { pagina: "Página web", chatbot: "Chatbot con IA para WhatsApp", ambos: "Página web y chatbot", nose: "Aún no lo sé" };
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i;
const PHONE = /^[0-9+()\-.\s]{7,20}$/;

const hits = new Map(); // primera barrera, por instancia. Para más protección: regla de rate limiting o Turnstile en Cloudflare.

function limited(ip, now = Date.now()) {
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (list.length >= RATE.limit) { hits.set(ip, list); return true; }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function sameOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  if (env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

// Una sola línea, sin caracteres de control: evita inyectar cabeceras en el correo.
const line = (v, max) => String(v ?? "").replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
// Texto largo: conserva saltos de línea, quita el resto de caracteres de control.
const block = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);

export function validate(body) {
  const data = {
    nombre: line(body.nombre, 81),
    negocio: line(body.negocio, 101),
    correo: line(body.correo, 121),
    telefono: line(body.telefono, 21),
    servicio: line(body.servicio, 20),
    mensaje: block(body.mensaje, 1501),
  };
  const fields = {};
  if (data.nombre.length < 2 || data.nombre.length > 80) fields.nombre = "Escribe tu nombre (máximo 80 caracteres).";
  if (data.negocio.length < 2 || data.negocio.length > 100) fields.negocio = "Cuéntanos a qué se dedica tu negocio (máximo 100 caracteres).";
  if (!EMAIL.test(data.correo) || data.correo.length > 120) fields.correo = "Revisa el correo: debe verse como nombre@dominio.com.";
  if (data.telefono && !PHONE.test(data.telefono)) fields.telefono = "Revisa el número: usa solo dígitos, espacios, + o guiones.";
  if (!Object.hasOwn(SERVICES, data.servicio)) fields.servicio = "Elige qué te interesa.";
  if (data.mensaje.length < 10 || data.mensaje.length > 1500) fields.mensaje = "El mensaje debe tener entre 10 y 1500 caracteres.";
  if (body.acepto !== true) fields.acepto = "Necesitamos tu autorización para usar estos datos y responderte.";
  return { data, fields, ok: Object.keys(fields).length === 0 };
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request, env)) return json({ error: "forbidden" }, 403);
  if (!(request.headers.get("Content-Type") || "").includes("application/json")) return json({ error: "unsupported_media_type" }, 415);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "bad_request" }, 400);

  // Trampas para bots: se responde "ok" sin enviar nada, para no darles pistas.
  if (typeof body.sitio_web === "string" && body.sitio_web.trim() !== "") return json({ ok: true });
  if (typeof body.elapsed === "number" && body.elapsed < MIN_FILL_MS) return json({ ok: true });

  const { data, fields, ok } = validate(body);
  if (!ok) return json({ error: "invalid", fields }, 422);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (limited(ip)) return json({ error: "rate_limited" }, 429);

  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) return json({ error: "not_configured" }, 503);

  const text = [
    `Nombre: ${data.nombre}`,
    `Negocio: ${data.negocio}`,
    `Correo: ${data.correo}`,
    `Teléfono: ${data.telefono || "(no lo dio)"}`,
    `Le interesa: ${SERVICES[data.servicio]}`,
    "",
    data.mensaje,
    "",
    "— Enviado desde el formulario del sitio.",
  ].join("\n");

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.CONTACT_FROM,
        to: [env.CONTACT_TO],
        reply_to: data.correo,
        subject: `Solicitud de cotización — ${data.negocio}`,
        text, // texto plano: lo que escribe el visitante nunca se interpreta como HTML
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return json({ error: "mail_unreachable" }, 502);
  }
  if (!res.ok) return json({ error: "mail_error" }, 502);
  return json({ ok: true });
}

export async function onRequest() {
  return json({ error: "method_not_allowed" }, 405);
}
