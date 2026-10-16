from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from app.models import ActivityAction, AuthenticatedUser
from app.security import require_user
from app.services.supabase import SupabaseRepository

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("")
async def list_activities(completed: bool = False, user: AuthenticatedUser = Depends(require_user)) -> list[dict]:
    return await SupabaseRepository().list_activities(user.id, completed=completed)


@router.patch("/{activity_id}")
async def update_activity(activity_id: str, action: ActivityAction, user: AuthenticatedUser = Depends(require_user)) -> dict:
    if action.activity_id != activity_id:
        raise HTTPException(status_code=400, detail="activity_id inconsistente")
    if action.action == "complete":
        data = {"status": "realizado", "completed_at": datetime.utcnow().isoformat()}
    elif action.action == "reschedule":
        if not action.scheduled_at or action.scheduled_at <= datetime.now(action.scheduled_at.tzinfo):
            raise HTTPException(status_code=422, detail="La nueva fecha debe estar en el futuro")
        data = {"status": "reprogramado", "scheduled_date": action.scheduled_at.date().isoformat(), "scheduled_at": action.scheduled_at.isoformat(), "whatsapp_reminder_sent": False, "whatsapp_sent_at": None}
    else:
        data = {"status": "pendiente"}
    row = await SupabaseRepository().update_activity(activity_id, user.id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Actividad inexistente o ajena al usuario")
    return row

