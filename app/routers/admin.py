from fastapi import APIRouter, Depends, HTTPException, Response

from app.models import AdminUserUpdate, AuthenticatedUser
from app.rate_limit import enforce_api_rate_limit
from app.security import require_user
from app.services.supabase import SupabaseRepository

router = APIRouter(prefix="/api/admin", tags=["Administration"], dependencies=[Depends(enforce_api_rate_limit)])


async def authorized_target(actor_id: str, target_id: str) -> tuple[SupabaseRepository, dict, dict]:
    repo = SupabaseRepository()
    actor = await repo.find_user_by_id(actor_id)
    target = await repo.find_user_by_id(target_id)
    if not actor or not target:
        raise HTTPException(status_code=404, detail="Usuario inexistente")
    role = actor.get("role")
    allowed = role == "global_owner"
    if role == "ministry_admin":
        allowed = actor.get("country_id") == target.get("country_id") and target.get("role") != "global_owner"
    elif role == "org_admin":
        allowed = actor.get("country_id") == target.get("country_id") and actor.get("org_id") == target.get("org_id") and target.get("role") == "farmer"
    if not allowed or actor_id == target_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para administrar este usuario")
    return repo, actor, target


@router.patch("/users/{target_id}")
async def update_user(target_id: str, payload: AdminUserUpdate, user: AuthenticatedUser = Depends(require_user)) -> dict:
    repo, actor, target = await authorized_target(user.id, target_id)
    data = payload.model_dump(exclude_unset=True, mode="json")
    if actor.get("role") != "global_owner":
        for forbidden in ("is_superuser", "role", "plan", "country_id"):
            if forbidden in data:
                raise HTTPException(status_code=403, detail=f"No puedes modificar {forbidden}")
    if "suspended_by" in data and data["suspended_by"] not in {None, user.id}:
        raise HTTPException(status_code=422, detail="suspended_by inválido")
    row = await repo.update_user(target_id, data)
    return {key: value for key, value in (row or {}).items() if key != "password"}


@router.delete("/users/{target_id}", status_code=204)
async def delete_user(target_id: str, user: AuthenticatedUser = Depends(require_user)) -> Response:
    repo, _, _ = await authorized_target(user.id, target_id)
    await repo.delete_user_cascade(target_id)
    return Response(status_code=204)

