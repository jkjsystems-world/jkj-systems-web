/* Datos editables del sitio. Este archivo es público: NO pongas aquí
   contraseñas, llaves de API ni tokens. Las llaves van en el servidor
   (variables de entorno; ver README.md). */
window.JKJ_CONFIG = {
  // Contacto. Deja la cadena vacía para que el sitio muestre el marcador [..].
  email: "",            // ejemplo: "contacto@tudominio.com.mx"
  instagram: "",        // solo el usuario, sin @. Ejemplo: "jkjsystems"
  facebook: "",         // solo el nombre de la página. Ejemplo: "jkjsystems"

  // Rutas del servidor (carpeta /functions, Cloudflare Pages Functions).
  // Mientras el servidor no exista o no tenga sus llaves, el formulario no
  // envía (muestra el mensaje para copiar) y el asistente usa sus respuestas
  // guardadas. Deja la cadena vacía para no intentar la conexión.
  formEndpoint: "/api/contact",
  chatEndpoint: "/api/chat"
};
