# ADR-0005 — Autenticación, sesiones y CSRF

- Estado: Aceptada
- Fecha: 2026-11-03

## Contexto

La tienda necesita registro, login, recuperación de contraseña y un rol de administrador.
La especificación prefiere sesiones con cookies seguras frente a tokens en `localStorage`.

## Decisión

**ASP.NET Core Identity + cookie de sesión.** Identity resuelve hashing (PBKDF2), lockout,
security stamps y tokens de recuperación; no implementamos criptografía propia. Usamos controladores
propios en lugar de `MapIdentityApi` para controlar los contratos, los mensajes en español y la
política anti-enumeración.

**Cookie de sesión:** `HttpOnly` (JavaScript no puede leerla, mitiga robo por XSS), `Secure`,
`SameSite=Lax`, prefijo `__Host-` (sin `Domain`, `Path=/`), expiración deslizante de 7 días.
El security stamp se revalida cada 5 minutos: un reset de contraseña cierra las demás sesiones.

**CSRF:** `SameSite=Lax` ya bloquea la mayoría de envíos cross-site, pero no es suficiente sola
(subdominios hermanos son "same-site"). Todo `POST/PUT/PATCH/DELETE` exige el token antiforgery en
la cabecera `X-XSRF-TOKEN` (`AntiforgeryValidationFilter`). El SPA obtiene el token con
`GET /auth/csrf`, lo guarda solo en memoria y lo descarta tras login/registro/logout porque el token
está ligado a la identidad. Un token vencido se reintenta una vez: el servidor lo rechaza antes de
ejecutar la acción, así que el reintento no duplica efectos.

**Anti-enumeración:** login responde igual ante correo inexistente, contraseña incorrecta o cuenta
bloqueada; `forgot-password` responde siempre 202. Excepción consciente: el registro informa
"ya existe una cuenta con este correo" (mejor UX), mitigado con rate limiting.

**Fuerza bruta:** lockout de 15 minutos tras 5 fallos + rate limiting por IP (10/min) en los
endpoints de auth. Detrás de un proxy inverso hará falta `ForwardedHeaders` (fase 11).

**Política de contraseñas (NIST SP 800-63B):** mínimo 10 caracteres y 4 distintos, sin reglas de
composición obligatorias.

**Autorización:** política `AdminOnly` declarada a nivel de controlador en todo el área admin. Los
guards de React (`RequireAuth`, `RequireAdmin`) son solo UX.

**Data Protection** persiste sus claves en PostgreSQL para que las cookies sobrevivan reinicios y
funcionen con varias instancias.

**Desarrollo local** corre sobre HTTP (navegador → proxy de Vite → API): ahí las cookies usan
`SameAsRequest` y no llevan el prefijo `__Host-`. En cualquier otro entorno, incluidas las pruebas de
integración (que corren sobre HTTPS), son `Secure` siempre.

## Despliegue con orígenes distintos

Si el storefront y la API viven en `nexora.pe` y `api.nexora.pe`, son *cross-origin* pero
*same-site*: `SameSite=Lax` funciona, y CORS debe listar el origen exacto (`Frontend:AllowedCorsOrigins`)
con credenciales; nunca `AllowAnyOrigin` + `AllowCredentials`.

## Pendiente

- Confirmación de correo antes de permitir comprar.
- Endpoint "cerrar todas las sesiones" (rotar el security stamp a demanda).
