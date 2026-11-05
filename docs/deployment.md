# Despliegue (pendiente)

Nexora todavía **no está desplegado**: por ahora se ejecuta en localhost (ver README). Este
documento reúne lo que ya está preparado y lo que falta para publicarlo cuando se elija un proveedor.

## Qué ya está preparado

| Tema | Estado |
| --- | --- |
| Build de producción del frontend | `pnpm build` genera un sitio estático (`frontend/dist`) con CSP, PWA y `robots.txt` |
| API | `dotnet publish -c Release backend/src/Nexora.Api` |
| HTTPS | Fuera de `Development`, la API redirige a HTTPS, envía HSTS y usa cookies `Secure` con prefijo `__Host-` |
| Proxy inverso | `ReverseProxy:KnownProxies` (IPs) o `ReverseProxy:KnownNetworks` (CIDR) para confiar en `X-Forwarded-For/Proto`. Sin esto, el rate limiting vería a todos los clientes con la IP del proxy y las cookies `Secure` fallarían detrás de un proxy que termina TLS |
| Claves de Data Protection | Se guardan en PostgreSQL: las sesiones sobreviven a reinicios y a varias instancias |
| Secretos | Ninguno en el repositorio. En producción van como variables de entorno o en el gestor de secretos del proveedor |
| CI | GitHub Actions: lint, tipos, pruebas, E2E, auditoría de dependencias y gitleaks. Pasa en [GitHub](https://github.com/JesusMorales14/nexora_fullstack/actions) |

## Lo que debe hacer el host de la tienda

El host sirve `frontend/dist` y reenvía estas rutas a la API (mismo origen, ver ADR-0001 y ADR-0009):

| Petición | Destino |
| --- | --- |
| `/api/*` | API |
| `/hubs/*` (WebSocket) | API |
| `/sitemap.xml` | API |
| `GET /products/{slug}` con `Accept: text/html` | API en `/seo/products/{slug}` |
| Cualquier otra ruta sin archivo | `index.html` (fallback de la SPA) |

Cabeceras recomendadas en el host:

- `Cache-Control: public, max-age=31536000, immutable` para `/assets/*`;
- `no-cache` para `index.html`, `sw.js` y `manifest.webmanifest`;
- `Content-Security-Policy: frame-ancestors 'none'` (no se puede poner en el `<meta>`).

Ejemplo **no probado** con Caddy, como punto de partida:

```caddyfile
tienda.example.com {
  root * /srv/nexora
  encode zstd gzip

  @api path /api/* /hubs/* /sitemap.xml
  handle @api {
    reverse_proxy api:8080
  }

  @productHtml {
    path_regexp ^/products/[^/]+$
    header Accept *text/html*
  }
  handle @productHtml {
    rewrite * /seo{uri}
    reverse_proxy api:8080
  }

  handle {
    header /assets/* Cache-Control "public, max-age=31536000, immutable"
    header /sw.js Cache-Control "no-cache"
    header Content-Security-Policy "frame-ancestors 'none'"
    try_files {path} /index.html
    file_server
  }
}
```

## Configuración de la API en producción

| Variable de entorno | Valor |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__Nexora` | Conexión a PostgreSQL (secreto) |
| `Frontend__BaseUrl` | `https://tienda.example.com` |
| `ReverseProxy__KnownProxies__0` o `ReverseProxy__KnownNetworks__0` | IP o red del proxy |
| `Email__Smtp__*` | Proveedor SMTP real (`Password` como secreto) |
| `Payments__Provider` | `Fake` (única pasarela implementada; ver ADR-0006) |

El frontend se construye con `VITE_SITE_URL=https://tienda.example.com` para que `robots.txt`
incluya el sitemap.

## Migraciones de base de datos

La API solo migra automáticamente en `Development`. En producción las migraciones son un paso
controlado del despliegue, que se revisa antes de aplicarse:

```bash
cd backend
dotnet tool restore
dotnet ef migrations script --idempotent --project src/Nexora.Infrastructure --startup-project src/Nexora.Api -o migrate.sql
# revisar migrate.sql y aplicarlo con psql antes de arrancar la nueva versión
```

El catálogo de ejemplo y el administrador inicial solo se crean en `Development`. En producción
el primer administrador se crea a mano.

## Pendientes antes de publicar

- [ ] Elegir el proveedor (VPS con Docker, Render/Railway o Azure).
- [x] Crear el remoto en GitHub y comprobar que el CI pasa allí.
- [ ] Dockerfiles o configuración del proveedor, según la opción elegida.
- [ ] Pasarela de pagos real (Mercado Pago u otra) antes de aceptar dinero.
- [ ] Copias de seguridad de PostgreSQL y monitoreo (logs, health check `/health`).
- [ ] Medir Core Web Vitals con datos de campo y revisar el LCP móvil del catálogo.
- [ ] Revisión manual con lector de pantalla (lista en `docs/quality/performance-and-accessibility.md`).
