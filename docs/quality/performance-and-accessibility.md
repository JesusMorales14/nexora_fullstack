# Rendimiento y accesibilidad

Fecha: 2026-11-04 · Build de producción (`vite preview`) con la API local.
Herramientas: Lighthouse 13.6 (Chromium headless) y Playwright + axe-core 4.14.

> Son **datos de laboratorio** en una máquina de desarrollo con carga variable. Los objetivos del
> proyecto (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 en el percentil 75) se validarán con datos de campo
> una vez desplegado (fase 11).

## Lighthouse

Móvil = emulación de Moto G con CPU 4× más lenta y red 4G lenta. Escritorio = preset `desktop`.

| Página | Formato | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | móvil | 74 | 100 | 96 | 92 | 2.0 s | 0.000 | 848 ms |
| Catálogo | móvil | 64 | 99→100* | 96 | 92 | 3.2 s | 0.016 | 1025 ms |
| Producto | móvil | 81 | 100 | 96 | 92 | 1.9 s | 0.000 | 584 ms |
| Inicio | escritorio | 94 | 100 | 96 | 92 | 0.2 s | 0.000 | 142 ms |
| Catálogo | escritorio | 97 | 99→100* | 96 | 92 | 0.8 s | 0.010 | 127 ms |
| Producto | escritorio | 97 | 100 | 96 | 92 | 0.7 s | 0.000 | 104 ms |

\* El orden de encabezados del catálogo se corrigió después de medir (h2 oculto entre h1 y tarjetas).

### Después de la fase 10 (PWA + SEO)

Misma máquina y configuración (Lighthouse 13.6.0). El rendimiento en móvil varía mucho entre
ejecuciones por la carga del equipo; lo comparable de forma fiable es SEO y accesibilidad.

| Página | Formato | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | móvil | 99 | 100 | 96 | 100 | 0.8 s | 0.000 | 110 ms |
| Catálogo | móvil | 93 | 100 | 96 | 100 | 2.8 s | 0.016 | 200 ms |
| Producto | móvil | 92 | 100 | 96 | 100 | 2.7 s | 0.059 | 240 ms |
| Inicio | escritorio | 100 | 100 | 96 | 100 | 0.2 s | 0.000 | 0 ms |
| Catálogo | escritorio | 98 | 100 | 96 | 100 | 0.6 s | 0.010 | 0 ms |
| Producto | escritorio | 100 | 100 | 96 | 100 | 0.6 s | 0.000 | 0 ms |

SEO 92 → 100 con `robots.txt`, canonical y metadatos por página. El LCP del catálogo y del producto
en móvil sigue por encima de 2.5 s: la imagen principal llega después del JS y de la API.

### Optimizaciones aplicadas en la fase 9

| Cambio | Efecto |
| --- | --- |
| SignalR se carga con `import()` solo con sesión iniciada | −56 KB del bundle inicial |
| Zod sale del bundle inicial (validación del carrito escrita a mano; Zod solo en chunks de formularios) | −82 KB del bundle inicial |
| Sección de categorías con altura reservada y skeleton | CLS de inicio 0.096 → 0.000 |
| Resultado | Bundle inicial 470 KB → 339 KB; LCP móvil de inicio 3.5 s → 2.0 s |

### Pendiente

- **Catálogo en móvil (LCP 3.2 s):** el LCP es la primera imagen de producto, que llega después de
  JS + API. Opciones para la fase 10: prerender/hidratación de datos críticos, imágenes AVIF/WebP con
  `srcset` y `<link rel="preload">` de la imagen principal.
- **TBT en móvil:** dominado por React + router + RTK en el bundle principal; evaluar dividir
  el runtime de RTK Query de las rutas que no consultan la API.
- **Buenas prácticas 96:** el 401 de `/auth/me` para visitantes anónimos aparece en consola. Es la
  respuesta correcta de la API; se acepta.
- ~~**SEO 92:** falta `robots.txt`~~ → resuelto en la fase 10 (SEO 100).

## Accesibilidad automatizada (axe, WCAG 2.2 A/AA)

Sin violaciones en escritorio y móvil para: inicio, catálogo, detalle de producto, carrito, login,
registro, recuperar contraseña, 404 y formulario con errores de validación.

Además, Playwright comprueba: enlace "Saltar al contenido" con teclado, búsqueda sin mouse,
y el flujo completo de compra y de administración en un viewport de teléfono.

## Revisión manual (lista de comprobación)

Lo automático no cubre todo. Antes de publicar se recorre con teclado y lector de pantalla
(NVDA + Firefox, VoiceOver + Safari):

- [ ] Orden de tabulación lógico y foco siempre visible en tienda y panel.
- [ ] Diálogos (variantes, ajustes de stock, confirmaciones) atrapan el foco y lo devuelven al cerrar.
- [ ] Los avisos en tiempo real se anuncian sin mover el foco.
- [ ] Zoom al 200 % y ancho de 320 px sin pérdida de contenido ni scroll horizontal de la página.
- [ ] `prefers-reduced-motion` desactiva las animaciones.
