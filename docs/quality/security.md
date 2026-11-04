# Revisión de seguridad

Fecha: 2026-11-04 · Alcance: API ASP.NET Core, SPA React y pipeline de CI.

## Controles verificados

| Área | Control | Cómo se verifica |
| --- | --- | --- |
| Autenticación | Cookie `__Host-`, HttpOnly, Secure, SameSite=Lax; lockout; rate limiting | Pruebas de integración (`AuthEndpointTests`) |
| CSRF | Token antiforgery obligatorio en POST/PUT/PATCH/DELETE | `UnsafeRequestsWithoutAntiforgeryTokenAreRejected` |
| Autorización | Todo `api/v1/admin/*` exige `AdminOnly`; solo una lista explícita de endpoints es pública | `EndpointAuthorizationTests` (falla si aparece un endpoint público nuevo) |
| Datos ajenos | Pedidos filtrados por dueño en SQL (404, no 403) | `OrdersOfOtherCustomersAreNotFound` |
| Tiempo real | Hub autenticado, grupos por rol, validación de Origin, cierre al expirar la sesión | `NotificationsHubTests` |
| Cabeceras API | `nosniff`, `X-Frame-Options: DENY`, CSP `default-src 'none'`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, sin cabecera `Server` | `SecurityHeadersTests` |
| Caché | `Cache-Control: no-store` en auth, pedidos, checkout, carrito y admin | `PrivateEndpointsAreNeverCached` |
| Tamaño de petición | Kestrel rechaza cuerpos > 1 MB con 413 (Problem Details) | Verificado contra la API real con `curl` (TestServer no usa Kestrel) |
| HTTPS | HSTS + redirección fuera de Development | Configuración en `Program.cs` |
| CSP del frontend | `script-src 'self'` sin `unsafe-inline` ni `unsafe-eval`; `connect-src` limitado a la API | E2E: cero violaciones de CSP durante la compra completa |
| XSS | Sin `dangerouslySetInnerHTML`; HTML de correos codificado; React escapa por defecto | Revisión de código |
| Inyección CSV | Celdas `= + - @` neutralizadas | `CsvWriterTests`, `OrdersCsvIsProtectedAgainstFormulaInjection` |
| SQL | Solo EF Core parametrizado; comodines LIKE escapados | `SearchTreatsLikeWildcardsAsLiterals` |
| Open redirect | `returnTo` limitado a rutas locales | `safeRedirect.test.ts`, `LoginPage.test.tsx` |
| Secretos | Nada en el repositorio; user-secrets / variables de entorno | gitleaks sobre todo el historial: sin hallazgos |

## Hallazgo corregido en esta revisión

- **Zod y la CSP:** Zod 4 compila validadores con `new Function`; con nuestra CSP eso generaba una
  violación (`script-src eval`). Ahora todos los esquemas importan `z` desde `@/lib/validation/z`
  (modo `jitless`) y una regla de ESLint prohíbe importar `zod` directamente.
- **413 convertido en 500:** el límite de Kestrel lanzaba `BadHttpRequestException` y el manejador
  global la convertía en error interno. `BadHttpRequestExceptionHandler` respeta su código.

## Dependencias

- `pnpm audit --prod`: **sin vulnerabilidades** (lo que llega al navegador).
- `dotnet list package --vulnerable --include-transitive`: **sin vulnerabilidades**.
- Riesgo aceptado, solo herramientas de desarrollo (no se publican):
  - `deepmerge` ≤ 4.3.1 (bajo, sin parche) vía CLI de shadcn.
  - `minimatch` (moderado) vía ESLint y ts-morph; el parche exige minimatch 11, incompatible con ESLint.
  Se revisan con cada PR de Dependabot.

El CI falla ante vulnerabilidades en dependencias de producción (npm y NuGet) y ante secretos (gitleaks).

## Pendiente para el despliegue (fase 11)

- Cabeceras del sitio estático: `frame-ancestors 'none'`, HSTS y `Permissions-Policy` en el hosting
  (un `<meta>` no puede declarar `frame-ancestors`).
- `ForwardedHeaders` detrás del proxy inverso, para que rate limiting y HTTPS vean la IP y el esquema reales.
- Backplane de SignalR si hay más de una instancia.
