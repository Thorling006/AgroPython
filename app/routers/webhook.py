import hashlib
import hmac

from fastapi import APIRouter, Depends, HTTPException, Request
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
async def receive(request: Request, settings: Settings = Depends(get_settings)) -> dict:
    body = await request.body()
    if len(body) > 1_048_576:
        raise HTTPException(status_code=413, detail="Payload demasiado grande")
    signature = request.headers.get("x-hub-signature-256", "")
    expected = "sha256=" + hmac.new(settings.meta_app_secret.encode(), body, hashlib.sha256).hexdigest()
    if not settings.meta_app_secret or not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="Firma de Meta inválida")
    try:
        payload = await request.json()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="JSON inválido") from exc
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
    try:
        answer = await service.handle(incoming)
    except Exception as exc:
        try:
            await service.repo.mark_inbound_failed(incoming.message_id, str(exc))
        finally:
            raise HTTPException(status_code=503, detail="No se pudo procesar el mensaje") from exc
    if not answer:
        return {"status": "duplicate"}
    try:
        await WhatsAppClient().send_text(incoming.phone, answer)
        await service.repo.mark_inbound_completed(incoming.message_id)
    except Exception as exc:
        await service.repo.mark_inbound_failed(incoming.message_id, str(exc))
        raise HTTPException(status_code=502, detail="No se pudo enviar la respuesta por WhatsApp") from exc
    return {"status": "processed"}

