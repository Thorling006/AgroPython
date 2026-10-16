from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings
from app.models import AuthenticatedUser, LoginRequest
from app.security import create_access_token, legacy_password_matches, require_user
from app.services.supabase import SupabaseRepository

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
async def login(request: LoginRequest, settings: Settings = Depends(get_settings)) -> dict:
    if not settings.auth_ready or not settings.supabase_ready:
        raise HTTPException(status_code=503, detail="La autenticación del servidor no está configurada")
    user = await SupabaseRepository().find_user_by_email(request.email.strip().lower())
    if not user or not legacy_password_matches(request.password, str(user.get("password") or "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    suspension_end = user.get("suspension_end")
    if suspension_end:
        try:
            until = datetime.fromisoformat(str(suspension_end).replace("Z", "+00:00"))
            if until > datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="La cuenta está suspendida")
        except ValueError:
            raise HTTPException(status_code=403, detail="La cuenta está suspendida")
    token = create_access_token(user, settings)
    safe_user = {key: value for key, value in user.items() if key not in {"password"}}
    return {"access_token": token, "token_type": "bearer", "user": safe_user}


@router.get("/me")
async def me(user: AuthenticatedUser = Depends(require_user)) -> AuthenticatedUser:
    return user
