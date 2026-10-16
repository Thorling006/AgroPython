from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.models import AuthenticatedUser, MessageCreate
from app.security import require_user
from app.services.supabase import SupabaseRepository
from app.rate_limit import enforce_api_rate_limit

router = APIRouter(prefix="/api/messages", tags=["Messages"], dependencies=[Depends(enforce_api_rate_limit)])


@router.get("/direct/{peer_id}")
async def direct(peer_id: str, user: AuthenticatedUser = Depends(require_user)) -> list[dict]:
    return await SupabaseRepository().direct_messages(user.id, peer_id)


@router.get("/group/{group_id}")
async def group(group_id: str, user: AuthenticatedUser = Depends(require_user)) -> list[dict]:
    repo = SupabaseRepository()
    if not await repo.user_in_group(user.id, group_id):
        raise HTTPException(status_code=403, detail="No perteneces a este grupo")
    return await repo.group_messages(group_id)


@router.post("", status_code=201)
async def send(payload: MessageCreate, user: AuthenticatedUser = Depends(require_user)) -> dict:
    repo = SupabaseRepository()
    if bool(payload.receiver_id) == bool(payload.group_id):
        raise HTTPException(status_code=422, detail="Indica destinatario o grupo, no ambos")
    if payload.group_id and not await repo.user_in_group(user.id, payload.group_id):
        raise HTTPException(status_code=403, detail="No perteneces a este grupo")
    return await repo.create_message({"sender_id": user.id, "receiver_id": payload.receiver_id, "group_id": payload.group_id, "text": payload.text, "timestamp": datetime.now(timezone.utc).isoformat(), "is_read": False})


@router.patch("/direct/{sender_id}/read", status_code=204)
async def mark_read(sender_id: str, user: AuthenticatedUser = Depends(require_user)) -> None:
    await SupabaseRepository().mark_messages_read(user.id, sender_id)

