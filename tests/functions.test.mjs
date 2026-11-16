// Pruebas de las funciones del servidor.  npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import * as chat from "../functions/api/chat.js";
import * as contact from "../functions/api/contact.js";

const post = (path, body, headers = {}) =>
  new Request("https://jkj.test" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://jkj.test", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const goodForm = {
  nombre: "Ana López", negocio: "Cafetería", correo: "ana@example.com", telefono: "55 1234 5678",
  servicio: "pagina", mensaje: "Quiero una página con mi menú y ubicación.", acepto: true, sitio_web: "", elapsed: 9000,
};

function mockFetch(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return handler(String(url), init); };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("chat: rechaza otro origen", async () => {
  const res = await chat.onRequestPost({ request: post("/api/chat", { messages: [{ role: "user", content: "hola" }] }, { Origin: "https://otro.test" }), env: {} });
  assert.equal(res.status, 403);
});

test("chat: rechaza mensajes mal formados", async () => {
  for (const body of [{}, { messages: [] }, { messages: [{ role: "system", content: "x" }] }, { messages: [{ role: "assistant", content: "x" }] }]) {
    const res = await chat.onRequestPost({ request: post("/api/chat", body, { "CF-Connecting-IP": "1.1.1.1" }), env: {} });
    assert.equal(res.status, 400);
  }
});

test("chat: sin clave responde 503 y no llama a nadie", async () => {
  const m = mockFetch(() => { throw new Error("no debería llamarse"); });
  const res = await chat.onRequestPost({ request: post("/api/chat", { messages: [{ role: "user", content: "hola" }] }, { "CF-Connecting-IP": "2.2.2.2" }), env: {} });
  m.restore();
  assert.equal(res.status, 503);
  assert.equal(m.calls.length, 0);
});

test("chat: con clave llama a la API y devuelve solo el texto", async () => {
  const m = mockFetch(() => new Response(JSON.stringify({ content: [{ type: "text", text: "Hacemos páginas web." }] }), { status: 200 }));
  const res = await chat.onRequestPost({
    request: post("/api/chat", { messages: [{ role: "user", content: "¿Qué hacen?".padEnd(900, "x") }] }, { "CF-Connecting-IP": "3.3.3.3" }),
    env: { ANTHROPIC_API_KEY: "sk-test" },
  });
  m.restore();
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { reply: "Hacemos páginas web." });
  const sent = JSON.parse(m.calls[0].init.body);
  assert.equal(m.calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(m.calls[0].init.headers["x-api-key"], "sk-test");
  assert.equal(sent.messages[0].content.length, 500, "el mensaje del usuario se recorta a 500 caracteres");
  assert.ok(sent.system.includes("JKJ SYSTEMS"));
});

test("chat: el error del proveedor no se filtra al visitante", async () => {
  const m = mockFetch(() => new Response(JSON.stringify({ error: { message: "clave inválida sk-..." } }), { status: 401 }));
  const res = await chat.onRequestPost({ request: post("/api/chat", { messages: [{ role: "user", content: "hola" }] }, { "CF-Connecting-IP": "4.4.4.4" }), env: { ANTHROPIC_API_KEY: "x" } });
  m.restore();
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: "upstream_error" });
});

test("chat: límite de peticiones por IP", async () => {
  let last;
  for (let i = 0; i < 13; i++) {
    last = await chat.onRequestPost({ request: post("/api/chat", { messages: [{ role: "user", content: "hola" }] }, { "CF-Connecting-IP": "5.5.5.5" }), env: {} });
  }
  assert.equal(last.status, 429);
});

test("chat: solo acepta POST", async () => {
  assert.equal((await chat.onRequest({})).status, 405);
});

test("formulario: valida cada campo", () => {
  assert.equal(contact.validate(goodForm).ok, true);
  const bad = contact.validate({ ...goodForm, nombre: "A", correo: "no-es-correo", telefono: "abc", servicio: "otro", mensaje: "corto", acepto: false });
  assert.deepEqual(Object.keys(bad.fields).sort(), ["acepto", "correo", "mensaje", "nombre", "servicio", "telefono"]);
});

test("formulario: quita saltos de línea de los campos de una línea", () => {
  const { data } = contact.validate({ ...goodForm, negocio: "Cafetería\r\nBcc: alguien@example.com" });
  assert.equal(/[\r\n]/.test(data.negocio), false);
});

test("formulario: datos inválidos responden 422 con los campos", async () => {
  const res = await contact.onRequestPost({ request: post("/api/contact", { ...goodForm, correo: "x" }), env: {} });
  assert.equal(res.status, 422);
  assert.ok((await res.json()).fields.correo);
});

test("formulario: las trampas para bots responden ok sin enviar correo", async () => {
  const m = mockFetch(() => { throw new Error("no debería enviarse"); });
  const env = { RESEND_API_KEY: "k", CONTACT_TO: "a@b.mx", CONTACT_FROM: "c@d.mx" };
  const r1 = await contact.onRequestPost({ request: post("/api/contact", { ...goodForm, sitio_web: "http://spam" }), env });
  const r2 = await contact.onRequestPost({ request: post("/api/contact", { ...goodForm, elapsed: 500 }), env });
  m.restore();
  assert.equal(r1.status, 200); assert.equal(r2.status, 200); assert.equal(m.calls.length, 0);
});

test("formulario: sin configuración responde 503", async () => {
  const res = await contact.onRequestPost({ request: post("/api/contact", goodForm, { "CF-Connecting-IP": "6.6.6.6" }), env: {} });
  assert.equal(res.status, 503);
});

test("formulario: configurado, manda el correo en texto plano", async () => {
  const m = mockFetch(() => new Response("{}", { status: 200 }));
  const res = await contact.onRequestPost({
    request: post("/api/contact", { ...goodForm, mensaje: "<script>alert(1)</script> quiero una página" }, { "CF-Connecting-IP": "7.7.7.7" }),
    env: { RESEND_API_KEY: "k", CONTACT_TO: "ventas@jkj.test", CONTACT_FROM: "JKJ <sitio@jkj.test>" },
  });
  m.restore();
  assert.equal(res.status, 200);
  const sent = JSON.parse(m.calls[0].init.body);
  assert.equal(m.calls[0].url, "https://api.resend.com/emails");
  assert.deepEqual(sent.to, ["ventas@jkj.test"]);
  assert.equal(sent.reply_to, "ana@example.com");
  assert.equal("html" in sent, false);
});

test("formulario: otro origen y cuerpo enorme se rechazan", async () => {
  const r1 = await contact.onRequestPost({ request: post("/api/contact", goodForm, { Origin: "https://otro.test" }), env: {} });
  const r2 = await contact.onRequestPost({ request: post("/api/contact", { ...goodForm, mensaje: "x".repeat(20000) }), env: {} });
  assert.equal(r1.status, 403); assert.equal(r2.status, 413);
});
