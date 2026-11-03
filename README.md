# Nexora

E-commerce de tecnología para el mercado peruano (precios en soles, IGV incluido).
Proyecto de portafolio: storefront + panel administrativo sobre una API REST propia.

> Estado: **Fase 1 — Fundamentos.** Solo existe el scaffold del frontend.

## Stack

| Capa     | Tecnología                                                                 |
| -------- | -------------------------------------------------------------------------- |
| Frontend | React 19, TypeScript 6 (strict), Vite 8, React Router, Redux Toolkit + RTK Query |
| Backend  | ASP.NET Core (.NET 10 LTS), EF Core, PostgreSQL _(pendiente)_              |
| Calidad  | ESLint 10, Prettier, Vitest, Testing Library, Playwright _(pendiente)_     |

## Estructura

```
nexora/
  frontend/   SPA (storefront + admin con carga diferida)
  backend/    Solución ASP.NET Core (pendiente)
  docs/adr/   Decisiones de arquitectura
```

## Requisitos

- Node.js >= 22.12 y pnpm
- .NET SDK 10 y Docker (para el backend, próximamente)

## Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

| Script              | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `pnpm dev`          | Servidor de desarrollo                    |
| `pnpm build`        | Typecheck + build de producción           |
| `pnpm typecheck`    | Verificación de tipos (`tsc -b`)          |
| `pnpm lint`         | ESLint con reglas type-aware y a11y       |
| `pnpm format:check` | Verifica formato con Prettier             |
| `pnpm test`         | Pruebas unitarias con Vitest              |

## Decisiones de arquitectura

- [ADR-0001 — Renderizado SPA y estrategia SEO](docs/adr/0001-spa-rendering-and-seo.md)
- [ADR-0002 — Moneda (PEN) e IGV](docs/adr/0002-currency-and-tax.md)
- [ADR-0003 — Herramientas de lint y versión de TypeScript](docs/adr/0003-lint-tooling-and-typescript-version.md)
