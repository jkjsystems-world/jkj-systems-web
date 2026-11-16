# JKJ SYSTEMS — notas del proyecto para Claude Code

Sitio de JKJ SYSTEMS, una startup en México que hace páginas web para negocios y chatbots con IA para WhatsApp. Página estática sin framework ni dependencias, más dos Cloudflare Pages Functions.

## Comandos

- `npm run dev` — servidor local en `http://localhost:8788` (sirve `public/`, aplica `public/_headers` y atiende `/api/*`). Lee variables de `.dev.vars` si existe.
- `npm test` — pruebas de `functions/api/*.js` con el runner de Node.
- `node --check public/js/<archivo>.js` — revisar sintaxis.

Antes de dar un cambio por bueno: verlo a 1440, 820, 390 y 360 px de ancho, revisar que la consola no tenga errores (un 503 de `/api/*` sin llaves es esperado) y correr `npm test` si se tocó `functions/`.

## Estructura

- `public/` es lo único que se publica. `functions/` corre en el servidor. `tests/`, `scripts/`, `docs/` no se publican.
- Rutas relativas en `index.html` y `aviso-de-privacidad.html`; absolutas en `404.html`.

## Reglas que no se rompen

1. **Sin estilos ni scripts en línea.** La CSP es `style-src 'self'; script-src 'self'`. Nada de `style="..."`, `<style>`, `<script>` con código ni `onclick=""`. Los estilos van en `public/css/styles.css`; desde JavaScript solo `el.style.setProperty(...)`.
2. **Sin recursos de terceros en el navegador.** Fuentes, imágenes y scripts viven en `public/`. Si hace falta un origen externo, añadirlo a la CSP en `public/_headers`.
3. **Sin secretos en `public/`.** `config.js` es público. Las llaves van en variables de entorno (`.dev.vars` en local, secretos de Cloudflare en producción). `.dev.vars` está en `.gitignore`.
4. **El texto del usuario o del servidor nunca entra como HTML.** `textContent` y `createElement`; no `innerHTML`.
5. **El servidor no confía en el navegador.** Toda validación del formulario se repite en `functions/api/contact.js`. Si se agrega un campo, se valida en los dos lados y se añade una prueba.
6. **No inventar datos del negocio.** Nada de precios, plazos, clientes, testimonios ni cifras que el equipo no haya dado; ni en la página ni en el prompt del asistente. Lo que falte se marca entre corchetes: `[TU CORREO]`.
7. **Sin precios ni paquetes en el sitio.** Todo se cotiza a la medida y la cotización no cuesta.
8. **Español de México, de tú.** Textos cortos y directos.
9. **El formulario solo dice "enviado" si el servidor respondió 2xx.**

## Contratos entre navegador y servidor

- `POST /api/contact` ← `{ nombre, negocio, correo, telefono, servicio, mensaje, acepto, sitio_web, elapsed }`. `servicio` es una de `pagina | chatbot | ambos | nose`. Responde `200 {ok}`, `422 {fields}`, `429`, `503` (sin llaves).
- `POST /api/chat` ← `{ messages: [{ role, content }] }` (máx. 10; el último es del usuario). Responde `200 { reply }`, `429`, `503` (sin llave).
- Con `404`, `405`, `501` o `503`, el navegador pasa al modo sin servidor: el formulario muestra el mensaje para copiar y el asistente usa `ANSWERS`.

## Diseño

- Tokens y componentes: `DESIGN.md`. Variables CSS en `:root` de `public/css/styles.css`.
- Todo el sitio es oscuro. Acento único: verde menta `#9FE3B1`. No usar azul ni degradados de texto.
- Efecto 3D: los elementos con clase `tilt` y `data-tilt="<grados>"` se inclinan (`tilt.js`). Los hijos ganan profundidad con `d-12` … `d-62` (translateZ en px). Un `<div class="glare">` dentro da el reflejo.
- El fondo (`background.js`) y el logo (`logo3d.js`) son Canvas 2D con proyección propia. Respetan `prefers-reduced-motion` y se pausan fuera de pantalla.
- El logo 3D usa `assets/img/logo-emblem.webp` y `logo-wordmark.webp`; el lema se dibuja como texto. Para cambiar el logo, sustituir esas imágenes (fondo transparente) y ajustar proporciones en `prepare()`.
- Móvil: objetivos táctiles de 44 px o más, campos con letra de 16 px (evita el zoom de iOS), `env(safe-area-inset-*)` en encabezado, pie y chat.
- No validar el formulario al salir de un campo: mostrar u ocultar un error ahí mueve el botón justo cuando se le da clic.

## Dónde se cambia cada cosa

| Quiero cambiar… | Archivo |
|---|---|
| Correo, redes, rutas del servidor | `public/js/config.js` |
| Textos de la página | `public/index.html` |
| Respuestas guardadas del asistente | `ANSWERS` e `INTENTS` en `public/js/chatbot.js` |
| Lo que sabe y puede decir la IA | `SYSTEM_PROMPT` en `functions/api/chat.js` |
| Reglas del formulario | `public/js/form.js` **y** `functions/api/contact.js` |
| Colores, tamaños, espaciados | `:root` en `public/css/styles.css` |
| Cabeceras de seguridad | `public/_headers` |

## Pendientes conocidos

- Datos de contacto reales en `public/js/config.js`.
- Llaves en el hosting: Resend para el formulario; Anthropic para el asistente con IA. Ninguna de las dos integraciones se ha probado con llaves reales.
- Captcha (por ejemplo, Cloudflare Turnstile) y límite de peticiones a nivel de Cloudflare: el límite actual vive en memoria de cada instancia.
- Completar `aviso-de-privacidad.html` con revisión legal.
- Sustituir los proyectos demo por trabajos reales.
- Dominio: `jkjsystems.com.mx` (ya en `canonical`, `og:url`, `sitemap.xml`, `robots.txt`). Falta conectarlo al hosting y una `og:image`.
- Probar en iPhone y Android físicos.
