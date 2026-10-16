from copy import deepcopy
from datetime import datetime, timedelta

import pytest

from app.models import IncomingMessage
from app.services.conversation import ConversationService


class Repo:
    def __init__(self, user=True):
        self.user = {"id": "user-a", "phone": "+50370000000"} if user else None
        self.claimed = set()
        self.session = None

    async def claim_inbound(self, message_id, phone):
        if message_id in self.claimed:
            return False
        self.claimed.add(message_id)
        return True

    async def find_user_by_phone(self, phone): return self.user

    async def get_active_session(self, phone, now):
        if not self.session:
            return None
        expires = datetime.fromisoformat(self.session["expires_at"])
        return deepcopy(self.session) if expires > now else None

    async def upsert_session(self, data): self.session = deepcopy(data)
    async def close_session(self, phone): self.session = None
    async def list_activities(self, user_id, completed=False): return []
    async def find_pending_activities(self, user_id): return []


class Gemini:
    async def answer(self, question, context=""): return "Respuesta agrícola"


def message(text, ident="wamid-12345678"):
    return IncomingMessage(phone="+50370000000", name="Omar", message=text, message_id=ident)


@pytest.mark.asyncio
async def test_duplicate_whatsapp_message_is_processed_once():
    service = ConversationService(Repo(), Gemini())
    assert "¿Qué deseas hacer?" in await service.handle(message("Hola"))
    assert await service.handle(message("Hola")) is None


@pytest.mark.asyncio
async def test_unlinked_phone_cannot_access_private_data():
    service = ConversationService(Repo(user=False), Gemini())
    answer = await service.handle(message("3"))
    assert "no está asociado" in answer


@pytest.mark.asyncio
async def test_expired_session_returns_message_to_main_classifier():
    repo = Repo()
    service = ConversationService(repo, Gemini())
    now = datetime.now(service.cfg.timezone)
    repo.session = {
        "phone": "+50370000000",
        "user_id": "user-a",
        "current_intent": "create_activity",
        "current_step": "waiting_confirmation",
        "context_data": {"draft": {}},
        "updated_at": (now - timedelta(minutes=6)).isoformat(),
        "expires_at": (now - timedelta(minutes=1)).isoformat(),
    }
    answer = await service.handle(message("Hola", "wamid-87654321"))
    assert "¿Qué deseas hacer?" in answer


@pytest.mark.asyncio
async def test_gemini_error_is_not_silently_converted_to_success():
    class BrokenGemini:
        async def answer(self, *_): raise RuntimeError("Gemini unavailable")

    service = ConversationService(Repo(), BrokenGemini())
    with pytest.raises(RuntimeError, match="Gemini unavailable"):
        await service.handle(message("Tengo plagas en el maíz"))


@pytest.mark.asyncio
async def test_supabase_error_is_not_silently_ignored():
    repo = Repo()

    async def broken_claim(*_): raise RuntimeError("Supabase unavailable")

    repo.claim_inbound = broken_claim
    with pytest.raises(RuntimeError, match="Supabase unavailable"):
        await ConversationService(repo, Gemini()).handle(message("Hola"))

