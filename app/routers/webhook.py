from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse

from app.config import Settings, get_settings
from app.models import IncomingMessage
from app.services.conversation import ConversationService
from app.services.gemini import GeminiClient
from app.services.phone import normalize_phone
from app.services.supabase import SupabaseRepository
from app.services.whatsapp import WhatsAppClient

router = APIRouter(prefix="/webhooks/whatsapp", tags=["WhatsApp"])


@router.get("")
async def verify(request: Request, settings: Settings = Depends(get_settings)) -> PlainTextResponse:
    params = request.query_params
    if params.get("hub.mode") == "subscribe" and params.get("hub.verify_token") == settings.meta_verify_token:
        return PlainTextResponse(params.get("hub.challenge", ""))
    raise HTTPException(status_code=403, detail="Verify token inválido")


@router.post("")
async def receive(request: Request) -> dict:
    payload = await request.json()
    try:
        value = payload["entry"][0]["changes"][0]["value"]
        if not value.get("messages"):
            return {"status": "ignored", "reason": "meta_status_event"}
        raw = value["messages"][0]
        if raw.get("type") != "text" or not raw.get("text", {}).get("body", "").strip():
            return {"status": "ignored", "reason": "unsupported_or_empty"}
        contact = (value.get("contacts") or [{}])[0]
        incoming = IncomingMessage(phone=normalize_phone(raw["from"]), name=contact.get("profile", {}).get("name", "Agricultor"), message=raw["text"]["body"].strip(), message_id=raw["id"])
    except (KeyError, IndexError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Payload de WhatsApp inválido") from exc
    service = ConversationService(SupabaseRepository(), GeminiClient())
    answer = await service.handle(incoming)
    if answer:
        await WhatsAppClient().send_text(incoming.phone, answer)
    return {"status": "processed" if answer else "duplicate"}

