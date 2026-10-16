from hashlib import sha256

from fastapi import APIRouter, Depends, HTTPException

from app.models import AuthenticatedUser, PasswordUpdate, ProfileUpdate
from app.security import require_user
from app.services.phone import normalize_phone
from app.services.supabase import SupabaseRepository
from app.rate_limit import enforce_api_rate_limit

router = APIRouter(prefix="/api/users", tags=["Users"], dependencies=[Depends(enforce_api_rate_limit)])
SAFE_FIELDS = "id,email,full_name,avatar_url,bio,phone,phone_country_code,whatsapp,whatsapp_opt_in,whatsapp_verified,role,is_superuser,country_id,org_id,plan,date_joined"


def safe(row: dict) -> dict:
    return {key: value for key, value in row.items() if key != "password"}


@router.get("/me")
async def me(user: AuthenticatedUser = Depends(require_user)) -> dict:
    row = await SupabaseRepository().find_user_by_id(user.id)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    return safe(row)


@router.patch("/me")
async def update_me(payload: ProfileUpdate, user: AuthenticatedUser = Depends(require_user)) -> dict:
    data = payload.model_dump(exclude_none=True)
    if "phone" in data:
        data["phone"] = normalize_phone(data["phone"])
    if "whatsapp" in data:
        data["whatsapp"] = normalize_phone(data["whatsapp"])
    row = await SupabaseRepository().update_user(user.id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    return safe(row)


@router.patch("/me/password", status_code=204)
async def update_password(payload: PasswordUpdate, user: AuthenticatedUser = Depends(require_user)) -> None:
    repo = SupabaseRepository()
    row = await repo.find_user_by_id(user.id)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    await repo.update_user(user.id, {"password": sha256(payload.new_password.encode()).hexdigest()})


@router.get("")
async def directory(user: AuthenticatedUser = Depends(require_user)) -> list[dict]:
    repo = SupabaseRepository()
    current = await repo.find_user_by_id(user.id)
    if not current:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    return [safe(row) for row in await repo.directory_users(current)]

