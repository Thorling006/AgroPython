from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Intent = Literal["menu", "agriculture", "list_activities", "create_activity", "list_completed", "complete_activity"]


class IncomingMessage(BaseModel):
    phone: str
    name: str = "Agricultor"
    message: str
    message_id: str


class ConversationState(BaseModel):
    phone: str
    user_id: str | None = None
    current_intent: str
    current_step: str
    context_data: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime
    expires_at: datetime


class ActivityDraft(BaseModel):
    activity_type: str | None = None
    crop_name: str | None = None
    description: str | None = None
    scheduled_at: datetime | None = None


class ActivityAction(BaseModel):
    activity_id: str
    action: Literal["complete", "reschedule", "keep_pending"]
    scheduled_at: datetime | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[dict[str, str]] = Field(default_factory=list, max_length=20)
    mode: Literal["agriculture", "jarvis"] = "agriculture"
    page_context: str = Field(default="", max_length=3000)

