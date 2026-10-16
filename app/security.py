from datetime import datetime, timedelta, timezone
from hashlib import sha256

import jwt
from fastapi import Depends, Header, HTTPException, status

from app.config import Settings, get_settings
from app.models import AuthenticatedUser


def legacy_password_matches(password: str, stored_hash: str) -> bool:
    """Compatibility verifier for the existing browser-generated SHA-256 hashes.

    This is intentionally isolated so it can be replaced by Argon2 after a controlled
    migration of existing users.
    """
    return sha256(password.encode("utf-8")).hexdigest() == (stored_hash or "")


def create_access_token(user: dict, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id"]),
        "email": user.get("email"),
        "role": user.get("role") or "farmer",
        "is_superuser": bool(user.get("is_superuser")),
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "iss": "agropython",
        "aud": "agropython-web",
    }
    return jwt.encode(payload, settings.app_session_secret, algorithm="HS256")


async def require_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    if not settings.auth_ready:
        raise HTTPException(status_code=503, detail="La autenticación del servidor no está configurada")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Se requiere autenticación")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.app_session_secret, algorithms=["HS256"], audience="agropython-web", issuer="agropython")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida o expirada") from exc
    return AuthenticatedUser(id=str(payload["sub"]), email=payload.get("email"), role=payload.get("role") or "farmer", is_superuser=bool(payload.get("is_superuser")))
