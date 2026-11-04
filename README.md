# Nexora

E-commerce de tecnología para el mercado peruano (precios en soles, IGV incluido).
Proyecto de portafolio: storefront + panel administrativo sobre una API REST propia.

> Estado: **Fases 1–8.** Tienda completa (catálogo, cuentas, carrito, checkout con pago simulado,
> pedidos), panel administrativo (productos, categorías, inventario, pedidos, clientes, reportes,
> administradores, auditoría) y notificaciones en tiempo real con SignalR. Pendiente: calidad y
> seguridad (fase 9), PWA/SEO y despliegue.

## Stack

| Capa     | Tecnología                                                                          |
| -------- | ----------------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript 6 (strict), Vite 8, React Router 8 (data mode), Redux Toolkit + RTK Query, Tailwind CSS 4, shadcn/ui |
| Backend  | ASP.NET Core (.NET 10 LTS, controllers), EF Core 10, PostgreSQL 18                  |
| Calidad  | ESLint 10, Prettier, Vitest + Testing Library + MSW, xUnit v3 + Testcontainers, GitHub Actions |

## Estructura

```
nexora/
  frontend/              SPA (storefront + admin con carga diferida)
    src/app/             store, router, providers
    src/features/        código por funcionalidad (products, cart, ...)
    src/components/      ui/ (shadcn) y shared/
    src/lib/             api/ (RTK Query base) y utils/
  backend/
    src/Nexora.Api             controllers, Problem Details, composición
    src/Nexora.Application     DTOs, validación de consultas, contratos
    src/Nexora.Domain          entidades e invariantes
    src/Nexora.Infrastructure  EF Core, PostgreSQL, migraciones, seed
    tests/                     UnitTests e IntegrationTests (PostgreSQL real)
  docs/adr/              decisiones de arquitectura
  docker-compose.yml     PostgreSQL local
```

## Requisitos

- Node.js >= 22.12 y pnpm
- .NET SDK 10
- Docker Desktop (PostgreSQL local y pruebas de integración)

## Puesta en marcha

### 1. Base de datos

```bash
cp .env.example .env        # elige tu propia contraseña local
docker compose up -d
```

El contenedor expone PostgreSQL solo en `127.0.0.1:5433` (5433 para no chocar con un PostgreSQL
instalado localmente). También levanta **MailPit**, que captura los correos de desarrollo
(recuperación de contraseña): http://localhost:8025

### 2. API

La cadena de conexión es un secreto local y se guarda con `dotnet user-secrets`, nunca en `appsettings`:

```bash
cd backend
dotnet tool restore
dotnet user-secrets set "ConnectionStrings:Nexora" "Host=localhost;Port=5433;Database=nexora;Username=nexora;Password=<tu-password>" --project src/Nexora.Api
# Opcional: administrador inicial (solo se crea si no existe)
dotnet user-secrets set "Seed:Admin:Email" "admin@nexora.local" --project src/Nexora.Api
dotnet user-secrets set "Seed:Admin:Password" "<una-clave-de-al-menos-10-caracteres>" --project src/Nexora.Api
dotnet run --project src/Nexora.Api
```

En `Development` la API aplica las migraciones, carga un catálogo de ejemplo y crea el
administrador configurado al iniciar. `dotnet user-secrets list --project src/Nexora.Api` muestra los
valores guardados.

- API: http://localhost:5080/api/v1/products
- Documentación OpenAPI (Scalar): http://localhost:5080/scalar
- Health check: http://localhost:5080/health

### 3. Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

Abre http://localhost:5173. Vite reenvía `/api` a la API (mismo origen en desarrollo, sin CORS).

## Comprobaciones

| Frontend (`frontend/`) | Backend (`backend/`)                  |
| ---------------------- | ------------------------------------- |
| `pnpm lint`            | `dotnet build` (analizadores, warnings = errores) |
| `pnpm typecheck`       | `dotnet format --verify-no-changes`   |
| `pnpm format:check`    | `dotnet test` (requiere Docker)       |
| `pnpm test`            |                                       |
| `pnpm build`           |                                       |

GitHub Actions ejecuta todo lo anterior en cada push y pull request.

## API (v1)

