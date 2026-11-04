# ADR-0007 — Panel administrativo

- Estado: Aceptada
- Fecha: 2026-11-04

## Decisiones

**Autorización en la API, por controlador.** Todos los controladores de `api/v1/admin` llevan
`[Authorize(Policy = "AdminOnly")]` a nivel de clase: ninguna acción queda pública por olvido. Las
pruebas de integración verifican 401 (anónimo) y 403 (cliente). `RequireAdmin` en React es solo UX.

**Concurrencia optimista en productos.** El detalle devuelve `version` (columna `xmin` de PostgreSQL).
El PUT la reenvía; si otra persona guardó antes, la API responde 409 y la interfaz ofrece recargar.
Así dos administradores no se pisan cambios en silencio.

**El stock solo cambia por movimientos.** El formulario de producto no edita cantidades. Cada cambio
de `on_hand` queda en `inventory_movements` (reposición, corrección, daño, devolución o venta, con
actor, nota y referencia al pedido). Los ajustes manuales usan el mismo `UPDATE` condicional que el
checkout y no pueden dejar menos unidades que las reservadas. "Venta" solo la registra el sistema.

**Auditoría en la misma transacción.** `AuditTrail` agrega la entrada al mismo `DbContext`; se
guarda con el cambio que describe o no se guarda. Incluye actor y un resumen legible
(p. ej. "Precio: S/ 449.00 → S/ 399.00"); nunca contraseñas ni tokens. Sin FK a usuarios, para que
el registro sobreviva a la eliminación de una cuenta.

**Productos no se eliminan, se ocultan.** Los pedidos referencian variantes (FK `Restrict`); un
producto retirado pasa a borrador. Las categorías solo se eliminan si no tienen productos ni
subcategorías (409 con explicación).

**Estados de pedido explícitos.** Pagado → Enviado → Entregado; solo un pedido impago se puede
cancelar, y al cancelarlo se libera su reserva. La API devuelve `allowedTransitions` y la interfaz
solo muestra esas acciones, siempre con confirmación.

**Reporte CSV seguro.** RFC 4180, UTF-8 con BOM (Excel muestra bien "Envío"), fechas en hora de Lima,
máximo un año por descarga y celdas de texto que empiezan con `= + - @` prefijadas con `'` para evitar
inyección de fórmulas (los nombres de clientes vienen del usuario).

**Administradores.** Se otorga el rol a cuentas existentes; nadie puede quitarse a sí mismo y siempre
queda al menos un administrador. Al revocar se rota el security stamp: la sesión de esa persona deja
de valer en como máximo 5 minutos.

**Imágenes por URL (por ahora).** El panel registra imágenes por ruta del sitio o URL HTTPS con
texto alternativo obligatorio. La subida de archivos (validación de tamaño, tipo real por contenido
y almacenamiento externo) queda pendiente para cuando exista un almacenamiento de objetos.
