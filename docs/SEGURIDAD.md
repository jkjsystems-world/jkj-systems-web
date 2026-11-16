# Seguridad del sitio y de los formularios

## En la página (navegador)

- Sin scripts ni estilos en línea y sin recursos de terceros: fuentes, imágenes y código se sirven desde el propio sitio. Eso permite una política CSP estricta.
- Lo que escribe el visitante y lo que responde el servidor se muestra siempre como texto, nunca como HTML. Probado con `<img src=x onerror=alert(1)>` y `<script>`: aparecen como texto y no se ejecutan.
- El formulario limpia caracteres de control, recorta cada campo a un máximo y valida correo, teléfono y opción de servicio.
- Trampa para bots (campo oculto), tiempo mínimo de 3 segundos antes de enviar y pausa de 30 segundos entre envíos.
- No se guardan datos personales ni la conversación en el navegador (ni `localStorage` ni cookies).
- Casilla de consentimiento con enlace al aviso de privacidad.
- Los enlaces a redes abren con `rel="noopener noreferrer"`. Los datos de `config.js` se validan antes de usarse en un enlace.

Lo del navegador es comodidad para el visitante. Quien quiera atacar puede saltárselo mandando peticiones directas; por eso la protección real está en el servidor.

## En el servidor (`functions/api/`)

**Formulario — `contact.js`**

- Solo acepta `POST` con JSON, de menos de 10 KB, desde el propio dominio (revisa la cabecera `Origin`).
- Vuelve a validar cada campo: longitudes, formato de correo y teléfono, lista de servicios permitidos, consentimiento.
- Quita saltos de línea de los campos de una línea, para que nadie inyecte cabeceras en el correo.
- Trampas para bots: si llega el campo oculto lleno o el envío tardó menos de 3 segundos, responde "ok" sin mandar nada.
- Límite de 5 solicitudes cada 10 minutos por IP.
- Manda el correo en texto plano: lo que escribe el visitante nunca se interpreta como HTML.
- Las llaves se leen de variables de entorno. Si faltan, responde 503 y no envía.
- No reenvía al visitante los errores del proveedor de correo.

**Asistente — `chat.js`**

- Mismas barreras de método, tamaño y origen. Límite de 12 preguntas por minuto por IP.
- Máximo 10 mensajes por conversación; 500 caracteres por mensaje del visitante.
- Instrucciones fijas para el modelo con solo la información real del negocio; le prohíben dar precios, plazos o garantías y seguir órdenes escritas por el visitante.
- La llave del modelo nunca llega al navegador.

Las dos funciones tienen pruebas en `tests/` (`npm test`).

## Cabeceras (`public/_headers`)

| Cabecera | Para qué |
|---|---|
| `Content-Security-Policy` | Solo se cargan recursos del propio sitio; bloquea scripts inyectados |
| `Strict-Transport-Security` | Obliga a usar HTTPS |
| `X-Content-Type-Options: nosniff` | El navegador no adivina tipos de archivo |
| `X-Frame-Options` y `frame-ancestors 'none'` | Nadie puede incrustar el sitio en otra página (clickjacking) |
| `Referrer-Policy` | No se filtra la URL completa a otros sitios |
| `Permissions-Policy` | Cámara, micrófono, ubicación y pagos desactivados |

## Lo que falta

1. **Captcha.** Agregar Cloudflare Turnstile (gratuito) al formulario y verificar su token en `contact.js`. Es la defensa que más spam detiene.
2. **Límite de peticiones en Cloudflare.** El límite actual vive en la memoria de cada instancia del servidor: sirve como primera barrera, pero se reinicia y no se comparte entre instancias. Una regla de rate limiting en Cloudflare para `/api/*` lo hace firme.
3. **Tope de gasto** con el proveedor de IA, para que un abuso no genere una cuenta alta.
4. **Probar con llaves reales.** El envío por Resend y la respuesta del modelo solo se han probado simulados.
5. **Verificación en dos pasos** en las cuentas de dominio, hosting, GitHub, Resend y el proveedor de IA.

## Datos personales

El formulario pide nombre, correo, teléfono opcional, giro y mensaje. Eso obliga a tener un aviso de privacidad publicado. `aviso-de-privacidad.html` es un borrador con espacios por llenar; debe revisarlo un abogado antes de publicar, e incluir a los proveedores que reciben datos (correo e IA). Esto no es asesoría legal.

## Revisión antes de publicar

- [ ] El sitio carga por HTTPS y redirige desde HTTP.
- [ ] securityheaders.com da buena nota al dominio.
- [ ] La consola del navegador no muestra errores de CSP.
- [ ] El formulario llega al correo correcto y rechaza envíos vacíos o repetidos.
- [ ] El asistente no da precios ni plazos aunque se le insista.
- [ ] El aviso de privacidad está completo.
- [ ] No hay llaves en el repositorio (`.dev.vars` no se subió).
