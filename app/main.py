from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
import json

from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import activities, ai, webhook
from app.services.reminders import dispatch_due_reminders

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = AsyncIOScheduler(timezone=get_settings().app_timezone)
    scheduler.add_job(dispatch_due_reminders, "interval", seconds=get_settings().reminder_poll_seconds, max_instances=1, coalesce=True)
    scheduler.start()
    app.state.scheduler = scheduler
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="AgroSmart Python", version="1.0.0", lifespan=lifespan)
app.include_router(webhook.router)
app.include_router(activities.router)
app.include_router(ai.router)
@app.get("/health")
async def health() -> dict:
    cfg = get_settings()
    return {"status": "ok", "environment": cfg.app_env, "integrations_configured": cfg.production_ready}


@app.get("/js/config.js", include_in_schema=False)
async def browser_config() -> Response:
    """Return only browser-safe configuration; private keys stay server-side."""
    cfg = get_settings()
    public = {
        "SUPABASE_URL": cfg.supabase_url,
        "SUPABASE_ANON_KEY": cfg.supabase_anon_key,
        "WEATHER_API_KEY": cfg.weather_api_key,
        "OPENWEATHERMAP_API_KEY": cfg.openweathermap_api_key,
        "N8N_WEBHOOK_URL": "",
        "WHATSAPP_ENABLED": True,
    }
    body = f"window.CONFIG = {json.dumps(public)}; const CONFIG = window.CONFIG;"
    return Response(body, media_type="application/javascript")


# Keep this mount last so API and webhook routes take precedence.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")

