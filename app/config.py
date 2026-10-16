from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_base_url: str = "http://localhost:8000"
    app_timezone: str = "America/El_Salvador"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    meta_graph_version: str = "v23.0"
    meta_phone_number_id: str = ""
    meta_access_token: str = ""
    meta_verify_token: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    weather_api_key: str = ""
    openweathermap_api_key: str = ""
    reminder_poll_seconds: int = 60
    session_ttl_seconds: int = 300

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def timezone(self) -> ZoneInfo:
        return ZoneInfo(self.app_timezone)

    @property
    def production_ready(self) -> bool:
        return all(
            [
                self.supabase_url,
                self.supabase_service_role_key,
                self.meta_phone_number_id,
                self.meta_access_token,
                self.meta_verify_token,
                self.gemini_api_key,
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()

