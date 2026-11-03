# ADR-0002 — Moneda (PEN) e IGV

- Estado: Aceptada
- Fecha: 2026-11-03

## Contexto

La tienda vende en Perú. En Perú, el precio que se muestra al consumidor debe ser el
precio final, con impuestos incluidos.

## Decisión

- Moneda única: **PEN** (soles). Los DTO incluyen `currency: "PEN"` para evitar ambigüedad.
- `ProductVariant.Price` se almacena **con IGV incluido** en `numeric(12,2)`; en C# siempre `decimal`.
- Tasa de IGV configurable mediante opciones tipadas (`TaxOptions.IgvRate`, valor inicial `0.18`).
  Verificar la tasa vigente en SUNAT antes de la Fase 6.
- El backend calcula al crear el pedido: `base = total / (1 + tasa)`, `igv = total - base`,
  redondeo a 2 decimales (`MidpointRounding.AwayFromZero`), cubierto con pruebas xUnit.
- El pedido guarda un _snapshot_ de base, IGV, tasa aplicada, envío y total.
- Formato en frontend: `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`
  centralizado en una única utilidad `formatPrice`.

## Fuera de alcance

Emisión de comprobantes electrónicos (boleta/factura) ante SUNAT y captura de DNI/RUC.
