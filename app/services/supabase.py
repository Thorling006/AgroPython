from datetime import datetime
from typing import Any

import httpx

from app.config import get_settings


class SupabaseRepository:
    def __init__(self) -> None:
        settings = get_settings()
        self.base = settings.supabase_url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, table: str, *, params=None, json=None, prefer: str | None = None) -> list[dict[str, Any]]:
        headers = dict(self.headers)
        if prefer:
            headers["Prefer"] = prefer
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.request(method, f"{self.base}/{table}", params=params, json=json, headers=headers)
            response.raise_for_status()
            return response.json() if response.content else []

    async def find_user_by_phone(self, phone: str) -> dict | None:
        rows = await self._request("GET", "users", params={"phone": f"eq.{phone}", "select": "*", "limit": "1"})
        return rows[0] if rows else None

    async def inbound_seen(self, message_id: str) -> bool:
        rows = await self._request("GET", "whatsapp_inbound_events", params={"message_id": f"eq.{message_id}", "select": "message_id", "limit": "1"})
        return bool(rows)

    async def register_inbound(self, message_id: str, phone: str) -> None:
        await self._request("POST", "whatsapp_inbound_events", json={"message_id": message_id, "phone": phone}, prefer="return=minimal")

    async def get_active_session(self, phone: str, now: datetime) -> dict | None:
        rows = await self._request("GET", "conversation_state", params={"phone": f"eq.{phone}", "expires_at": f"gt.{now.isoformat()}", "select": "*", "order": "updated_at.desc", "limit": "1"})
        return rows[0] if rows else None

    async def upsert_session(self, data: dict) -> None:
        await self._request("POST", "conversation_state", params={"on_conflict": "phone"}, json=data, prefer="resolution=merge-duplicates,return=minimal")

    async def close_session(self, phone: str) -> None:
        await self._request("PATCH", "conversation_state", params={"phone": f"eq.{phone}"}, json={"expires_at": datetime.min.isoformat(), "current_step": "closed"}, prefer="return=minimal")

    async def list_activities(self, user_id: str, completed: bool = False) -> list[dict]:
        status = "in.(completed,realizado,realizada)" if completed else "in.(pending,pendiente,rescheduled,reprogramada)"
        return await self._request("GET", "crop_activities", params={"user_id": f"eq.{user_id}", "status": status, "select": "*", "order": "scheduled_date.asc"})

    async def find_pending_activities(self, user_id: str) -> list[dict]:
        return await self._request("GET", "crop_activities", params={"user_id": f"eq.{user_id}", "status": "in.(pending,pendiente,rescheduled,reprogramada)", "select": "*", "order": "scheduled_date.asc"})

    async def create_activity(self, data: dict) -> dict:
        rows = await self._request("POST", "crop_activities", json=data, prefer="return=representation")
        return rows[0]

    async def update_activity(self, activity_id: str, user_id: str, data: dict) -> dict | None:
        rows = await self._request("PATCH", "crop_activities", params={"id": f"eq.{activity_id}", "user_id": f"eq.{user_id}"}, json=data, prefer="return=representation")
        return rows[0] if rows else None

    async def due_activities(self, now: datetime) -> list[dict]:
        return await self._request("GET", "crop_activities", params={"scheduled_date": f"lte.{now.isoformat()}", "status": "in.(pending,pendiente,rescheduled,reprogramada)", "whatsapp_reminder_sent": "eq.false", "select": "*,users(phone,name)", "order": "scheduled_date.asc", "limit": "100"})

