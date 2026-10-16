from datetime import datetime, timedelta

from app.config import get_settings
from app.models import IncomingMessage
from app.services.activity_parser import parse_activity
from app.services.gemini import GeminiClient
from app.services.intent import classify_intent, is_global_cancel, is_thanks, normalized
from app.services.messages import format_activities, menu
from app.services.supabase import SupabaseRepository


class ConversationService:
    def __init__(self, repo: SupabaseRepository, gemini: GeminiClient) -> None:
        self.repo, self.gemini = repo, gemini
        self.cfg = get_settings()

    async def handle(self, incoming: IncomingMessage) -> str | None:
        now = datetime.now(self.cfg.timezone)
        if not await self.repo.claim_inbound(incoming.message_id, incoming.phone):
            return None
        user = await self.repo.find_user_by_phone(incoming.phone)
        if not user:
            return "Hola 👋\n\nEste número de WhatsApp todavía no está asociado a una cuenta de AgroSmart.\n\nIngresa a AgroSmart y registra este número en tu perfil para utilizar el asistente."
        session = await self.repo.get_active_session(incoming.phone, now)
        if session and is_global_cancel(incoming.message):
            await self.repo.close_session(incoming.phone)
            return "Operación cancelada.\n\n" + menu(incoming.name)
        if is_thanks(incoming.message):
            return "¡Con gusto! 🌱\nCuando necesites ayuda con tus actividades o cultivos, aquí estaré."
        if session:
            return await self._continue(incoming, user, session, now)
        return await self._start(incoming, user, now)

    async def _save(self, incoming: IncomingMessage, user: dict, intent: str, step: str, context: dict, now: datetime) -> None:
        await self.repo.upsert_session({"phone": incoming.phone, "user_id": user["id"], "current_intent": intent, "current_step": step, "context_data": context, "updated_at": now.isoformat(), "expires_at": (now + timedelta(seconds=self.cfg.session_ttl_seconds)).isoformat()})

    async def _start(self, incoming: IncomingMessage, user: dict, now: datetime) -> str:
        intent = classify_intent(incoming.message)
        if intent == "menu":
            return menu(incoming.name)
        if intent == "agriculture":
            if normalized(incoming.message) == "1":
                await self._save(incoming, user, "agriculture", "waiting_question", {}, now)
                return "Perfecto 🌱 ¿Qué deseas consultar sobre agricultura?"
            return await self.gemini.answer(incoming.message)
        if intent == "list_activities":
            return format_activities(await self.repo.list_activities(user["id"]))
        if intent == "list_completed":
            return format_activities(await self.repo.list_activities(user["id"], completed=True), completed=True)
        if intent == "complete_activity":
            return await self._start_completion(incoming, user, now)
        await self._save(incoming, user, "create_activity", "waiting_description", {}, now)
        if normalized(incoming.message) == "2":
            return "🌱 ¿Qué actividad deseas programar?\n\nPuedes escribir algo como:\n\"Regar maíz mañana a las 8 am\""
        return await self._activity_details(incoming, user, {}, now)

    async def _continue(self, incoming: IncomingMessage, user: dict, session: dict, now: datetime) -> str:
        intent, step = session["current_intent"], session["current_step"]
        context = session.get("context_data") or {}
        if intent == "agriculture":
            original = context.get("conversation", "")
            answer = await self.gemini.answer(incoming.message, original)
            await self.repo.close_session(incoming.phone)
            return answer
        if intent == "create_activity":
            if step == "waiting_confirmation":
                reply = normalized(incoming.message)
                if reply in {"1", "si", "sí"}:
                    draft = context["draft"]
                    scheduled = datetime.fromisoformat(draft["scheduled_at"])
                    await self.repo.create_activity({"user_id": user["id"], "activity_type": normalized(draft["activity_type"]), "description": draft["description"], "crop_name": draft["crop_name"], "scheduled_date": scheduled.date().isoformat(), "scheduled_at": scheduled.isoformat(), "status": "pendiente", "whatsapp_reminder_sent": False})
                    await self.repo.close_session(incoming.phone)
                    return "✅ Actividad programada correctamente."
                if reply in {"2", "no"}:
                    await self.repo.close_session(incoming.phone)
                    return "❌ Actividad cancelada."
                return "No pude identificar tu respuesta 🤔\n\nResponde 1 para Sí o 2 para No."
            return await self._activity_details(incoming, user, context, now)
        if intent == "complete_activity":
            return await self._continue_completion(incoming, user, session, now)
        if intent == "activity_action":
            return await self._activity_action(incoming, user, session, now)
        await self.repo.close_session(incoming.phone)
        return menu(incoming.name)

    async def _start_completion(self, incoming: IncomingMessage, user: dict, now: datetime) -> str:
        rows = await self.repo.find_pending_activities(user["id"])
        words = {word for word in normalized(incoming.message).split() if len(word) > 3}
        matches = []
        for row in rows:
            haystack = normalized(" ".join(str(row.get(key) or "") for key in ("activity_type", "crop_name", "description")))
            if any(word in haystack for word in words if word not in {"complete", "completado", "realice", "realizado", "termine"}):
                matches.append(row)
        if not matches:
            return "No encontré una actividad pendiente que coincida. Puedes escribir 3 para ver tus actividades pendientes."
        if len(matches) == 1:
            row = matches[0]
            await self._save(incoming, user, "complete_activity", "waiting_confirmation", {"activity_ids": [row["id"]]}, now)
            return f"Encontré esta actividad:\n\n🌱 {row.get('activity_type') or 'Actividad'} - {row.get('crop_name') or row.get('description') or 'Cultivo'}\n\n¿Deseas marcarla como realizada?\n\n1. Sí\n2. No"
        await self._save(incoming, user, "complete_activity", "waiting_selection", {"activity_ids": [row["id"] for row in matches]}, now)
        options = [f"{index}. {row.get('activity_type') or 'Actividad'} - {row.get('crop_name') or row.get('description') or 'Cultivo'}" for index, row in enumerate(matches, 1)]
        return "Encontré varias actividades pendientes:\n\n" + "\n".join(options) + "\n\n¿Cuál deseas marcar como realizada?"

    async def _continue_completion(self, incoming: IncomingMessage, user: dict, session: dict, now: datetime) -> str:
        context = session.get("context_data") or {}
        reply = normalized(incoming.message)
        ids = context.get("activity_ids") or []
        if session["current_step"] == "waiting_selection":
            if not reply.isdigit() or not 1 <= int(reply) <= len(ids):
                return f"Responde con un número entre 1 y {len(ids)}."
            chosen = ids[int(reply) - 1]
            await self._save(incoming, user, "complete_activity", "waiting_confirmation", {"activity_ids": [chosen]}, now)
            return "¿Confirmas que deseas marcar esta actividad como realizada?\n\n1. Sí\n2. No"
        if reply in {"1", "si"} and ids:
            updated = await self.repo.update_activity(str(ids[0]), user["id"], {"status": "realizado", "completed_at": now.isoformat()})
            await self.repo.close_session(incoming.phone)
            return "✅ Actividad marcada como realizada." if updated else "No se encontró la actividad o no pertenece a tu cuenta."
        if reply in {"2", "no"}:
            await self.repo.close_session(incoming.phone)
            return "Entendido. La actividad seguirá pendiente."
        return "No pude identificar tu respuesta. Responde 1 para Sí o 2 para No."

    async def _activity_action(self, incoming: IncomingMessage, user: dict, session: dict, now: datetime) -> str:
        context = session.get("context_data") or {}
        activity_id = str(context.get("activity_id") or "")
        reply = normalized(incoming.message)
        step = session["current_step"]
        if not activity_id:
            await self.repo.close_session(incoming.phone)
            return "No pude identificar la actividad asociada al recordatorio."
        if step == "waiting_action":
            if reply in {"1", "realizada", "hecho", "listo"}:
                row = await self.repo.update_activity(activity_id, user["id"], {"status": "realizado", "completed_at": now.isoformat()})
                await self.repo.close_session(incoming.phone)
                return "✅ Actividad marcada como realizada." if row else "No se encontró la actividad."
            if reply in {"2", "reprogramar"}:
                await self._save(incoming, user, "activity_action", "waiting_new_datetime", context, now)
                return "📅 ¿Para qué nueva fecha y hora deseas reprogramar la actividad?"
            if reply in {"3", "pendiente", "mantener pendiente", "no realizada"}:
                await self.repo.update_activity(activity_id, user["id"], {"status": "pendiente"})
                await self.repo.close_session(incoming.phone)
                return "Entendido 👍\nLa actividad seguirá apareciendo como pendiente."
            return "Responde 1 para completar, 2 para reprogramar o 3 para mantener pendiente."
        from app.services.datetime_parser import parse_spanish_datetime

        scheduled_at = parse_spanish_datetime(incoming.message, now=now)
        if not scheduled_at:
            return "No pude identificar una fecha futura válida. Ejemplo: mañana a las 7 am."
        row = await self.repo.update_activity(activity_id, user["id"], {"status": "reprogramado", "scheduled_date": scheduled_at.date().isoformat(), "scheduled_at": scheduled_at.isoformat(), "whatsapp_reminder_sent": False, "whatsapp_sent_at": None})
        await self.repo.close_session(incoming.phone)
        return f"✅ Actividad reprogramada correctamente para:\n📅 {scheduled_at:%d/%m/%Y}\n🕐 {scheduled_at.strftime('%I:%M %p').lstrip('0')}" if row else "No se encontró la actividad."

    async def _activity_details(self, incoming: IncomingMessage, user: dict, context: dict, now: datetime) -> str:
        parsed = parse_activity(incoming.message, now)
        old = context.get("draft", {})
        draft = {"activity_type": parsed.activity_type or old.get("activity_type"), "crop_name": parsed.crop_name or old.get("crop_name"), "description": parsed.description or old.get("description"), "scheduled_at": parsed.scheduled_at.isoformat() if parsed.scheduled_at else old.get("scheduled_at")}
        if not draft["activity_type"] or not draft["crop_name"]:
            await self._save(incoming, user, "create_activity", "waiting_description", {"draft": draft}, now)
            return "Necesito una actividad agrícola y un cultivo válidos. Ejemplo: \"Regar maíz mañana a las 8 pm\"."
        if not draft["scheduled_at"]:
            await self._save(incoming, user, "create_activity", "waiting_datetime", {"draft": draft}, now)
            return "📅 ¿Para qué fecha y hora deseas programar la actividad?"
        when = datetime.fromisoformat(draft["scheduled_at"])
        await self._save(incoming, user, "create_activity", "waiting_confirmation", {"draft": draft}, now)
        return f"Voy a programar esta actividad:\n\n🌱 {draft['activity_type']}\n🌾 {draft['crop_name']}\n📅 {when:%d/%m/%Y}\n🕐 {when.strftime('%I:%M %p').lstrip('0')}\n\n¿Deseas guardarla?\n\n1. Sí\n2. No"

