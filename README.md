# AguaFlow · MVP móvil

Prototipo mobile-first para digitalizar el reparto de agua y soda. La interfaz está pensada para uso rápido en la calle desde Android/iOS.

## Funcionalidades implementadas

- Dashboard de la jornada y detalle de paradas.
- Estados: confirmado, modificado, pendiente, sin pedido, reprogramado y entregado.
- Carga rápida de bidón 20 L, bidón 12 L y sifón de soda.
- Registro de entregas y stock del camión.
- Editor de clientes con días de atención y pedido habitual.
- Importación CSV con previsualización y deduplicación por teléfono.
- Generación local de la ruta del día.
- Cola de mensajes por cliente y fecha.
- Simulador de respuestas: Sí, No, Modificar y Reprogramar.
- Webhook y dispatcher de WhatsApp preparados, sin credenciales reales.
- Roles demo de administrador y repartidor.
- Cola de sincronización local y Realtime entre pestañas.
- Persistencia local con `localStorage`.
- Service worker para guardar el shell de la PWA y permitir uso sin conexión.
- Ilustraciones flotantes de bidones y sifones en el fondo.

## Abrir el prototipo

El proyecto no requiere instalar dependencias.

```powershell
cd "C:\Users\USUARIO\OneDrive\Documentos\Default Project\reparto_mvp"
python -m http.server 8080
```

Abrir `http://localhost:8080`.

También existen lanzadores en la carpeta anterior:

```text
Abrir AguaFlow.cmd
Compartir AguaFlow en red.cmd
```

## Datos de demostración

La pantalla **Más → Clientes** permite probar el flujo completo:

1. Abrir **Importar CSV**.
2. Pegar una plantilla o seleccionar un archivo.
3. Revisar la previsualización.
4. Confirmar la importación.
5. Abrir **Rutas semanales** y generar la ruta.
6. Abrir **Cola de mensajes** y simular respuestas.

La plantilla tiene estas columnas:

```csv
nombre,telefono,direccion,dia,bidon20,bidon12,soda,whatsapp,notas
```

## Subir a GitHub

La carpeta `reparto_mvp` es un repositorio estático independiente. Para publicarlo:

```powershell
cd "C:\Users\USUARIO\OneDrive\Documentos\Default Project\reparto_mvp"
git init
git add .
git commit -m "AguaFlow MVP"
```

Luego crear un repositorio vacío en GitHub y ejecutar:

```powershell
git branch -M main
git remote add origin https://github.com/USUARIO/REPO.git
git push -u origin main
```

Para GitHub Pages,Settings → Pages → Source: rama `main`, carpeta `/ (root)`.

Para Netlify o Vercel se puede publicar directamente la carpeta `reparto_mvp`; ya están incluidos `netlify.toml` y `vercel.json`.
## Preparación para producción

La capa visual y el modelo local ya están preparados. Falta conectar la infraestructura real:

- Supabase Auth y PostgreSQL.
- RLS en `supabase/rls.sql`.
- Sincronización offline con SQLite/Drift o IndexedDB.
- API oficial de WhatsApp Business Cloud API.
- Realtime entre dispositivos.
- FCM/APNs.
- Mapas y navegación.

Las funciones de Edge Function están en:

```text
supabase/functions/daily-dispatch/index.ts
supabase/functions/whatsapp-webhook/index.ts
```

La configuración de secretos está documentada en `supabase/.env.example`. No se deben copiar tokens de Meta al código de la app.

La estructura de datos y las reglas de consistencia están en `docs/architecture.md` y `supabase/schema.sql`. El contrato de endpoints está en `docs/api-contract.md`.
