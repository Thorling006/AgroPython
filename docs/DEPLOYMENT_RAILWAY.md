# Despliegue seguro en Railway

## Entorno de staging

1. Cree un servicio Railway separado conectado a este repositorio.
2. Use Supabase de staging o una copia sin datos personales.
3. No apunte Meta al nuevo dominio y mantenga n8n activo.
4. Aplique `migrations/20261016_agropython_runtime.sql` primero en staging.
5. Tras comprobar los endpoints, aplique solamente en staging
   `migrations/staging/20261016_rls_restrictive_staging.sql`.
6. Guarde antes un respaldo de solo esquema. El rollback de emergencia está junto
   al script, aunque restaurar el respaldo reproduce con mayor fidelidad los grants.

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
- `REDIS_URL` desde un servicio Redis privado de Railway
- `RATE_LIMIT_LOGIN=10`, `RATE_LIMIT_AI=30`, `RATE_LIMIT_API=120`

Railway suministra `PORT`; el comando ya ejecuta Uvicorn con ese puerto. El
healthcheck es `/health/ready`. Docker usa Linux y el mismo contrato.

`SUPABASE_SERVICE_ROLE_KEY` debe ser una clave privada `service_role`/secret del
proyecto. La aplicación rechaza claves `sb_publishable_*`, valores de ejemplo y
el mismo valor usado en `SUPABASE_ANON_KEY`; `/health/ready` devolverá 503 en esos
casos. Nunca copie esa clave al frontend ni a `/js/config.js`.

## Validación aislada

1. Compruebe `/health/live`, `/health/ready`, `/`, `/dashboard.html` y
   `/js/config.js` por HTTPS.
2. Use una cuenta exclusiva de staging para login y aislamiento entre usuarios.
   Cree datos ficticios; no clone nombres, teléfonos ni mensajes reales.
3. Pruebe Gemini autenticado desde `/api/ai/chat`.
4. Use número y webhook Meta de prueba. Verifique desafío GET, firma POST válida,
   rechazo de firma inválida y reintento del mismo `message_id`.
5. Programe una actividad, habilite el scheduler en una instancia y compruebe envío,
   marcas de Supabase, reinicio y ausencia de duplicados.
6. Simule fallos de Meta y compruebe `whatsapp_last_error` y
   `whatsapp_next_attempt_at`.
7. Ejecute dos instancias y compruebe que Redis limita globalmente y que un reminder
   solo es reclamado por una instancia.

## Conexiones manuales

### Railway

1. Cree un proyecto y servicio desde `Thorling006/AgroPython`, rama `main`.
2. Añada PostgreSQL **solo si lo necesita para otras funciones**; Supabase sigue
   siendo la base principal. Añada Redis y copie su referencia privada a `REDIS_URL`.
3. Configure las variables anteriores, genere dominio HTTPS y mantenga
   `ENABLE_REMINDER_SCHEDULER=false`.
4. Confirme build Docker/Ubuntu, `/health/live` 200 y `/health/ready` 200.

### Supabase staging

1. Cree un proyecto nuevo en la misma región disponible; no restaure datos reales.
2. Reproduzca solo el esquema base, aplique runtime y luego las RLS de staging.
3. Cree dos usuarios ficticios con teléfonos no reales reservados para prueba.
4. Use la anon key solo en `SUPABASE_ANON_KEY` y la service role únicamente en
   variables privadas de Railway.

### Gemini

1. Cree/restrinja una API key de pruebas y configure `GEMINI_API_KEY` en Railway.
2. Valide cuota, timeout y respuesta 502 controlada; nunca coloque la clave en JS.

### Meta

1. Use una app o número de prueba y agregue como callback el dominio de staging.
2. Configure en Railway el Phone Number ID, token, verify token y App Secret de
   pruebas. No reutilice ni cambie el callback productivo.
3. Suscriba `messages`, valide el desafío y envíe payloads firmados.
4. Mantenga n8n productivo activo durante toda esta validación.

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

