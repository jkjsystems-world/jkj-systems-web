/*
 * Servidor local para desarrollo. No necesita instalar nada:  npm run dev  →  http://localhost:8788
 *  - sirve la carpeta public/ con las mismas cabeceras de seguridad de public/_headers
 *  - atiende /api/chat y /api/contact con las funciones de functions/api/
 *  - lee las variables de .dev.vars si el archivo existe (copia .dev.vars.example)
 * En producción esto lo hace Cloudflare Pages; este archivo no se publica.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");
const PORT = Number(process.env.PORT) || 8788;

const env = { ...process.env };
const varsFile = join(ROOT, ".dev.vars");
if (existsSync(varsFile)) {
  for (const row of readFileSync(varsFile, "utf8").split("\n")) {
    const m = row.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !row.trim().startsWith("#")) env[m[1]] = m[2];
  }
}

// Cabeceras del bloque "/*" de public/_headers
const headers = {};
{
  const text = readFileSync(join(PUBLIC, "_headers"), "utf8");
  const block = text.split(/\n(?=\/)/).find((b) => b.trim().startsWith("/*")) || "";
  for (const row of block.split("\n").slice(1)) {
    const i = row.indexOf(":");
    if (i > 0) headers[row.slice(0, i).trim()] = row.slice(i + 1).trim();
  }
  delete headers["Strict-Transport-Security"]; // en local no hay https
  if (headers["Content-Security-Policy"]) headers["Content-Security-Policy"] = headers["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ico": "image/x-icon",
};

const functions = {
  "/api/chat": () => import("../functions/api/chat.js"),
  "/api/contact": () => import("../functions/api/contact.js"),
};

async function runFunction(req, res, load, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(url, {
    method: req.method,
    headers: { ...req.headers, "CF-Connecting-IP": req.socket.remoteAddress || "local" },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  const mod = await load();
  const handler = (req.method === "POST" && mod.onRequestPost) || mod.onRequest;
  const response = await handler({ request, env });
  res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (functions[url.pathname]) return await runFunction(req, res, functions[url.pathname], url);

    let path = normalize(decodeURIComponent(url.pathname));
    if (path.endsWith("/")) path += "index.html";
    let file = join(PUBLIC, path);
    if (!file.startsWith(PUBLIC)) { res.writeHead(403, headers); return res.end("Forbidden"); }
    let status = 200;
    const found = await stat(file).then((s) => s.isFile(), () => false);
    if (!found || path === "/_headers") { file = join(PUBLIC, "404.html"); status = 404; }
    res.writeHead(status, { ...headers, "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(await readFile(file));
  } catch (err) {
    console.error(err);
    res.writeHead(500, headers);
    res.end("Error");
  }
}).listen(PORT, () => console.log(`JKJ SYSTEMS en http://localhost:${PORT}`));
