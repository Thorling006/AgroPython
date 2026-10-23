# Auditoría técnica — 16/10/2026

No se usaron credenciales ni datos reales. Evidencia: inspección, 33 pruebas pytest,
dos smoke tests y compilación de módulos.

| Funcionalidad | Estado | Evidencia | Riesgo | Acción necesaria |
|---|---|---|---|---|
| FastAPI/frontend | Probada local | Rutas principales devuelven 200 | Bajo | Validar HTTPS Railway |
| Docker/Railway | Implementada | Dockerfile, PORT, railway.json | Medio | Build real Railway |
| Healthchecks | Probada | live/ready y rechazo de clave pública como service role | Bajo | Cargar clave privada en el servidor |
| Login backend | Probada por contrato | JWT y rutas protegidas | Alto | Migrar SHA-256 a Argon2 |
| Aislamiento | Probada | Token prevalece sobre IDs inyectados | Bajo | Validar staging |
| RLS sensible | Preparada, no aplicada | SQL staging/rollback | Medio | Ejecutar en staging |
| Rate limiting | Probado con Redis simulado | Límite compartido y 429 | Medio | Redis Railway real |
| Firma Meta | Probada local | Rechaza firma inválida | Medio | Payload real staging |
| Statuses Meta | Probada | delivered se ignora | Bajo | Validación real |
| Duplicados inbound | Implementada | RPC atómica + prueba | Medio | Migración staging |
| Sesiones/expiración | Probada | >5 minutos reclasifica | Bajo | Reinicio real |
| Teléfono no vinculado | Probada | No accede a privados | Bajo | E.164 real |
| Fechas | Probada | Relativas/pasadas/inválidas | Medio | Frases regionales |
| Gemini | Simulada/protegida | Error visible y JWT | Medio | Clave/cuota staging |
| Actividades | Implementada | Crear/listar/completar/reprogramar | Medio | Esquema real |
| Recordatorios | Probada con dobles | Éxito, fallo y backoff | Medio | Meta real |
| Idempotencia reminder | Implementada | SKIP LOCKED + claim | Medio | Dos instancias staging |
| Migraciones | Revisadas | Nueva migración idempotente | Medio | Ejecutar en staging |
| Panel privado núcleo | Migrado | Usuarios, actividades y mensajes por API | Medio | Prueba visual staging |
| Panel social/cultivos | Parcial | Inventario de accesos directos | Alto | API tabla por tabla |
| Integraciones reales | Pendiente | No se usaron secretos | Crítico | Corte autorizado |

## Corregido

- IDOR en actividades: identidad desde JWT.
- Uso anónimo de Gemini.
- Webhook sin HMAC y sin límite de tamaño.
- Carrera check-then-insert en mensajes.
- Duplicados de recordatorios entre instancias.
- Fallos silenciosos de Meta: persistencia y backoff.
- Estados/fechas incompatibles: valores heredados y `scheduled_at`.
- Scheduler iniciado sin configuración y healthcheck ambiguo.

## Bloqueadores para producción pública

1. Aplicar/validar runtime y RLS en un proyecto Supabase de staging sin datos reales.
2. Migrar cultivos, AgroRed, grupos, comunidades y soporte restantes.
3. Validar Supabase, Gemini y Meta reales en staging.
4. Ensayar envío, reintento y reinicio con el número Meta de prueba.
5. Añadir rate limiting distribuido al login y AI.
6. Autorizar el cambio de webhook y posterior retiro de n8n.

## Validación Oracle — 23/10/2026

- El contenedor, Redis y el túnel respondieron; login y panel se verificaron con
  una cuenta existente.
- Se encontró `SUPABASE_URL` de ejemplo y claves placeholder en el servidor.
- La URL y la clave pública se recuperaron de la configuración heredada para
  diagnosticar, pero una clave pública **no sustituye** `service_role`.
- Falta configurar la clave privada real antes de reiniciar con esta versión y
  antes de aplicar RLS. Supabase Dashboard requiere inicio de sesión manual.
- El túnel Quick Tunnel cambió de URL al reiniciarse; se requiere un Named Tunnel
  o dominio estable para staging.
- La clave privada de Supabase quedó configurada únicamente en Oracle y
  `/health/ready` respondió 200 con la validación estricta activa.
- Gemini se validó mediante `/api/ai/chat` autenticado. La versión
  `gemini-2.5-flash` fue rechazada por Google; `gemini-3-flash-preview` respondió
  correctamente y quedó configurada en el servidor.
- Se generó un token de usuario del sistema Meta sin caducidad con permisos
  `whatsapp_business_messaging` y `whatsapp_business_management`. La consulta de
  solo lectura confirmó el número de prueba en estado `CONNECTED`.
- No se cambió el webhook, no se enviaron mensajes y el scheduler permanece
  desactivado hasta validar recordatorios de extremo a extremo.
