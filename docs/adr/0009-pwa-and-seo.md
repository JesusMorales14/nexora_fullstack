# ADR-0009 — PWA y SEO

- Estado: aceptado
- Fecha: 2026-11-04
- Relacionado: [ADR-0001](0001-spa-rendering-and-seo.md) (SPA + metadatos desde el servidor)

## Contexto

La tienda es una SPA (ADR-0001). Necesita:

- Que los buscadores y las vistas previas de redes sociales vean el título, la descripción, la imagen y el precio de cada producto.
- Que se pueda instalar como PWA y abrir lo ya visitado sin conexión.

Un service worker mal configurado puede servir datos privados o desactualizados (pedidos, carrito, sesión), o recargar la página en medio de un checkout. Por eso las reglas de caché son parte de la decisión, no un detalle.

## Decisión

### SEO

| Pieza | Implementación |
| --- | --- |
| `sitemap.xml` | La API lo genera desde la BD (`SeoController`): inicio, catálogo, una URL por categoría y los productos **publicados** con `lastmod`. URLs absolutas con `Frontend:BaseUrl`. |
| Metadatos de producto sin JS | `GET /seo/products/{slug}` devuelve el `index.html` del build con `<title>`, descripción, canonical, Open Graph, `product:price:*` y JSON-LD `Product` (precio en PEN y disponibilidad). El host de la tienda envía a esa ruta las peticiones HTML de `/products/:slug`; `vite preview` lo hace con un proxy. |
| Producto inexistente o borrador | El mismo shell con **404** y `noindex`. |
| Escapado | Atributos con `WebUtility.HtmlEncode`; JSON-LD con `JavaScriptEncoder.Default` (`<`, `>` y `&` como `\uXXXX`). Una prueba crea un producto con `</script><script>…` en el nombre y verifica que no rompe el documento. |
| Plantilla | Se lee de `Frontend:IndexHtmlUrl` (o `{BaseUrl}/index.html`), nunca de una URL que venga de la petición: no hay SSRF. Caché de 5 minutos. |
| CSP de esas páginas | El middleware ya no les aplica el `default-src 'none'` de la API, que bloquearía la SPA. Usa `frame-ancestors 'none'; object-src 'none'; base-uri 'self'`; la política completa llega en el `<meta>` del build. |
| En el navegador | `PageMeta` (React 19 sube `<title>`, `<meta>` y `<link>` a `<head>`) con canonical y Open Graph por página. Al arrancar se borran los metadatos estáticos y los del servidor para no duplicarlos. |
| `noindex` | Páginas privadas (`/admin`, `/account`, `/cart`, `/checkout`, `/orders`, auth), búsquedas, combinaciones de filtros, orden y páginas > 1. Solo se indexan el catálogo completo y las categorías, que son las URLs del sitemap. |
| `robots.txt` | Se genera en el build. Bloquea las áreas privadas, `/api/` y `/hubs/`. Añade `Sitemap:` solo si se define `VITE_SITE_URL`, porque la directiva exige una URL absoluta. |

### PWA (`vite-plugin-pwa` 2.0, Workbox 7.4)

- **Manifest:**
  - nombre, `lang: es-PE`, `display: standalone`, color de tema;
  - iconos 64/192/512, maskable 512 y apple-touch 180, generados desde `favicon.svg` con `@vite-pwa/assets-generator`.
- **Precache:** solo el shell y los assets del build (JS, CSS, HTML e iconos). Las imágenes de producto no se precachean: se guardan en caché cuando se ven.
- **Caché en tiempo de ejecución:**
  - imágenes: `CacheFirst`, 120 entradas, 30 días;
  - lecturas públicas `GET /api/v1/{products,categories,brands}`: `NetworkFirst`, con timeout de 4 s, 80 entradas y 1 día.
- **Por qué `NetworkFirst` y no `StaleWhileRevalidate`:** con SWR, el refetch que lanza un evento de tiempo real (stock, precio) recibiría primero la copia vieja. Con red, siempre se ve el dato actual; la caché es solo la copia para estar offline.
- **Nunca se cachean** auth, carrito, checkout, pedidos, admin ni el hub de SignalR, porque ninguna regla los incluye. La API además les envía `Cache-Control: no-store`.
- **`navigateFallback`:** `index.html`, salvo `/api/`, `/hubs/`, `/seo/`, `/sitemap.xml` y `/robots.txt`.
- **Actualizaciones controladas:**
  - `registerType: 'prompt'`: una versión nueva espera hasta que el usuario pulsa "Actualizar", así nunca se recarga en medio de un formulario o pago;
  - se buscan versiones nuevas cada hora para las pestañas que quedan abiertas mucho tiempo.
- **Sin service worker en desarrollo ni en pruebas** (`devOptions.enabled: false`).
- **Sin conexión:**
  - un banner con `role="status"` lo anuncia;
  - el botón "Ir a pagar" se desactiva y explica el motivo;
  - los pedidos no se encolan ni se finge un éxito.

## Alternativas descartadas

- **SSR o prerender** (ADR-0001, opción 3): resolvería el LCP del catálogo, pero obliga a un servidor Node o a un framework. Para un catálogo que cambia en tiempo real, la inyección de metadatos cubre lo que necesitan los rastreadores.
- **Cachear también el carrito o los pedidos para verlos offline:** son datos de una sesión. En un equipo compartido podrían quedar visibles para otra persona tras cerrar sesión.
- **Sincronización en segundo plano de pedidos:** un pedido creado más tarde puede encontrar otro precio u otro stock. La persona debe ver el resultado real en el momento.

## Consecuencias

- El host de producción (fase 11) debe:
  - enviar las peticiones `Accept: text/html` de `/products/:slug` a `/seo/products/:slug`;
  - servir `/sitemap.xml` desde la API.
- El precache pesa unos 950 KB (86 entradas, incluidos los chunks del panel). Se puede reducir excluyendo los chunks de admin si llega a molestar.
- Si la API vive en otro origen, Workbox no aplica la regla del catálogo a esas URLs (la expresión no está anclada al origen) y esas lecturas no se guardan offline. Es aceptable; se revisará en el despliegue.
