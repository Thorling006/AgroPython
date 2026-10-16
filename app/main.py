from contextlib import asynccontextmanager
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import Depends, FastAPI, Request
import json

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import activities, ai, auth, webhook
from app.services.reminders import dispatch_due_reminders

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    cfg = get_settings()
    scheduler = None
    if cfg.enable_reminder_scheduler and cfg.supabase_ready and cfg.whatsapp_ready:
        scheduler = AsyncIOScheduler(timezone=cfg.app_timezone)
        scheduler.add_job(dispatch_due_reminders, "interval", seconds=cfg.reminder_poll_seconds, max_instances=1, coalesce=True)
        scheduler.start()
    app.state.scheduler = scheduler
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(title="AgroSmart Python", version="1.0.0", lifespan=lifespan)
if get_settings().allowed_origin_list:
    app.add_middleware(CORSMiddleware, allow_origins=get_settings().allowed_origin_list, allow_credentials=True, allow_methods=["GET", "POST", "PATCH"], allow_headers=["Authorization", "Content-Type", "X-Hub-Signature-256"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    return response


app.include_router(webhook.router)
app.include_router(activities.router)
app.include_router(ai.router)
app.include_router(auth.router)
@app.get("/health")
async def health(cfg = Depends(get_settings)) -> dict:
    return {"status": "ok", "environment": cfg.app_env, "integrations_configured": cfg.production_ready}


@app.get("/health/live", include_in_schema=False)
async def liveness() -> dict:
    return {"status": "ok"}


@app.get("/health/ready", include_in_schema=False)
async def readiness(cfg = Depends(get_settings)) -> Response:
    ready = cfg.supabase_ready and cfg.auth_ready
    return Response(content=json.dumps({"status": "ready" if ready else "not_ready"}), media_type="application/json", status_code=200 if ready else 503)


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

