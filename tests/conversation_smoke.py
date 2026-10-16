"""In-memory end-to-end checks for the conversational state machine."""

import asyncio
from copy import deepcopy
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models import IncomingMessage
from app.services.conversation import ConversationService


class FakeRepo:
    def __init__(self):
        self.events = set()
        self.session = None
        self.activities = []
        self.user = {"id": "user-1", "phone": "+50373603690"}

    async def inbound_seen(self, message_id):
        return message_id in self.events

    async def register_inbound(self, message_id, phone):
        self.events.add(message_id)

    async def find_user_by_phone(self, phone):
        return self.user if phone == self.user["phone"] else None

    async def get_active_session(self, phone, now):
        if not self.session or self.session.get("current_step") == "closed":
            return None
        return deepcopy(self.session)

    async def upsert_session(self, data):
        self.session = deepcopy(data)

    async def close_session(self, phone):
        if self.session:
            self.session["current_step"] = "closed"

    async def list_activities(self, user_id, completed=False):
        statuses = {"completed"} if completed else {"pending", "rescheduled"}
        return [item for item in self.activities if item["status"] in statuses]

    async def create_activity(self, data):
        row = {"id": str(len(self.activities) + 1), **data}
        self.activities.append(row)
        return row

    async def find_pending_activities(self, user_id):
        return [item for item in self.activities if item["status"] == "pending"]

    async def update_activity(self, activity_id, user_id, data):
        row = next((item for item in self.activities if item["id"] == activity_id and item["user_id"] == user_id), None)
        if row:
            row.update(data)
        return row


class FakeGemini:
    async def answer(self, question, context=""):
        return "Respuesta agrícola de prueba"


async def run():
    repo = FakeRepo()
    service = ConversationService(repo, FakeGemini())

    def msg(text, number):
        return IncomingMessage(phone="+50373603690", name="Omar", message=text, message_id=f"wamid-{number}")

    assert "¿Qué deseas hacer?" in await service.handle(msg("Hola", 1))
    assert "Voy a programar" in await service.handle(msg("Regar maíz mañana a las 8 am", 2))
    assert await service.handle(msg("Regar maíz mañana a las 8 am", 2)) is None
    assert await service.handle(msg("1", 3)) == "✅ Actividad programada correctamente."
    assert len(repo.activities) == 1
    assert "Tus actividades pendientes" in await service.handle(msg("3", 4))
    completion = await service.handle(msg("Ya completé el riego de maíz", 5))
    assert "marcarla como realizada" in completion
    assert await service.handle(msg("1", 6)) == "✅ Actividad marcada como realizada."
    assert repo.activities[0]["status"] == "completed"
    assert "Actividades realizadas" in await service.handle(msg("4", 7))
    print("AgroPython conversation smoke tests: OK")


asyncio.run(run())
