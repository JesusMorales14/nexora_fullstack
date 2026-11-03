# ADR-0003 — Herramientas de lint y versión de TypeScript

- Estado: Aceptada
- Fecha: 2026-11-03

## Contexto

La plantilla `react-ts` de create-vite 9.3 genera el proyecto con **oxlint** y
**TypeScript 7** (compilador nativo). La especificación del proyecto pide ESLint, y la
accesibilidad (WCAG 2.2 AA) es un requisito central.

Compatibilidad verificada el 2026-11-03:

- `typescript-eslint` 8.72 declara `typescript >=4.8.4 <6.1.0`: aún no soporta TypeScript 7.
- ESLint 9 está marcado como _deprecated_ en npm; la versión soportada es ESLint 10.
- `eslint-plugin-jsx-a11y` no publica desde 2024 y no declara soporte para ESLint 10.
- `eslint-plugin-jsx-a11y-x` (fork mantenido por es-tooling) soporta ESLint 9 y 10.

## Decisión

- **TypeScript `~6.0.3`** con `strict` y `noUncheckedIndexedAccess`.
- **ESLint 10** con `typescript-eslint` (`strictTypeChecked` + `stylisticTypeChecked`),
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` y `eslint-plugin-jsx-a11y-x`.
- **Prettier** para formato; `eslint-config-prettier` desactiva reglas que entrarían en conflicto.

## Consecuencias

- Perdemos la velocidad de TypeScript 7 en el typecheck; con el tamaño actual es irrelevante.
- Reevaluar la migración a TypeScript 7 cuando `typescript-eslint` la soporte.
