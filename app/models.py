from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Intent = Literal["menu", "agriculture", "list_activities", "create_activity", "list_completed", "complete_activity"]


class IncomingMessage(BaseModel):
    phone: str
    name: str = Field(default="Agricultor", max_length=160)
    message: str = Field(min_length=1, max_length=4096)
    message_id: str = Field(min_length=8, max_length=255)


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


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=6, max_length=256)


class RegistrationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=256)
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=32)
    country_id: str | None = None
    org_id: str | None = None
    whatsapp_opt_in: bool = False


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    avatar_url: str | None = Field(default=None, max_length=2048)
    bio: str | None = Field(default=None, max_length=1000)
    phone: str | None = Field(default=None, max_length=32)
    phone_country_code: str | None = Field(default=None, max_length=8)
    whatsapp: str | None = Field(default=None, max_length=32)
    whatsapp_opt_in: bool | None = None


class PasswordUpdate(BaseModel):
    new_password: str = Field(min_length=8, max_length=256)


class ActivityCreate(BaseModel):
    crop_id: str | None = None
    activity_type: str = Field(min_length=2, max_length=80)
    crop_name: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    scheduled_at: datetime


class MessageCreate(BaseModel):
    receiver_id: str | None = None
    group_id: str | None = None
    text: str = Field(min_length=1, max_length=4000)


class AdminUserUpdate(BaseModel):
    suspension_end: datetime | None = None
    suspension_reason: str | None = Field(default=None, max_length=1000)
    suspended_by: str | None = None
    is_superuser: bool | None = None
    role: Literal["farmer", "org_admin", "ministry_admin", "global_owner"] | None = None
    plan: str | None = Field(default=None, max_length=40)
    country_id: str | None = None
    org_id: str | None = None


class AuthenticatedUser(BaseModel):
    id: str
    email: str | None = None
    role: str = "farmer"
    is_superuser: bool = False

