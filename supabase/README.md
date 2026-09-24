# Supabase

Orden recomendado para un proyecto nuevo:

0. Reemplazar `project_id = "aguaflow"` en `config.toml` por el ID real del proyecto.
1. Ejecutar `schema.sql`.
2. Ejecutar `rls.sql`.
3. Crear `businesses`, `profiles` y productos (`W20`, `W12`, `SODA`).
4. Configurar los secretos de las Edge Functions usando `.env.example` como referencia.
5. Desplegar `functions/import-clients`, `functions/daily-dispatch` y `functions/whatsapp-webhook`.
6. Programar `daily-dispatch` con Supabase Cron.
7. Configurar la URL del webhook en Meta.
8. Pasar `WHATSAPP_DRY_RUN` a `false` solo después de una prueba con un número interno.

El secreto `SUPABASE_SERVICE_ROLE_KEY` se usa únicamente en Functions. La app móvil solo debe usar la clave anónima y Auth.
