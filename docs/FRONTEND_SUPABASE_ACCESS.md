# Inventario de acceso del frontend a Supabase

Auditoría estática realizada el 16/10/2026.

## Migrado a FastAPI autenticado

- Registro, login, perfil propio y cambio de contraseña.
- Directorio de usuarios con alcance determinado en servidor.
- Suspensión, rol, plan, afiliación y eliminación administrativa con autorización.
- Crear, listar, completar y reprogramar actividades.
- Conversaciones directas, envío, lectura y mensajes de grupos con membresía validada.
- Gemini del panel y Jarvis.

El código heredado conserva algunas ramas de fallback para desarrollo local, pero en
staging las tablas sensibles quedan revocadas para `anon` y `authenticated`; el flujo
online soportado usa `/api/*` y JWT.

## Accesos directos aún existentes

| Área/tablas | Motivo actual | Requisito antes de producción |
|---|---|---|
| `crops`, `fertilizer_logs` | Gestión visual de cultivos/abonado heredada | Endpoints con propiedad por usuario |
| `posts`, `post_comments`, `post_poll_votes` | AgroRed | API social y moderación |
| `friendships` | Relaciones sociales | Validar participantes en servidor |
| `chat_groups`, `chat_group_members` | Crear/listar grupos | API de membresía completa |
| `communities`, `community_members`, `forums` | Comunidad/foros | API con roles y membresía |
| `videocall_reports` | Soporte y moderación | API restringida a autor/administrador |
| `countries`, `organizations` | Catálogos y administración | Lectura pública limitada; escritura admin |

No deben habilitarse políticas permisivas globales para resolver estos accesos. Cada
área debe migrarse a endpoints explícitos o a Supabase Auth con políticas por fila.

