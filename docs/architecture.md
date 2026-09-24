# Arquitectura de referencia

## Flujo de una jornada

1. El sistema crea un `daily_run` para la fecha y ruta activa.
2. Se generan `daily_stops` desde `weekly_route_stops`.
3. Se crea un borrador de pedido con `client_default_items` y `prices` vigentes.
4. Un scheduler crea un `message_job` por cliente y fecha.
5. La función `daily-dispatch` envía la plantilla de WhatsApp cuando estén cargadas las credenciales.
6. `whatsapp-webhook` recibe la respuesta, verifica la firma y actualiza `daily_stops`, `orders` y `message_jobs`.
7. Realtime actualiza la app del repartidor.
8. Al entregar, se registra la cantidad real y se descuenta stock.

## Estados

- `pending`: todavía no respondió.
- `no_answer`: se agotó el tiempo de respuesta.
- `confirmed`: confirmó el pedido habitual.
- `modified`: hay cambios propuestos y deben confirmarse.
- `declined`: no necesita producto.
- `reschedule_requested`: pidió otra fecha.
- `delivered`: la entrega fue registrada.

`sin pedido` y `sin respuesta` son estados diferentes. No se debe eliminar una parada cuando el cliente responde que no necesita.

## Reglas de consistencia

- `daily_runs(route_id, service_date)` es único.
- `daily_stops(run_id, client_id)` es único.
- `orders(stop_id)` es único.
- `order_items` guarda `unit_price_snapshot`; cambiar un precio no altera pedidos anteriores.
- `message_jobs(business_id, idempotency_key)` evita enviar dos veces la misma consulta.
- `whatsapp_messages(provider_message_id)` evita procesar dos veces un webhook.
- El descuento de stock se ejecuta dentro de una transacción junto con la entrega.
- Los cambios manuales se registran en `audit_logs`.
- No se crea un trabajo de mensaje para clientes sin consentimiento de WhatsApp.

## Carga de clientes

La pantalla **Más → Clientes** permite:

- crear y editar clientes;
- asignar uno o varios días de lunes a sábado;
- definir el pedido habitual;
- activar o desactivar clientes;
- cargar un CSV con vista previa;
- deduplicar por teléfono normalizado.

La importación real en Supabase debe guardar un lote en `client_import_batches` y cada fila en `client_import_rows` antes de confirmar el commit.

## Cola de mensajes

`message_jobs` representa la cola de salida, separado de `whatsapp_messages`, que representa el historial de mensajes enviados y recibidos. La idempotencia recomendada es:

```text
daily_stop_id + daily_consultation + sequence
```

El simulador local usa el mismo modelo y permite probar `Sí`, `No`, `Modificar` y `Reprogramar` sin enviar mensajes reales.

## Roles

- `driver`: consulta su ruta y actualiza paradas, pedidos y entregas.
- `admin`: gestiona clientes, plantillas semanales, precios, usuarios y reportes.
- `service`: usuario técnico separado, usado únicamente por webhooks y jobs.

La demostración local cambia el rol con el botón de Más. En producción, el rol debe venir de Supabase Auth y de las políticas de `rls.sql`.

## Integración WhatsApp

Los archivos preparados para la integración son:

```text
supabase/functions/daily-dispatch/index.ts
supabase/functions/whatsapp-webhook/index.ts
supabase/.env.example
```

Para activar el proveedor real:

1. Verificar la cuenta de Meta Business.
2. Habilitar WhatsApp Business Platform.
3. Aprobar la plantilla `daily_order_question`.
4. Configurar los secretos de Supabase.
5. Programar `daily-dispatch` con Supabase Cron.
6. Configurar la URL del webhook de Meta.
7. Cambiar `WHATSAPP_DRY_RUN` a `false` solamente después de verificar la plantilla y la firma.

Los secretos nunca deben estar en `index.html`, `app.js`, el APK ni la PWA.

## Realtime y offline

La demostración usa `localStorage` y `BroadcastChannel` para poder probarla sin infraestructura. La capa de producción debe:

1. Guardar snapshot y outbox en IndexedDB.
2. Enviar operaciones con UUID idempotente.
3. Sincronizar al recuperar conexión.
4. Suscribirse a `daily_runs`, `daily_stops`, `orders` y `message_jobs`.
5. Resolver entregas y stock con RPC transaccionales, nunca con last-write-wins.

## Próxima integración

1. Crear el proyecto Flutter para el repartidor.
2. Configurar Auth, RLS y Realtime de Supabase.
3. Reemplazar el storage local por Drift/IndexedDB.
4. Registrar el webhook de Meta y convertir botones a IDs estables (`CONFIRM_DEFAULT`, `DECLINE`, `MODIFY`, `RESCHEDULE`).
5. Activar notificaciones push.
6. Agregar mapas y optimización geográfica como módulo separado.
