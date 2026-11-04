# ADR-0006 — Carrito, checkout, stock y pagos

- Estado: Aceptada
- Fecha: 2026-11-03

## Decisiones

**El carrito vive en el navegador y solo guarda `variantId` + cantidad.** Redux (`cartSlice`) y
`localStorage` (validado con Zod al cargarlo). Nunca precios: un carrito manipulado no puede cambiar
lo que se cobra. Precios, stock, envío, total e IGV salen siempre de `POST /cart/quote`.

**El envío se deriva del destino, no lo elige el cliente.** Lima y Callao: S/ 15 (1–2 días);
provincias: S/ 25 (3–5 días); gratis desde S/ 500. Todo en configuración (`Shipping`).

**Checkout transaccional con reserva atómica.** Dentro de una transacción, por cada línea:

```sql
UPDATE inventory_items SET reserved = reserved + @qty
WHERE variant_id = @id AND on_hand - reserved >= @qty
```

Si alguna línea afecta 0 filas se hace rollback y se responde 409. Al ser una sola sentencia
condicional no hay ventana "leer y luego escribir": dos compras simultáneas no pueden llevarse la
última unidad (hay una prueba de integración con 5 compras concurrentes). Las restricciones CHECK de
la base de datos son la última defensa.

**Idempotencia.** El cliente envía `Idempotency-Key` (UUID). Hay un índice único
`(user_id, idempotency_key)`: reintentar devuelve el mismo pedido (200) en vez de duplicarlo, incluso
si dos peticiones con la misma clave compiten. El frontend reutiliza la clave mientras el resultado
sea desconocido (error de red) y la renueva tras una respuesta definitiva. Nada se reintenta
automáticamente.

**Snapshots en el pedido.** Nombre, SKU, precio unitario, dirección, tarifa de envío, IGV y tasa
aplicada se copian al pedido; cambios futuros del catálogo no alteran pedidos pasados.

**Pagos detrás de `IPaymentGateway`.** Hoy, una pasarela simulada (`Payments:Provider = Fake`) que
lleva a `/checkout/pay/{número}`, donde se aprueba o rechaza. Aprobar convierte la reserva en venta
(`on_hand -= q`, `reserved -= q`); rechazar la libera. Mercado Pago se integrará implementando la
interfaz y un webhook que llame al mismo `ConfirmPaymentAsync`, sin tocar el checkout.

**Expiración de reservas.** Un `BackgroundService` cancela cada minuto los pedidos impagos con más
de 30 minutos y libera su stock. El pedido usa `xmin` de PostgreSQL como token de concurrencia
optimista: confirmación de pago y expiración nunca pisan el mismo pedido.

**Privacidad de pedidos.** Las consultas filtran por dueño en el propio SQL; el pedido de otro
cliente responde 404 (no 403), sin revelar que existe. Los números de pedido (`NX-` + 8 caracteres
Crockford base32 aleatorios) no son enumerables.

**FluentValidation** se adopta ahora: el pedido tiene objetos anidados y colecciones con reglas
cruzadas (sin variantes repetidas, máximo de líneas). Los errores se devuelven con la ruta JSON
(`shippingAddress.phone`, `items[0].quantity`).

## Pendiente

- Integración real con Mercado Pago (credenciales de prueba + webhook firmado).
- Direcciones guardadas en la cuenta del cliente.
- Comprobante electrónico SUNAT (fuera de alcance, ADR-0002).
