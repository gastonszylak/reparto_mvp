# Edge Functions

## `import-clients`

Acepta filas ya normalizadas desde un administrador autenticado. El CSV se puede parsear en el cliente para previsualizar y esta función hace el commit en Supabase.

## `daily-dispatch`

Genera un `message_job` por parada pendiente del día. Por defecto funciona en `dry_run`: crea la cola pero no llama a Meta.

Configurar con Supabase Secrets:

```bash
WHATSAPP_DRY_RUN=true
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TEMPLATE_NAME=daily_order_question
```

Programar la función con Supabase Cron o un scheduler externo.

## `whatsapp-webhook`

- Responde al challenge de Meta.
- Valida `X-Hub-Signature-256` cuando existe `META_APP_SECRET`.
- Deduplica por `provider_message_id`.
- Actualiza la confirmación de la parada y el job.

Configurar la URL pública de la función en el panel de Meta y apuntar el campo de mensajes a esa URL.

No colocar tokens de Meta en `index.html`, `app.js` ni en la PWA.
