# ADR-0008 — Notificaciones en tiempo real (SignalR)

- Estado: Aceptada
- Fecha: 2026-11-04

## Casos de uso

- Administradores: aviso de **pedido pagado** y de **stock bajo** tras una venta; el dashboard, la
  lista de pedidos y el inventario se actualizan solos.
- Clientes: aviso cuando **su** pedido pasa a enviado, entregado o cancelado.

## Decisiones

**Un hub de solo envío.** `NotificationsHub` no expone métodos invocables desde el navegador: no
añade superficie de escritura a la API. Requiere sesión (`[Authorize]`); los administradores entran
al grupo `admins` según el rol de su cookie, y los clientes se direccionan por su id de usuario
(`Clients.User`), así nadie recibe pedidos ajenos (cubierto por una prueba de integración).

**El evento es una pista, no el dato.** Los payloads llevan identificadores y poco más. El cliente
valida cada payload con Zod, invalida las etiquetas de RTK Query correspondientes y vuelve a pedir
el estado real por REST. Si se pierde un evento, nada queda inconsistente.

**Se notifica después del commit.** Nunca se anuncia un cambio que todavía podría revertirse. Si
enviar falla, se registra y la operación de negocio sigue siendo exitosa.

**Seguridad de la conexión.**
- Misma cookie de sesión (sin tokens en la URL ni en `localStorage`).
- `CloseOnAuthenticationExpiration`: la conexión se cierra cuando la sesión expira.
- Validación de `Origin` en `/hubs` contra secuestro de WebSocket entre sitios (CORS no aplica a
  WebSockets); `SameSite=Lax` ya impide la mayoría de los casos.

**Resiliencia.**
- Reconexión automática (0, 2, 10 y 30 s). Al reconectar se invalidan pedidos, dashboard e
  inventario para recuperar lo ocurrido mientras tanto.
- Si la conexión no está disponible, las pantallas clave hacen *polling* cada 30 s
  (`useFallbackPolling`), y el panel lo indica con texto ("Sin conexión en vivo · actualiza cada 30 s").
- Una sola conexión para toda la app (`AppShell`, ruta raíz): moverse entre tienda y panel no
  reconecta.

**Accesibilidad.** Los avisos viven en una región `aria-live="polite"` siempre presente; se
anuncian sin robar el foco, se pueden cerrar con teclado y desaparecen solos a los 10 s. Se muestran
como máximo 4 a la vez.

## Escalado

Con varias instancias de la API hará falta un backplane (Redis) o Azure SignalR Service para que un
evento emitido en una instancia llegue a conexiones de otra. Se decidirá en la fase de despliegue.
