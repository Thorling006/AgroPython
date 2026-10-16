# Despliegue seguro en Railway

## Entorno de staging

1. Cree un servicio Railway separado conectado a este repositorio.
2. Use Supabase de staging o una copia sin datos personales.
3. No apunte Meta al nuevo dominio y mantenga n8n activo.
4. Aplique `migrations/20261016_agropython_runtime.sql` primero en staging.
5. No aplique `20261016_rls_target_NOT_FOR_PRODUCTION_YET.sql`: documenta el
   objetivo futuro y el panel heredado todavía no usa Supabase Auth.

## Variables

Configure en Railway, nunca en Git:

- `APP_ENV=staging`, `APP_BASE_URL`, `APP_TIMEZONE=America/El_Salvador`
- `APP_SESSION_SECRET` aleatorio de al menos 32 caracteres
- `ACCESS_TOKEN_MINUTES`, `ALLOWED_ORIGINS` (HTTPS, sin comodín)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `META_PHONE_NUMBER_ID`, `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN`,
  `META_APP_SECRET`
- `GEMINI_API_KEY`, `GEMINI_MODEL`
- `ENABLE_REMINDER_SCHEDULER=false` durante la primera validación
- `REMINDER_POLL_SECONDS=60`

Railway suministra `PORT`; el comando ya ejecuta Uvicorn con ese puerto. El
healthcheck es `/health/ready`. Docker usa Linux y el mismo contrato.

## Validación aislada

1. Compruebe `/health/live`, `/health/ready`, `/`, `/dashboard.html` y
   `/js/config.js` por HTTPS.
2. Use una cuenta exclusiva de staging para login y aislamiento entre usuarios.
3. Pruebe Gemini autenticado desde `/api/ai/chat`.
4. Use número y webhook Meta de prueba. Verifique desafío GET, firma POST válida,
   rechazo de firma inválida y reintento del mismo `message_id`.
5. Programe una actividad, habilite el scheduler en una instancia y compruebe envío,
   marcas de Supabase, reinicio y ausencia de duplicados.
6. Simule fallos de Meta y compruebe `whatsapp_last_error` y
   `whatsapp_next_attempt_at`.

## Corte controlado (requiere autorización)

1. Respalde esquema/configuración sin exportar secretos.
2. Aplique la migración runtime en producción y valide las RPC.
3. Despliegue AgroPython con scheduler apagado.
4. Pruebe con un usuario exclusivo de prueba.
5. Cambie el webhook Meta solo en una ventana autorizada.
6. Mantenga n8n disponible para reversión, evitando dos consumidores activos.
7. Habilite el scheduler Python y retire únicamente el equivalente de n8n cuando el
   nuevo flujo haya sido validado.

## Reversión

Restaure el callback anterior, apague el scheduler Python y conserve las columnas
nuevas: son compatibles y no eliminan datos.

