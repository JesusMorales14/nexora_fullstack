# ADR-0001 — Renderizado SPA y estrategia SEO

- Estado: Aceptada
- Fecha: 2026-11-03

## Contexto

El catálogo cambia en tiempo real desde el panel administrativo. Necesitamos que las
páginas de producto sean indexables y tengan vistas previas en redes sociales, pero el
estado remoto se gestiona con RTK Query y el backend es ASP.NET Core (no Node).

## Opciones evaluadas

1. **React Router en _data mode_ (SPA pura).** Una sola capa de datos (RTK Query), despliegue estático.
2. **React Router _framework mode_ con prerender.** El HTML se genera en build: un producto creado
   desde el admin no existe para los buscadores hasta el siguiente despliegue.
3. **SSR completo.** Requiere un servidor Node adicional e hidratar la caché de RTK Query.

## Decisión

Opción 1. El frontend es una SPA con `createBrowserRouter`; el admin se carga con `lazy()`.

## Consecuencias

- Google renderiza JavaScript, pero los rastreadores sociales (WhatsApp, Facebook, X) no.
- Mitigación prevista para la Fase 10:
  - `sitemap.xml` y `robots.txt` generados por la API desde la base de datos.
  - Para `/products/:slug`, el servidor devuelve `index.html` con `<title>`, descripción,
    Open Graph, canonical y JSON-LD `Product` ya insertados.
  - `noindex` / canonical en combinaciones de filtros para evitar contenido duplicado.
- Si el SEO se vuelve crítico, se reevalúa la opción 3 en un ADR nuevo.
