# ADR-0004 — Arquitectura del catálogo

- Estado: Aceptada
- Fecha: 2026-11-03

## Decisiones

**Capas sin MediatR ni repositorios genéricos.** `Application` define el contrato de lectura
`IProductCatalog` y los DTO; `Infrastructure` lo implementa con proyecciones de EF Core directas
a los DTO (`Select(new ProductSummaryResponse(...))`). Las entidades nunca salen de la capa de
persistencia y no hay una abstracción intermedia que no aporte nada.

**Stock en `inventory_items`, separado de `product_variants`.** Las ediciones del admin sobre el
catálogo y los descuentos de stock del checkout no compiten por la misma fila. Restricciones CHECK
en la base de datos (`on_hand >= 0`, `reserved <= on_hand`) son la última defensa contra la
sobreventa; el checkout (fase 6) usará un `UPDATE ... WHERE on_hand - reserved >= @qty` atómico.

**Validación de consultas en `Application`, no FluentValidation (por ahora).** Un único objeto de
consulta con reglas simples no justifica la dependencia. Se reevaluará con los comandos de escritura
del admin, donde las reglas crecen.

**Búsqueda con `ILIKE` + índice trigram (`pg_trgm`).** Suficiente para el tamaño del catálogo y
soporta búsquedas parciales. Los comodines `%` y `_` del usuario se escapan. Si se necesita ranking
lingüístico se migrará a full-text search de PostgreSQL.

**Filtros en la URL, no en Redux.** El frontend lee filtros desde `searchParams`; RTK Query cachea
cada combinación por argumentos. Los enlaces se pueden compartir y el botón atrás funciona.

**Selects y radios nativos.** Mejor soporte de teclado, lectores de pantalla y pantallas táctiles
que un componente personalizado, sin JavaScript adicional.

**Identificadores UUID v7.** Generados en el dominio (`Guid.CreateVersion7()`): ordenables en el
tiempo (buen comportamiento en índices B-tree) y no enumerables como un entero secuencial.
