# AgroPython

Migración de AgroSmart a una arquitectura Python con FastAPI. Conserva el panel web,
la integración con Supabase, el webhook de WhatsApp Business Cloud, Gemini, sesiones
con expiración, deduplicación, actividades agrícolas y recordatorios automáticos.

## Arquitectura

- `app/main.py`: aplicación FastAPI y programador periódico.
- `app/routers/webhook.py`: verificación y recepción del webhook de Meta.
- `app/routers/activities.py`: API multiusuario para listar/completar/reprogramar.
- `app/services/conversation.py`: máquina de estados conversacional persistente.
- `app/services/reminders.py`: envío idempotente de recordatorios vencidos.
- `app/services/supabase.py`: acceso server-side a Supabase REST.
- `app/services/gemini.py`: asesor agrícola especializado.
- `app/static/`: interfaz visual original preservada.

## Seguridad

No se incluyen secretos. Copie `.env.example` a `.env` y configure variables en el
entorno de despliegue. La service role de Supabase y los tokens de Meta/Gemini nunca
deben exponerse en el frontend.

## Ejecución local

```bash
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Abra `http://localhost:8000`. La documentación API está en `/docs` y el estado en
`/health`.

## Despliegue en Railway

1. Conecte este repositorio a un servicio Railway.
2. Configure las variables de `.env.example` en Railway Variables.
3. Publique el dominio HTTPS.
4. En Meta configure `https://SU-DOMINIO/webhooks/whatsapp` como callback.
5. Mantenga el mismo verify token en Meta y Railway.

## Pruebas

```bash
python tests/smoke.py
python tests/conversation_smoke.py
```

Las pruebas cubren clasificación, fechas relativas en `America/El_Salvador`, rechazo
de fechas pasadas y extracción de actividad/cultivo.

