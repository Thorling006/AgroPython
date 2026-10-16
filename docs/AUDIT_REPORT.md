# Auditoría técnica — 16/10/2026

No se usaron credenciales ni datos reales. Evidencia: inspección, 21 pruebas pytest,
dos smoke tests y compilación de módulos.

| Funcionalidad | Estado | Evidencia | Riesgo | Acción necesaria |
|---|---|---|---|---|
| FastAPI/frontend | Probada local | Rutas principales devuelven 200 | Bajo | Validar HTTPS Railway |
| Docker/Railway | Implementada | Dockerfile, PORT, railway.json | Medio | Build real Railway |
| Healthchecks | Probada | live/ready | Bajo | Cargar variables |
| Login backend | Probada por contrato | JWT y rutas protegidas | Alto | Migrar SHA-256 a Argon2 |
| Aislamiento | Probada | Token prevalece sobre user_id inyectado | Medio | Migrar resto del panel |
| RLS Supabase | Pendiente | Acceso directo heredado | Crítico | Supabase Auth + RLS |
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
| Panel completo | Parcial | Carga; operaciones legacy directas | Alto | API tabla por tabla |
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

1. Aplicar/validar la migración runtime sobre una copia del esquema real.
2. Migrar el acceso directo del frontend a API/JWT o Supabase Auth y luego RLS.
3. Validar Supabase, Gemini y Meta reales en staging.
4. Ensayar envío, reintento y reinicio con el número Meta de prueba.
5. Añadir rate limiting distribuido al login y AI.
6. Autorizar el cambio de webhook y posterior retiro de n8n.
