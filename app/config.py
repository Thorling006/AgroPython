from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_base_url: str = "http://localhost:8000"
    app_timezone: str = "America/El_Salvador"
    app_session_secret: str = ""
    access_token_minutes: int = 480
    allowed_origins: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    meta_graph_version: str = "v23.0"
    meta_phone_number_id: str = ""
    meta_access_token: str = ""
    meta_verify_token: str = ""
    meta_app_secret: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    weather_api_key: str = ""
    openweathermap_api_key: str = ""
    reminder_poll_seconds: int = 60
    session_ttl_seconds: int = 300
    enable_reminder_scheduler: bool = False
    redis_url: str = ""
    rate_limit_login: int = 10
    rate_limit_ai: int = 30
    rate_limit_api: int = 120

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def timezone(self) -> ZoneInfo:
        return ZoneInfo(self.app_timezone)

    @property
    def allowed_origin_list(self) -> list[str]:
        return [item.strip().rstrip("/") for item in self.allowed_origins.split(",") if item.strip()]

    @property
    def supabase_ready(self) -> bool:
        return bool(self.supabase_url and self.supabase_service_role_key)

    @property
    def whatsapp_ready(self) -> bool:
        return bool(self.meta_phone_number_id and self.meta_access_token and self.meta_verify_token and self.meta_app_secret)

    @property
    def auth_ready(self) -> bool:
        return len(self.app_session_secret) >= 32

    @property
    def rate_limit_ready(self) -> bool:
        return bool(self.redis_url) or self.app_env == "development"

    @property
    def production_ready(self) -> bool:
        return all(
            [
                self.supabase_url,
                self.supabase_service_role_key,
                self.meta_phone_number_id,
                self.meta_access_token,
                self.meta_verify_token,
                self.meta_app_secret,
                self.gemini_api_key,
                self.app_session_secret if len(self.app_session_secret) >= 32 else "",
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

