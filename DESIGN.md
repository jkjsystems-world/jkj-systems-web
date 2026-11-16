---
version: alpha
name: JKJ SYSTEMS
description: Sitio oscuro con profundidad 3D. Verde menta del logotipo sobre grafito, fondo de red de partículas y tarjetas que se inclinan.
colors:
  primary: "#9FE3B1"        # verde menta del logo; único acento
  primary-hover: "#B4F0C3"
  primary-deep: "#1E6B4A"   # verde para botones dentro de maquetas claras
  on-primary: "#0E1A14"     # texto sobre verde menta
  background: "#0D1215"     # fondo de toda la página
  background-raised: "#101519"
  surface: "#151C20"        # tarjetas (se usa al 86% de opacidad sobre la red)
  surface-input: "#0D1316"  # campos de formulario
  line: "#FFFFFF1A"
  text: "#F2F6F4"
  heading: "#F6FAF8"
  muted: "#B9C4BF"
  muted-2: "#A9B4AF"
  faint: "#93A09A"
  danger: "#FFB4A6"
typography:
  display:
    fontFamily: Montserrat
    fontWeight: 800
    letterSpacing: -0.025em
    lineHeight: 1.05
  heading:
    fontFamily: Montserrat
    fontWeight: 800
    letterSpacing: -0.02em
    lineHeight: 1.1
  body:
    fontFamily: Inter
    fontWeight: 400
    fontSize: 16px
    lineHeight: 1.6
  label:
    fontFamily: Inter
    fontWeight: 600
    fontSize: 14px
rounded:
  sm: 12px
  md: 16px
  lg: 24px
  xl: 28px
  full: 999px
spacing:
  section: 112px
  section-mobile: 80px
  container: 1120px
  gutter: 24px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    height: 52px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: 40px
  input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    height: 48px
---

# JKJ SYSTEMS — DESIGN.md

## Overview

JKJ SYSTEMS hace páginas web para negocios y chatbots con IA para WhatsApp. El sitio es oscuro de principio a fin para que se lea la profundidad: una red de partículas en 3D al fondo, el logotipo girando en 3D en el inicio y tarjetas que se inclinan con el puntero. Debe sentirse preciso y técnico, sin adornos de más.

## Colors

- **Verde menta** (`primary`) es el único acento: botones, enlaces, numerales, partículas y logo. No se usa azul.
- Los grises llevan un toque verde azulado; no usar gris neutro puro ni negro puro.
- Las maquetas de sitios de clientes dentro de las tarjetas (navegador, proyectos demo) sí pueden ser claras o de otro color: representan otros sitios.
- Sin degradados en el texto. Los degradados de fondo son muy tenues y solo dan ambiente.

## Typography

- **Montserrat** 700–800 para títulos: se parece al rotulado del logotipo.
- **Inter** para texto, etiquetas y formularios. Los campos usan 16 px para que iOS no haga zoom.
- Títulos con `text-wrap: balance`; tracking nunca menor a -0.025em.

## Layout

- Contenedor de 1120 px, margen lateral de 24 px (respeta las zonas seguras del teléfono).
- Secciones con 112 px de aire (80 px en móvil). Cada sección oscurece un poco el fondo para que el texto se lea sobre la red.
- Rejillas `auto-fit` que bajan a una columna en teléfono.

## Elevation & Depth

- **Fondo:** red de partículas en perspectiva; gira despacio, con el puntero y con el scroll.
- **Logo:** grosor real por capas apiladas, franja de luz que cruza al girar, sombra en el piso.
- **Tarjetas:** se inclinan hasta los grados de `data-tilt`; sus hijos flotan a distintas alturas (`d-12` … `d-62`); un reflejo sigue al puntero; la sombra se desplaza al lado contrario.
- En teléfono no hay puntero: la inclinación es mínima y depende del scroll; el logo se gira arrastrando.
- Con "reducir movimiento" activado todo queda fijo.

## Components

- **Botón principal:** píldora verde menta, texto oscuro. Una sola acción principal: pedir la cotización sin costo.
- **Tarjeta:** superficie grafito al 86%, borde de 1 px, radio de 28 px. Nunca una tarjeta dentro de otra.
- **Fila de contacto:** etiqueta pequeña, dato grande, flecha verde.
- **Campo de formulario:** fondo más oscuro que la tarjeta, borde fino; al enfocar, borde verde y halo. Errores en `danger`, debajo del campo.
- **Asistente:** botón redondo fijo abajo a la derecha; panel de 380 px en escritorio y pantalla completa en teléfono.

## Do's and Don'ts

- Sí: español de México, de tú, frases cortas.
- Sí: marcar entre corchetes lo que falta, por ejemplo `[TU CORREO]`.
- No: precios ni paquetes; todo se cotiza a la medida y la cotización no cuesta.
- No: testimonios, clientes o cifras inventadas. Los proyectos demo se rotulan como demo.
- No: emojis como iconos, etiquetas pequeñas encima de los títulos, secciones claras.
- No: estilos o scripts en línea (lo impide la política de seguridad).
