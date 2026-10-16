from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import get_settings
from app.models import AuthenticatedUser, ChatRequest
from app.security import require_user
from app.rate_limit import enforce_rate_limit
from app.services.gemini import GeminiClient

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def chat(payload: ChatRequest, request: Request, user: AuthenticatedUser = Depends(require_user)) -> dict:
    settings = get_settings()
    await enforce_rate_limit(request, settings, "ai", settings.rate_limit_ai, user.id)
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini no está configurado en el servidor")
    try:
        answer = await GeminiClient().chat(payload.message, payload.history, payload.mode, payload.page_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="No se pudo obtener respuesta del modelo") from exc
    return {"answer": answer}
