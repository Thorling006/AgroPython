import hashlib
import hmac
import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.security import create_access_token
from app.services.datetime_parser import parse_spanish_datetime


SECRET = "test-session-secret-that-is-long-enough-123"
META_SECRET = "meta-test-secret"


def settings() -> Settings:
    return Settings(
        app_session_secret=SECRET,
        meta_app_secret=META_SECRET,
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="test-service-key",
    )


@pytest.fixture
def client():
    app.dependency_overrides[get_settings] = settings
    with TestClient(app) as value:
        yield value
    app.dependency_overrides.clear()


def token(user_id: str = "user-a") -> str:
    return create_access_token({"id": user_id, "email": "a@example.com"}, settings())


def signed(payload: dict) -> tuple[bytes, dict]:
    body = json.dumps(payload).encode()
    signature = "sha256=" + hmac.new(META_SECRET.encode(), body, hashlib.sha256).hexdigest()
    return body, {"X-Hub-Signature-256": signature, "Content-Type": "application/json"}


def test_webhook_rejects_missing_or_invalid_signature(client):
    assert client.post("/webhooks/whatsapp", json={}).status_code == 401
    assert client.post("/webhooks/whatsapp", json={}, headers={"X-Hub-Signature-256": "sha256=bad"}).status_code == 401


def test_status_webhook_is_ignored_after_valid_signature(client):
    payload = {"entry": [{"changes": [{"value": {"statuses": [{"status": "delivered"}]}}]}]}
    body, headers = signed(payload)
    response = client.post("/webhooks/whatsapp", content=body, headers=headers)
    assert response.status_code == 200
    assert response.json()["reason"] == "meta_status_event"


def test_panel_and_health_routes(client):
    assert client.get("/").status_code == 200
    assert client.get("/dashboard.html").status_code == 200
    assert client.get("/js/config.js").status_code == 200
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200


def test_ai_and_activities_require_authentication(client):
    assert client.post("/api/ai/chat", json={"message": "plagas en maíz"}).status_code == 401
    assert client.get("/api/activities").status_code == 401


def test_activity_route_uses_identity_from_token(client, monkeypatch):
    observed = {}

    async def fake_list(_self, user_id, completed=False):
        observed["user_id"] = user_id
        return []

    monkeypatch.setattr("app.routers.activities.SupabaseRepository.list_activities", fake_list)
    response = client.get("/api/activities?user_id=user-b", headers={"Authorization": f"Bearer {token('user-a')}"})
    assert response.status_code == 200
    assert observed["user_id"] == "user-a"


@pytest.mark.parametrize("value", ["32/13/2026 a las 8", "ayer a las 7", "hoy a las 99"])
def test_invalid_or_past_dates_are_rejected(value):
    now = datetime(2026, 8, 28, 15, 0, tzinfo=ZoneInfo("America/El_Salvador"))
    assert parse_spanish_datetime(value, now) is None


@pytest.mark.asyncio
async def test_reminder_failure_is_released_with_backoff(monkeypatch):
    from app.services import reminders

    activity = {"id": "a1", "user_id": "u1", "description": "Regar maíz", "whatsapp_attempt_count": 2}
    calls = {}

    class Repo:
        async def claim_due_activities(self): return [activity]
        async def find_user_by_id(self, _): return {"phone": "+50370000000"}
        async def release_reminder_claim(self, row, error, retry_at): calls.update(error=error, retry_at=retry_at)
        async def complete_reminder_claim(self, *args): raise AssertionError("No debe marcarse enviado")

    class WhatsApp:
        async def send_text(self, *_): raise RuntimeError("Meta temporal")

    cfg = settings()
    cfg.meta_phone_number_id = "123"
    cfg.meta_access_token = "token"
    cfg.meta_verify_token = "verify"
    monkeypatch.setattr(reminders, "get_settings", lambda: cfg)
    monkeypatch.setattr(reminders, "SupabaseRepository", Repo)
    monkeypatch.setattr(reminders, "WhatsAppClient", WhatsApp)
    await reminders.dispatch_due_reminders()
    assert "Meta temporal" in calls["error"]
    assert calls["retry_at"] > datetime.now(cfg.timezone)


@pytest.mark.asyncio
async def test_reminder_success_marks_sent_and_creates_session(monkeypatch):
    from app.services import reminders

    activity = {"id": "a1", "user_id": "u1", "description": "Regar maíz", "whatsapp_attempt_count": 1}
    calls = {"completed": 0, "sessions": 0}

    class Repo:
        async def claim_due_activities(self): return [activity]
        async def find_user_by_id(self, _): return {"phone": "+50370000000"}
        async def complete_reminder_claim(self, *args): calls.__setitem__("completed", calls["completed"] + 1)
        async def release_reminder_claim(self, *args): raise AssertionError("No debe liberar")
        async def upsert_session(self, data): calls.__setitem__("sessions", calls["sessions"] + 1)

    class WhatsApp:
        async def send_text(self, *_): return "wamid-ok"

    cfg = settings()
    cfg.meta_phone_number_id = "123"
    cfg.meta_access_token = "token"
    cfg.meta_verify_token = "verify"
    monkeypatch.setattr(reminders, "get_settings", lambda: cfg)
    monkeypatch.setattr(reminders, "SupabaseRepository", Repo)
    monkeypatch.setattr(reminders, "WhatsAppClient", WhatsApp)
    await reminders.dispatch_due_reminders()
    assert calls == {"completed": 1, "sessions": 1}

