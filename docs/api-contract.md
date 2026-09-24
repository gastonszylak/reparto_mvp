# Contrato de integración

## Importar clientes

`POST /functions/v1/import-clients`

Headers: `Authorization: Bearer <access_token>`.

Body:

```json
{
  "rows": [
    {
      "name": "María López",
      "phone": "+5491112345678",
      "address": "Av. Siempre Viva 742",
      "days": ["lunes"],
      "water20": 1,
      "water12": 0,
      "soda": 0,
      "whatsappOptIn": true
    }
  ]
}
```

La función es `import-clients` y exige un usuario autenticado con rol `admin`.

## Generar cola diaria

Programar `daily-dispatch` con Supabase Cron. En dry run devuelve:

```json
{
  "dryRun": true,
  "processed": 8,
  "jobs": []
}
```

## Webhook

Meta envía el payload estándar a `whatsapp-webhook`. La función responde al challenge de verificación y procesa únicamente mensajes entrantes.

Acciones estables esperadas:

```text
CONFIRM_DEFAULT
DECLINE
MODIFY
RESCHEDULE
```

Las respuestas en texto libre se deben convertir a una acción conocida o pedir una aclaración; no se debe modificar el pedido de forma automática ante un texto ambiguo.
