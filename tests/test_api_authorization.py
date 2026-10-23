from hashlib import sha256

import pytest
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app
from app.rate_limit import _memory
from app.security import create_access_token

SECRET = "test-session-secret-that-is-long-enough-123"


def settings() -> Settings:
    return Settings(app_env="development", app_session_secret=SECRET, supabase_url="https://example.supabase.co", supabase_service_role_key="test-service-key")


@pytest.fixture
def client():
    _memory.clear()
    app.dependency_overrides[get_settings] = settings
    with TestClient(app) as value:
        yield value
    app.dependency_overrides.clear()


def auth(user_id="user-a"):
    jwt = create_access_token({"id": user_id, "email": f"{user_id}@example.com"}, settings())
    return {"Authorization": f"Bearer {jwt}"}


def test_login_never_returns_password(client, monkeypatch):
    row = {"id": "user-a", "email": "a@example.com", "password": sha256(b"password123").hexdigest(), "role": "farmer"}

    async def find(*_): return row
    monkeypatch.setattr("app.routers.auth.SupabaseRepository.find_user_by_email", find)
    response = client.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert response.status_code == 200
    assert "password" not in response.json()["user"]


def test_registration_forces_farmer_role_and_server_hash(client, monkeypatch):
    captured = {}

    async def find(*_): return None
    async def create(_self, data):
        captured.update(data)
        return {"id": "new", **data}

    monkeypatch.setattr("app.routers.auth.SupabaseRepository.find_user_by_email", find)
    monkeypatch.setattr("app.routers.auth.SupabaseRepository.create_user", create)
    response = client.post("/api/auth/register", json={"email": "new@example.com", "password": "password123", "full_name": "Nueva Persona"})
    assert response.status_code == 201
    assert captured["role"] == "farmer" and captured["is_superuser"] is False
    assert captured["password"] != "password123"
    assert "password" not in response.json()["user"]


def test_registration_without_name_preserves_whatsapp_opt_in(client, monkeypatch):
    captured = {}

    async def find(*_): return None
    async def create(_self, data):
        captured.update(data)
        return {"id": "new", **data}

    monkeypatch.setattr("app.routers.auth.SupabaseRepository.find_user_by_email", find)
    monkeypatch.setattr("app.routers.auth.SupabaseRepository.create_user", create)
    response = client.post("/api/auth/register", json={
        "email": "venturaomar569@gmail.com",
        "password": "12345678",
        "phone": "70589385",
        "country_id": "sv-test",
        "whatsapp_opt_in": True
    })
    assert response.status_code == 201
    assert captured["full_name"] == "venturaomar569"
    assert captured["phone"] == "+50370589385"
    assert captured["whatsapp_opt_in"] is True


def test_profile_update_cannot_choose_another_user(client, monkeypatch):
    observed = {}

    async def update(_self, user_id, data):
        observed.update(user_id=user_id, data=data)
        return {"id": user_id, **data}

    monkeypatch.setattr("app.routers.users.SupabaseRepository.update_user", update)
    response = client.patch("/api/users/me", headers=auth("user-a"), json={"full_name": "Nombre Seguro"})
    assert response.status_code == 200
    assert observed["user_id"] == "user-a"


def test_direct_messages_are_always_scoped_to_token_user(client, monkeypatch):
    observed = {}

    async def direct(_self, user_id, peer_id):
        observed.update(user_id=user_id, peer_id=peer_id)
        return []

    monkeypatch.setattr("app.routers.messages.SupabaseRepository.direct_messages", direct)
    response = client.get("/api/messages/direct/user-b", headers=auth("user-a"))
    assert response.status_code == 200
    assert observed == {"user_id": "user-a", "peer_id": "user-b"}


def test_non_member_cannot_read_group_messages(client, monkeypatch):
    async def not_member(*_): return False
    monkeypatch.setattr("app.routers.messages.SupabaseRepository.user_in_group", not_member)
    response = client.get("/api/messages/group/private-group", headers=auth())
    assert response.status_code == 403


def test_activity_create_ignores_client_user_identity(client, monkeypatch):
    captured = {}

    async def create(_self, data):
        captured.update(data)
        return {"id": "activity-1", **data}

    monkeypatch.setattr("app.routers.activities.SupabaseRepository.create_activity", create)
    response = client.post("/api/activities", headers=auth("user-a"), json={
        "user_id": "user-b",
        "activity_type": "riego",
        "crop_name": "maíz",
        "scheduled_at": "2030-01-01T08:00:00-06:00"
    })
    assert response.status_code == 201
    assert captured["user_id"] == "user-a"


def test_distributed_rate_limit_is_required_in_staging(client):
    def staging_settings():
        cfg = settings()
        cfg.app_env = "staging"
        cfg.redis_url = ""
        return cfg

    app.dependency_overrides[get_settings] = staging_settings
    response = client.get("/api/activities", headers=auth())
    assert response.status_code == 503
    assert "REDIS_URL" in response.json()["detail"]


def test_farmer_cannot_use_admin_user_endpoint(client, monkeypatch):
    async def find(_self, user_id):
        return {"id": user_id, "role": "farmer", "country_id": "sv", "org_id": "one"}

    monkeypatch.setattr("app.routers.admin.SupabaseRepository.find_user_by_id", find)
    response = client.patch("/api/admin/users/user-b", headers=auth("user-a"), json={"role": "global_owner"})
    assert response.status_code == 403


def test_org_admin_cannot_administer_user_from_other_org(client, monkeypatch):
    async def find(_self, user_id):
        if user_id == "admin-a":
            return {"id": user_id, "role": "org_admin", "country_id": "sv", "org_id": "one"}
        return {"id": user_id, "role": "farmer", "country_id": "sv", "org_id": "two"}

    monkeypatch.setattr("app.routers.admin.SupabaseRepository.find_user_by_id", find)
    response = client.delete("/api/admin/users/user-b", headers=auth("admin-a"))
    assert response.status_code == 403

