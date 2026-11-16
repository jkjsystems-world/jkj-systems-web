# JKJ SYSTEMS — sitio web

Sitio de JKJ SYSTEMS (páginas web y chatbots con IA para negocios). La página es HTML, CSS y JavaScript sin librerías ni compilación. Incluye dos funciones de servidor pequeñas: una recibe el formulario de cotización y otra conecta el asistente con IA.

## Verlo en tu computadora

Necesitas Node 20 o más reciente. Desde esta carpeta:

```
npm run dev
```

y abre `http://localhost:8788`. Sirve la página con las mismas cabeceras de seguridad que tendrá publicada y atiende `/api/contact` y `/api/chat`. No hay que instalar nada.

Para correr las pruebas de las funciones: `npm test`.

## Abrirlo en Claude Code

1. Descomprime la carpeta donde guardes tus proyectos.
2. En la terminal: `cd jkj-systems-web` y luego `claude`.
3. Claude Code lee `CLAUDE.md` (reglas del proyecto) y `DESIGN.md` (colores, tipografía, componentes) al empezar.

Recomendado: `git init` y un primer commit antes de pedir cambios, para poder regresar.

## Qué hay en la carpeta

| Ruta | Qué es |
|---|---|
| `public/` | **Lo que se publica.** Todo lo demás se queda fuera del sitio |
| `public/index.html` | La página: inicio, servicios, cómo trabajamos, proyectos, contacto |
| `public/aviso-de-privacidad.html` | Borrador del aviso de privacidad (tiene espacios por llenar) |
| `public/css/styles.css` | Todos los estilos y los colores (variables en `:root`) |
| `public/js/config.js` | **Datos editables**: correo, redes y rutas del servidor |
| `public/js/background.js` | Fondo: red de partículas en 3D |
| `public/js/logo3d.js` | Logo 3D del inicio |
| `public/js/tilt.js` | Inclinación 3D de tarjetas y números con grosor |
| `public/js/form.js` | Formulario de cotización (lado del navegador) |
| `public/js/chatbot.js` | Asistente del sitio y sus respuestas guardadas |
| `public/js/main.js` | Menú móvil y arranque |
| `public/assets/` | Logo recortado, iconos y fuentes (con sus licencias) |
| `public/_headers` | Cabeceras de seguridad |
| `functions/api/contact.js` | Servidor: valida el formulario y lo manda por correo |
| `functions/api/chat.js` | Servidor: pide la respuesta del asistente al modelo de IA |
| `tests/` | Pruebas de las dos funciones |
| `scripts/dev-server.mjs` | Servidor local de desarrollo |
| `docs/` | Seguridad y funcionamiento del asistente |

## Pendientes antes de publicar

1. **Contacto.** Llena `email`, `instagram` y `facebook` en `public/js/config.js`. Mientras estén vacíos, la página muestra `[TU CORREO]`, etc.
2. **Formulario.** Sin llaves, valida y muestra el mensaje pero no envía. Para que llegue a su correo: una cuenta en Resend (servicio de envío de correo) y las variables `RESEND_API_KEY`, `CONTACT_TO` y `CONTACT_FROM` en el hosting.
3. **Asistente con IA (opcional).** Sin llave, responde con textos guardados. Con `ANTHROPIC_API_KEY` en el hosting, responde con IA. Tiene costo por uso. Ver `docs/CHATBOT-IA.md`.
4. **Aviso de privacidad.** Completar los corchetes y que lo revise un abogado.
5. **Proyectos de muestra.** Son demos dibujados en la página; sustituirlos por trabajos reales cuando existan.
6. **Dominio.** Es `jkjsystems.com.mx` (ya está en `canonical`, `og:url`, `sitemap.xml` y `robots.txt`). Falta conectarlo al hosting.

## Publicar

Está armado para **Cloudflare Pages**, que publica la carpeta `public/`, ejecuta las funciones de `functions/` y aplica `_headers`:

1. Sube el proyecto a un repositorio de GitHub.
2. En Cloudflare, crea un proyecto de Pages y conéctalo al repositorio.
3. Sin comando de compilación; directorio de salida: `public`.
4. En la configuración del proyecto, captura las variables de `.dev.vars.example` como secretos.
5. Conecta tu dominio.

En otro hosting de archivos estáticos se publica `public/` y la página funciona, pero el formulario y la IA quedan en modo sin servidor hasta que se adapten las funciones a ese hosting.

Después de publicar, revisa las cabeceras del dominio en securityheaders.com.

## Qué se probó y qué no

- **Probado:** la página en Chrome a 1440, 1280, 820, 390 y 360 px de ancho; con y sin JavaScript; con "reducir movimiento"; con la política de seguridad estricta activa; el formulario y el asistente contra el servidor local; las 14 pruebas de las funciones.
- **No probado:** un iPhone ni un Android físicos; el envío real de correo por Resend; la respuesta real del modelo de IA (las pruebas simulan a esos proveedores porque aquí no había llaves); el despliegue en Cloudflare Pages.
