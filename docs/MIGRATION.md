# Migración de AgroSmart a Python

## Objetivo

Sustituir la orquestación n8n por un servicio Python mantenible sin cambiar las
tablas ni perder la interfaz visual. FastAPI recibe el webhook de Meta, resuelve al
usuario por teléfono, aplica deduplicación, mantiene sesiones en Supabase y ejecuta
la conversación. Un planificador interno reemplaza el workflow automático.

## Equivalencias

- WhatsApp Trigger y filtro de `statuses` → `routers/webhook.py`.
- Edit Fields y normalización → `IncomingMessage` y `services/phone.py`.
- AI Agent1/Switch1 → `services/intent.py`.
- Session Router → `services/conversation.py` + `conversation_state`.
- Nodos Supabase → `services/supabase.py`.
- Agente agrícola Gemini → `services/gemini.py`.
- Send Message → `services/whatsapp.py`.
- Schedule Trigger → APScheduler + `services/reminders.py`.
- Panel existente → archivos bajo `app/static`, servidos por FastAPI.

## Funciones preservadas

- Menú, cortesía y cancelación global.
- Consultas agrícolas.
- Creación de actividades con cultivo, fecha y hora.
- Rechazo de fechas pasadas.
- Listado de pendientes y realizadas.
- Completar actividades por lenguaje natural.
- Confirmar, reprogramar o mantener pendiente tras un recordatorio.
- Sesiones con expiración configurable a cinco minutos.
- Deduplicación por `message_id`.
- Eventos `statuses/read/delivered/sent/failed` ignorados.
- Usuarios no asociados bloqueados sin filtrar información privada.
- Procesamiento multiusuario por `phone` y `user_id`.
- Recordatorios automáticos con marca de envío para evitar duplicados.

## Corte seguro desde n8n

No se debe desactivar n8n hasta desplegar y validar AgroPython. El orden es:

1. Configurar variables en un nuevo servicio Railway.
2. Probar `/health`, `/docs` y un webhook de prueba.
3. Usar temporalmente una URL de prueba o una app Meta de desarrollo.
4. Validar menú, actividad, sesión, recordatorio y panel.
5. Cambiar el callback de Meta a `/webhooks/whatsapp`.
6. Confirmar tráfico real y recién entonces desactivar workflows n8n.

## Pendientes de entorno

El repositorio no incluye credenciales. Para una prueba real deben configurarse
Supabase, Meta y Gemini mediante variables. También debe confirmarse que los nombres
reales de columnas de `crop_activities`, `users` y `conversation_state` coinciden con
los usados por el repositorio Python. Si difieren, se ajustan los mapeos sin cambiar
datos existentes.

