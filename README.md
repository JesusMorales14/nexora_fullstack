# Nexora

E-commerce de tecnología para el mercado peruano (precios en soles, IGV incluido).
Proyecto de portafolio: storefront + panel administrativo sobre una API REST propia.

> Estado: **Fases 1–4 (catálogo).** Storefront con catálogo, búsqueda, filtros y detalle de
> producto conectado a la API. Pendiente: autenticación, carrito, checkout y panel admin.

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
instalado localmente).

### 2. API

La cadena de conexión es un secreto local y se guarda con `dotnet user-secrets`, nunca en `appsettings`:

```bash
cd backend
dotnet tool restore
dotnet user-secrets set "ConnectionStrings:Nexora" "Host=localhost;Port=5433;Database=nexora;Username=nexora;Password=<tu-password>" --project src/Nexora.Api
dotnet run --project src/Nexora.Api
```

En `Development` la API aplica las migraciones y carga un catálogo de ejemplo al iniciar.

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

Los errores se devuelven como Problem Details (RFC 9457) con `traceId`.

## Variables de entorno

| Variable                 | Dónde              | Descripción                                    |
| ------------------------ | ------------------ | ---------------------------------------------- |
| `POSTGRES_*`             | `.env` (raíz)      | Credenciales del contenedor local              |
| `ConnectionStrings:Nexora` | user-secrets     | Conexión de la API a PostgreSQL                |
| `VITE_API_BASE_URL`      | `frontend/.env.local` | URL pública de la API (por defecto `/api/v1`) |

Todo `VITE_*` termina en el navegador: nunca contiene secretos.

## Decisiones de arquitectura

- [ADR-0001 — Renderizado SPA y estrategia SEO](docs/adr/0001-spa-rendering-and-seo.md)
- [ADR-0002 — Moneda (PEN) e IGV](docs/adr/0002-currency-and-tax.md)
- [ADR-0003 — Herramientas de lint y versión de TypeScript](docs/adr/0003-lint-tooling-and-typescript-version.md)
- [ADR-0004 — Arquitectura del catálogo](docs/adr/0004-catalog-architecture.md)
