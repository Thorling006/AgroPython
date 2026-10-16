from datetime import datetime, timedelta

from app.config import get_settings
from app.services.supabase import SupabaseRepository
from app.services.whatsapp import WhatsAppClient


async def dispatch_due_reminders() -> None:
    cfg = get_settings()
    if not cfg.production_ready:
        return
    repo, whatsapp = SupabaseRepository(), WhatsAppClient()
    now = datetime.now(cfg.timezone)
    for activity in await repo.due_activities(now):
        user = activity.get("users") or {}
        phone = user.get("phone")
        if not phone:
            continue
        description = activity.get("description") or activity.get("activity_type") or "Actividad agrícola"
        message = f"⏰ Recordatorio AgroSmart 🌱\n\nTienes una actividad pendiente:\n\n{description}\n\n¿Qué deseas hacer?\n\n1. Marcar como realizada\n2. Reprogramar\n3. Mantener pendiente"
        try:
            message_id = await whatsapp.send_text(phone, message)
        except Exception:
            continue
        await repo.update_activity(str(activity["id"]), str(activity["user_id"]), {"whatsapp_reminder_sent": True, "whatsapp_sent_at": now.isoformat(), "whatsapp_message_id": message_id})
        await repo.upsert_session({"phone": phone, "user_id": activity["user_id"], "current_intent": "activity_action", "current_step": "waiting_action", "context_data": {"activity_id": activity["id"]}, "updated_at": now.isoformat(), "expires_at": (now + timedelta(seconds=cfg.session_ttl_seconds)).isoformat()})

