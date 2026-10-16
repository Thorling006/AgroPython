# AgroPython

Migración incremental de AgroSmart a FastAPI. Conserva el panel web y prepara un
backend seguro para Supabase, WhatsApp Business Cloud, Gemini, sesiones y
recordatorios automáticos.

> **Estado:** listo para desplegar en pruebas, no validado aún con integraciones
> reales. No cambie el webhook productivo ni desactive n8n antes de completar
> [el procedimiento de despliegue](docs/DEPLOYMENT_RAILWAY.md).

## Componentes

- `app/main.py`: FastAPI, frontend, healthchecks y scheduler opcional.
- `app/routers/webhook.py`: webhook con firma `X-Hub-Signature-256`.
- `app/routers/auth.py`: login server-side compatible con hashes heredados.
- `app/routers/activities.py`: operaciones protegidas por identidad JWT.
- `app/services/conversation.py`: estado persistente y expiración.
- `app/services/reminders.py`: reclamación atómica, reintentos y backoff.
- `migrations/20261016_agropython_runtime.sql`: runtime idempotente.
- `app/static/`: panel original preservado durante la migración.

## Ejecución local

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

Abra `http://localhost:8000`. OpenAPI está en `/docs`, liveness en
`/health/live` y readiness en `/health/ready`.

## Pruebas

```powershell
python -m pytest -q
python tests/smoke.py
python tests/conversation_smoke.py
```

La suite cubre parsers, fechas salvadoreñas, expiración, duplicados, aislamiento,
autenticación, firma de Meta, errores de integraciones, recordatorios y panel.

## Seguridad y limitaciones

- Los secretos solo se cargan desde variables de entorno.
- Las claves privadas nunca deben llegar al navegador.
- El frontend heredado aún consulta varias tablas con la clave anónima. Sus RLS
  deben migrarse antes de una apertura pública; endurecerlas ahora rompería el panel.
- El SHA-256 heredado se verifica temporalmente en servidor. Debe migrarse de forma
  controlada a Argon2/bcrypt sin cambiar contraseñas reales de forma abrupta.

Consulte [el informe de auditoría](docs/AUDIT_REPORT.md).