| Método | Ruta                     | Descripción                                                                 |
| ------ | ------------------------ | --------------------------------------------------------------------------- |
| GET    | `/api/v1/products`       | Lista paginada. `q`, `category`, `brand`, `minPrice`, `maxPrice`, `inStock`, `sort` (`relevance`, `price_asc`, `price_desc`, `name_asc`), `page`, `pageSize` (≤ 48) |
| GET    | `/api/v1/products/{slug}`| Detalle de un producto publicado                                            |
| GET    | `/api/v1/categories`     | Categorías (con `parentSlug`)                                               |
| GET    | `/api/v1/brands`         | Marcas                                                                      |
| GET    | `/api/v1/auth/csrf`      | Token antiforgery para enviar en `X-XSRF-TOKEN`                             |
| GET    | `/api/v1/auth/me`        | Usuario de la sesión (401 si es anónimo)                                    |
| POST   | `/api/v1/auth/register`  | Crea la cuenta (rol Customer) e inicia sesión                               |
| POST   | `/api/v1/auth/login`     | Inicia sesión (cookie HttpOnly)                                             |
| POST   | `/api/v1/auth/logout`    | Cierra la sesión                                                            |
| POST   | `/api/v1/auth/forgot-password` | Envía el enlace de recuperación (siempre 202)                         |
| POST   | `/api/v1/auth/reset-password`  | Cambia la contraseña con el token del correo                          |
| GET    | `/api/v1/admin/summary`  | Indicadores del dashboard (rol Admin)                                       |
| POST   | `/api/v1/cart/quote`     | Cotiza un carrito: precios, stock, envío (si hay `department`), total e IGV |
| POST   | `/api/v1/checkout`       | Crea el pedido y reserva stock. Requiere sesión y `Idempotency-Key`         |
| GET    | `/api/v1/orders`         | Pedidos del usuario                                                         |
| GET    | `/api/v1/orders/{number}`| Detalle (404 si no es del usuario)                                          |
| POST   | `/api/v1/orders/{number}/simulated-payment` | Aprueba/rechaza el pago (solo con la pasarela simulada) |
| *      | `/api/v1/admin/...`      | Panel (rol Admin): `products`, `categories`, `brands`, `inventory`, `orders`, `customers`, `reports/orders.csv`, `administrators`, `audit-log`. Detalle en OpenAPI (`/scalar`) |

Los errores se devuelven como Problem Details (RFC 9457) con `traceId`. Todo `POST/PUT/PATCH/DELETE`
requiere la cabecera `X-XSRF-TOKEN`; los endpoints de auth tienen rate limiting por IP.

## Variables de entorno

| Variable                 | Dónde              | Descripción                                    |
| ------------------------ | ------------------ | ---------------------------------------------- |
| `POSTGRES_*`             | `.env` (raíz)      | Credenciales del contenedor local              |
| `ConnectionStrings:Nexora` | user-secrets     | Conexión de la API a PostgreSQL                |
| `Seed:Admin:*`           | user-secrets       | Administrador inicial (solo Development)       |
| `Frontend:BaseUrl`       | appsettings / entorno | URL pública de la tienda (enlaces de correo) |
| `Frontend:AllowedCorsOrigins` | entorno       | Orígenes con CORS + credenciales (producción)  |
| `Email:Smtp:*`           | appsettings / secretos | Servidor SMTP (`Password` siempre como secreto) |
| `Shipping:*`             | appsettings        | Tarifas de envío y umbral de envío gratis      |
| `Tax:IgvRate`            | appsettings        | Tasa de IGV (0.18)                             |
| `Payments:*`             | appsettings        | Pasarela (`Fake`), ventana de pago, barrido de expiración |
| `VITE_API_BASE_URL`      | `frontend/.env.local` | URL pública de la API (por defecto `/api/v1`) |

Todo `VITE_*` termina en el navegador: nunca contiene secretos.

## Decisiones de arquitectura

- [ADR-0001 — Renderizado SPA y estrategia SEO](docs/adr/0001-spa-rendering-and-seo.md)
- [ADR-0002 — Moneda (PEN) e IGV](docs/adr/0002-currency-and-tax.md)
- [ADR-0003 — Herramientas de lint y versión de TypeScript](docs/adr/0003-lint-tooling-and-typescript-version.md)
- [ADR-0004 — Arquitectura del catálogo](docs/adr/0004-catalog-architecture.md)
- [ADR-0005 — Autenticación, sesiones y CSRF](docs/adr/0005-authentication-and-sessions.md)
- [ADR-0006 — Carrito, checkout, stock y pagos](docs/adr/0006-cart-checkout-and-payments.md)
- [ADR-0007 — Panel administrativo](docs/adr/0007-admin-panel.md)
- [ADR-0008 — Notificaciones en tiempo real (SignalR)](docs/adr/0008-realtime-notifications.md)
