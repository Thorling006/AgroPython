from datetime import datetime, timezone

from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import Settings, get_settings
from app.models import AuthenticatedUser, LoginRequest, RegistrationRequest
from app.rate_limit import enforce_rate_limit
from app.services.phone import normalize_phone
from app.security import create_access_token, legacy_password_matches, require_user
from app.services.supabase import SupabaseRepository

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login")
async def login(payload: LoginRequest, request: Request, settings: Settings = Depends(get_settings)) -> dict:
    await enforce_rate_limit(request, settings, "login", settings.rate_limit_login)
    if not settings.auth_ready or not settings.supabase_ready:
        raise HTTPException(status_code=503, detail="La autenticación del servidor no está configurada")
    user = await SupabaseRepository().find_user_by_email(payload.email.strip().lower())
    if not user or not legacy_password_matches(payload.password, str(user.get("password") or "")):
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


@router.post("/register", status_code=201)
async def register(payload: RegistrationRequest, request: Request, settings: Settings = Depends(get_settings)) -> dict:
    await enforce_rate_limit(request, settings, "register", 5)
    repo = SupabaseRepository()
    email = payload.email.strip().lower()
    if await repo.find_user_by_email(email):
        raise HTTPException(status_code=409, detail="El correo ya está registrado")
    phone = normalize_phone(payload.phone) if payload.phone else None
    row = await repo.create_user({
        "email": email,
        "password": sha256(payload.password.encode()).hexdigest(),
        "full_name": payload.full_name.strip() if payload.full_name else email.split("@", 1)[0],
        "phone": phone,
        "whatsapp": phone,
        "role": "farmer",
        "is_superuser": False,
        "is_active": True,
        "country_id": payload.country_id,
        "org_id": payload.org_id,
        "whatsapp_opt_in": payload.whatsapp_opt_in,
        "whatsapp_verified": False,
    })
    safe = {key: value for key, value in row.items() if key != "password"}
    return {"user": safe}


@router.get("/me")
async def me(user: AuthenticatedUser = Depends(require_user)) -> AuthenticatedUser:
    return user
