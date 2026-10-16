from fastapi import APIRouter, Depends, HTTPException

from app.config import get_settings
from app.models import AuthenticatedUser, ChatRequest
from app.security import require_user
from app.services.gemini import GeminiClient

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def chat(request: ChatRequest, _user: AuthenticatedUser = Depends(require_user)) -> dict:
    if not get_settings().gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini no está configurado en el servidor")
    try:
        answer = await GeminiClient().chat(request.message, request.history, request.mode, request.page_context)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="No se pudo obtener respuesta del modelo") from exc
    return {"answer": answer}
