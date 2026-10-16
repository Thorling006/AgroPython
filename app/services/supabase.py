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

    async def _request(self, method: str, table: str, *, params=None, json=None, prefer: str | None = None) -> Any:
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

    async def find_user_by_email(self, email: str) -> dict | None:
        rows = await self._request("GET", "users", params={"email": f"eq.{email}", "select": "*", "limit": "1"})
        return rows[0] if rows else None

    async def find_user_by_id(self, user_id: str) -> dict | None:
        rows = await self._request("GET", "users", params={"id": f"eq.{user_id}", "select": "*", "limit": "1"})
        return rows[0] if rows else None

    async def claim_inbound(self, message_id: str, phone: str) -> bool:
        result = await self._request("POST", "rpc/claim_whatsapp_inbound", json={"p_message_id": message_id, "p_phone": phone})
        if not result:
            return False
        value = result[0] if isinstance(result, list) else result
        return bool(value.get("claim_whatsapp_inbound") if isinstance(value, dict) else value)

    async def mark_inbound_completed(self, message_id: str) -> None:
        await self._request("PATCH", "whatsapp_inbound_events", params={"message_id": f"eq.{message_id}"}, json={"status": "completed", "processed_at": datetime.utcnow().isoformat(), "last_error": None}, prefer="return=minimal")

    async def mark_inbound_failed(self, message_id: str, error: str) -> None:
        await self._request("PATCH", "whatsapp_inbound_events", params={"message_id": f"eq.{message_id}"}, json={"status": "failed", "last_error": error[:1000]}, prefer="return=minimal")

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

    async def claim_due_activities(self, batch_size: int = 50) -> list[dict]:
        return await self._request("POST", "rpc/claim_due_crop_activities", json={"p_batch_size": batch_size})

    async def complete_reminder_claim(self, activity: dict, message_id: str, sent_at: datetime) -> None:
        await self.update_activity(str(activity["id"]), str(activity["user_id"]), {"whatsapp_reminder_sent": True, "whatsapp_sent_at": sent_at.isoformat(), "whatsapp_message_id": message_id, "whatsapp_claim_token": None, "whatsapp_claimed_at": None, "whatsapp_last_error": None})

    async def release_reminder_claim(self, activity: dict, error: str, retry_at: datetime) -> None:
        await self.update_activity(str(activity["id"]), str(activity["user_id"]), {"whatsapp_claim_token": None, "whatsapp_claimed_at": None, "whatsapp_last_error": error[:1000], "whatsapp_next_attempt_at": retry_at.isoformat()})

